import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { Jogo } from '@/types'

// GET /api/live — retorna jogos ao vivo com placar atual
export async function GET() {
  const agora = new Date()

  // Busca jogos que deveriam estar ocorrendo agora (data_hora <= agora < data_hora + 2h30)
  const { data: jogos, error: jogosError } = await supabase
    .from('jogos')
    .select('*')
    .lte('data_hora', agora.toISOString())
    .order('data_hora', { ascending: false })

  if (jogosError) {
    return NextResponse.json({ error: jogosError.message }, { status: 500 })
  }

  const limite = new Date(agora.getTime() - 150 * 60 * 1000) // 2h30 atrás

  // Tenta ler da tabela ao_vivo
  let aoVivoMap = new Map<number, { gol_a: number; gol_b: number; minuto: number }>()
  try {
    const { data: liveData } = await supabase.from('jogos_ao_vivo').select('*')
    if (liveData) {
      for (const l of liveData) {
        aoVivoMap.set(l.jogo_numero, { gol_a: l.gol_a, gol_b: l.gol_b, minuto: l.minuto })
      }
    }
  } catch {
    // tabela pode não existir ainda
  }

  // Busca resultados existentes
  const { data: resultados } = await supabase.from('resultados').select('*')
  const resultadosMap = new Map((resultados ?? []).map((r: any) => [r.jogo_numero, r]))

  const liveGames = (jogos as Jogo[] ?? []).filter((j) => {
    if (!j.data_hora) return false
    const dt = new Date(j.data_hora)
    return dt <= agora && dt >= limite && !resultadosMap.has(j.jogo_numero)
  })

  // Auto-start: cria entrada 0x0 na jogos_ao_vivo se não existir
  for (const j of liveGames) {
    if (!aoVivoMap.has(j.jogo_numero)) {
      try {
        await supabaseAdmin.from('jogos_ao_vivo').upsert(
          { jogo_numero: j.jogo_numero, gol_a: 0, gol_b: 0, minuto: 0 },
          { onConflict: 'jogo_numero' }
        )
        aoVivoMap.set(j.jogo_numero, { gol_a: 0, gol_b: 0, minuto: 0 })
      } catch {
        // tabela pode não existir
      }
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
      minuto: Math.min(minutosPassados, 120),
      data_hora: j.data_hora,
      estadio: j.estadio,
    }
  })

  return NextResponse.json({ live: result, em_andamento: result.length })
}

// POST /api/live — admin: atualiza placar ou encerra partida
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-password')
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { jogo_numero, gol_a, gol_b, action } = body

  if (!jogo_numero) {
    return NextResponse.json({ error: 'jogo_numero é obrigatório' }, { status: 400 })
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

    await supabaseAdmin.from('resultados').upsert(
      {
        jogo_numero,
        gol_a: liveAtual.gol_a,
        gol_b: liveAtual.gol_b,
        penalti_a: body.penalti_a ?? null,
        penalti_b: body.penalti_b ?? null,
      },
      { onConflict: 'jogo_numero' }
    )

    await supabaseAdmin.from('jogos_ao_vivo').delete().eq('jogo_numero', jogo_numero)

    return NextResponse.json({ message: `Jogo ${jogo_numero} finalizado!` })
  }

  // Update placar ao vivo
  const { error } = await supabaseAdmin.from('jogos_ao_vivo').upsert(
    {
      jogo_numero,
      gol_a: gol_a ?? 0,
      gol_b: gol_b ?? 0,
    },
    { onConflict: 'jogo_numero' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: `Jogo ${jogo_numero} atualizado: ${gol_a} x ${gol_b}` })
}
