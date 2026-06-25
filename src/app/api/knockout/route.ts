import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { GRUPOS } from '@/lib/grupos'
import { isAdminRequest } from '@/lib/auth'
import type { Jogo, Resultado } from '@/types'

// GET /api/knockout — retorna todos os times disponíveis + classificação dos grupos
export async function GET() {
  const [jogosRes, resultadosRes] = await Promise.all([
    supabase.from('jogos').select('*').order('jogo_numero'),
    supabase.from('resultados').select('*'),
  ])

  const jogos = (jogosRes.data ?? []) as Jogo[]
  const resultados = (resultadosRes.data ?? []) as Resultado[]
  const resultadoMap = new Map(resultados.map((r) => [r.jogo_numero, r]))

  // Coletar todos os times únicos
  const allTimes = new Set<string>()
  for (const times of Object.values(GRUPOS)) {
    for (const time of times) {
      allTimes.add(time)
    }
  }

  // Calcular classificação dos grupos para auto-fill
  const grupoStandings: Record<string, { time: string; pontos: number; sg: number; gp: number }[]> = {}
  for (const [grupo, times] of Object.entries(GRUPOS)) {
    const stats = new Map<string, { time: string; pontos: number; jogos: number; gp: number; gc: number }>()
    for (const time of times) {
      stats.set(time, { time, pontos: 0, jogos: 0, gp: 0, gc: 0 })
    }

    for (const jogo of jogos) {
      if (jogo.fase !== 'Grupos' || jogo.grupo !== grupo) continue
      const res = resultadoMap.get(jogo.jogo_numero)
      if (!res) continue

      const a = stats.get(jogo.pais_a)
      const b = stats.get(jogo.pais_b)
      if (!a || !b) continue
      a.jogos++; b.jogos++
      a.gp += res.gol_a; a.gc += res.gol_b
      b.gp += res.gol_b; b.gc += res.gol_a
      if (res.gol_a > res.gol_b) a.pontos += 3
      else if (res.gol_a < res.gol_b) b.pontos += 3
      else { a.pontos += 1; b.pontos += 1 }
    }

    grupoStandings[grupo] = Array.from(stats.values())
      .sort((a, b) => {
        const sgA = a.gp - a.gc, sgB = b.gp - b.gc
        if (b.pontos !== a.pontos) return b.pontos - a.pontos
        if (sgB !== sgA) return sgB - sgA
        return b.gp - a.gp
      })
      .map((s) => ({ time: s.time, pontos: s.pontos, sg: s.gp - s.gc, gp: s.gp }))
  }

  // Sugestão automática: 12 primeiros + 12 segundos + 8 melhores terceiros
  const primeiro: { time: string; grupo: string }[] = []
  const segundo: { time: string; grupo: string }[] = []
  const terceiro: { time: string; grupo: string; pontos: number; sg: number; gp: number }[] = []

  for (const [grupo, standing] of Object.entries(grupoStandings)) {
    if (standing.length >= 1) primeiro.push({ time: standing[0].time, grupo })
    if (standing.length >= 2) segundo.push({ time: standing[1].time, grupo })
    if (standing.length >= 3) terceiro.push({ time: standing[2].time, grupo, pontos: standing[2].pontos, sg: standing[2].sg, gp: standing[2].gp })
  }

  terceiro.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.sg !== a.sg) return b.sg - a.sg
    return b.gp - a.gp
  })

  return NextResponse.json({
    times: Array.from(allTimes).sort(),
    grupoStandings,
    sugestao: {
      primeiros: primeiro,
      segundos: segundo,
      melhoresTerceiros: terceiro.slice(0, 8),
    },
  })
}

// POST /api/knockout — salva confrontos da Rodada_32
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-password')
  const bearer = request.headers.get('authorization')
  const cookieToken = request.cookies.get('token')?.value ?? null
  if (!isAdminRequest(authHeader, bearer, cookieToken)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { confrontos } = body

  if (!Array.isArray(confrontos)) {
    return NextResponse.json({ error: 'confrontos é obrigatório' }, { status: 400 })
  }

  const errors: string[] = []
  for (const c of confrontos) {
    const { jogo_numero, pais_a, pais_b, data_hora, estadio } = c
    if (!jogo_numero) { errors.push(`jogo_numero inválido: ${JSON.stringify(c)}`); continue }
    const jogoNum = Number(jogo_numero)

    // Upsert: insere se não existir, atualiza se já existir
    const { error } = await supabaseAdmin
      .from('jogos')
      .upsert(
        {
          jogo_numero: jogoNum,
          fase: 'Rodada_32',
          pais_a: (pais_a ?? '') || '',
          pais_b: (pais_b ?? '') || '',
          data_hora: data_hora || null,
          estadio: estadio || null,
        },
        { onConflict: 'jogo_numero' }
      )
    if (error) errors.push(`Jogo #${jogoNum}: ${error.message}`)
  }

  return NextResponse.json({
    message: `${confrontos.length - errors.length} confrontos salvos${errors.length ? `, ${errors.length} erros` : ''}`,
    errors: errors.length > 0 ? errors : undefined,
  })
}
