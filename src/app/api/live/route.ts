import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { Jogo } from '@/types'
import { isAdminRequest } from '@/lib/auth'
import { advanceWinner } from '@/lib/knockout-resolve'

// GET /api/live — retorna jogos ao vivo com placar atual
export async function GET() {

  const agora = new Date()

  // Busca jogos já iniciados (data_hora <= agora)
  const { data: jogos, error: jogosError } = await supabase
    .from('jogos')
    .select('*')
    .lte('data_hora', agora.toISOString())
    .order('data_hora', { ascending: false })

  if (jogosError) {
    return NextResponse.json({ error: jogosError.message }, { status: 500 })
  }

  // Tenta ler da tabela ao_vivo
  let aoVivoMap = new Map<number, { gol_a: number; gol_b: number; penalti_a: number | null; penalti_b: number | null; minuto: number }>()
  try {
    const { data: liveData } = await supabase.from('jogos_ao_vivo').select('*')
    if (liveData) {
      for (const l of liveData) {
        aoVivoMap.set(l.jogo_numero, { gol_a: l.gol_a, gol_b: l.gol_b, penalti_a: l.penalti_a ?? null, penalti_b: l.penalti_b ?? null, minuto: l.minuto })
      }
    }
  } catch {
    // tabela pode não existir ainda
  }

  // Busca resultados existentes para não recriar jogos já finalizados
  const { data: resultados } = await supabase.from('resultados').select('jogo_numero')
  const resultadosSet = new Set((resultados ?? []).map((r: any) => r.jogo_numero))

  // Janela de 3h para considerar um jogo como "ao vivo"
  const limite = new Date(agora.getTime() - 180 * 60 * 1000)

  const liveGames: Jogo[] = []
  for (const j of (jogos as Jogo[] ?? [])) {
    if (!j.data_hora) continue
    if (resultadosSet.has(j.jogo_numero)) continue // já finalizado, ignora
    const dt = new Date(j.data_hora)

    // Fora da janela de 3h
    if (dt < limite) continue
    if (dt > agora) continue

    // Auto-start: cria 0x0 se jogo está na janela e não tem entrada ao vivo
    if (!aoVivoMap.has(j.jogo_numero)) {
      try {
        await supabaseAdmin.from('jogos_ao_vivo').upsert(
          { jogo_numero: j.jogo_numero, gol_a: 0, gol_b: 0, penalti_a: null, penalti_b: null, minuto: 0 },
          { onConflict: 'jogo_numero' }
        )
        aoVivoMap.set(j.jogo_numero, { gol_a: 0, gol_b: 0, penalti_a: null, penalti_b: null, minuto: 0 })
      } catch {
        // tabela pode não existir
      }
    }

    liveGames.push(j)
  }

  // Auto-finalização: jogos com mais de 3h desde o início (que não tenham resultado ainda)
  const autoFinalizados: number[] = []
  for (const [jogoNumero, live] of aoVivoMap) {
    if (resultadosSet.has(jogoNumero)) {
      // Já tem resultado, só limpa o live
      await supabaseAdmin.from('jogos_ao_vivo').delete().eq('jogo_numero', jogoNumero)
      aoVivoMap.delete(jogoNumero)
      continue
    }
    const jogo = (jogos as Jogo[] ?? []).find((j) => j.jogo_numero === jogoNumero)
    if (!jogo?.data_hora) continue
    const dt = new Date(jogo.data_hora)
    const diffMs = agora.getTime() - dt.getTime()
    if (diffMs > 3 * 60 * 60 * 1000) {
      // Finaliza com o placar atual
      const autoGolA = live.gol_a
      const autoGolB = live.gol_b

      await supabaseAdmin.from('resultados').upsert(
        {
          jogo_numero: jogoNumero,
          gol_a: autoGolA,
          gol_b: autoGolB,
          penalti_a: null,
          penalti_b: null,
        },
        { onConflict: 'jogo_numero' }
      )
      await supabaseAdmin.from('jogos_ao_vivo').delete().eq('jogo_numero', jogoNumero)

      await advanceWinner(jogoNumero, autoGolA, autoGolB, null, null)

      autoFinalizados.push(jogoNumero)
      aoVivoMap.delete(jogoNumero)
    }
  }

  const result = liveGames.map((j) => {
    const live = aoVivoMap.get(j.jogo_numero)
    const dt = j.data_hora ? new Date(j.data_hora) : null
    const minutosPassados = dt ? Math.floor((agora.getTime() - dt.getTime()) / 60000) : 0
    return {
      jogo_numero: j.jogo_numero,
      fase: j.fase,
      grupo: j.grupo,
      pais_a: j.pais_a,
      pais_b: j.pais_b,
      gol_a: live?.gol_a ?? 0,
      gol_b: live?.gol_b ?? 0,
      penalti_a: live?.penalti_a ?? null,
      penalti_b: live?.penalti_b ?? null,
      minuto: Math.min(minutosPassados, 120),
      data_hora: j.data_hora,
      estadio: j.estadio,
    }
  })

  return NextResponse.json({
    live: result,
    em_andamento: result.length,
    auto_finalizados: autoFinalizados,
  })
}

// POST /api/live — admin: atualiza placar ou encerra partida
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-password')
  const bearer = request.headers.get('authorization')
  const cookieToken = request.cookies.get('token')?.value ?? null
  if (!isAdminRequest(authHeader, bearer, cookieToken)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { jogo_numero, gol_a, gol_b, penalti_a, penalti_b, action } = body

  if (!jogo_numero) {
    return NextResponse.json({ error: 'jogo_numero é obrigatório' }, { status: 400 })
  }

  if (action === 'cancel') {
    // Remove do ao_vivo sem salvar resultado
    await supabaseAdmin.from('jogos_ao_vivo').delete().eq('jogo_numero', jogo_numero)
    return NextResponse.json({ message: `Jogo ${jogo_numero} cancelado!` })
  }

  if (action === 'end') {
    // Finaliza: pega placar atual, salva em resultados, remove do ao_vivo
    const { data: liveAtual } = await supabaseAdmin
      .from('jogos_ao_vivo')
      .select('*')
      .eq('jogo_numero', jogo_numero)
      .single()

    if (!liveAtual) {
      return NextResponse.json({ error: 'Jogo não está ao vivo' }, { status: 400 })
    }

    const endGolA = liveAtual.gol_a
    const endGolB = liveAtual.gol_b
    const endPenA = liveAtual.penalti_a ?? null
    const endPenB = liveAtual.penalti_b ?? null

    await supabaseAdmin.from('resultados').upsert(
      {
        jogo_numero,
        gol_a: endGolA,
        gol_b: endGolB,
        penalti_a: endPenA,
        penalti_b: endPenB,
      },
      { onConflict: 'jogo_numero' }
    )

    await supabaseAdmin.from('jogos_ao_vivo').delete().eq('jogo_numero', jogo_numero)

    await advanceWinner(jogo_numero, endGolA, endGolB, endPenA, endPenB)

    return NextResponse.json({ message: `Jogo ${jogo_numero} finalizado!` })
  }

  // Update placar ao vivo
  const { error } = await supabaseAdmin.from('jogos_ao_vivo').upsert(
    {
      jogo_numero,
      gol_a: gol_a ?? 0,
      gol_b: gol_b ?? 0,
      penalti_a: penalti_a ?? null,
      penalti_b: penalti_b ?? null,
    },
    { onConflict: 'jogo_numero' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: `Jogo ${jogo_numero} atualizado: ${gol_a} x ${gol_b}` })
}
