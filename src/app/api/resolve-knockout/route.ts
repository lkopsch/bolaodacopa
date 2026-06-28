import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getWinnerFromResult } from '@/lib/knockout-resolve'
import type { Jogo, Resultado } from '@/types'

export async function GET() {
  const { data: jogos, error: jogosError } = await supabaseAdmin
    .from('jogos')
    .select('*')
    .neq('fase', 'Grupos')

  if (jogosError) {
    return NextResponse.json({ error: jogosError.message }, { status: 500 })
  }

  const { data: resultados, error: resError } = await supabaseAdmin
    .from('resultados')
    .select('*')

  if (resError) {
    return NextResponse.json({ error: resError.message }, { status: 500 })
  }

  const resultadoMap = new Map<number, Resultado>(
    (resultados as Resultado[]).map((r) => [r.jogo_numero, r])
  )

  const gameMap = new Map<number, Jogo>(
    (jogos as Jogo[]).map((g) => [g.jogo_numero, g])
  )

  const sorted = [...gameMap.keys()].sort((a, b) => a - b)
  const updated: string[] = []

  for (const num of sorted) {
    const jogo = gameMap.get(num)!
    let changed = false

    if (jogo.origem_a) {
      const src = gameMap.get(jogo.origem_a)
      if (src) {
        const res = resultadoMap.get(src.jogo_numero)
        if (res) {
          const winner = getWinnerFromResult(src, res)
          if (winner && jogo.pais_a !== winner) {
            await supabaseAdmin
              .from('jogos')
              .update({ pais_a: winner })
              .eq('jogo_numero', jogo.jogo_numero)
            jogo.pais_a = winner
            changed = true
          }
        }
      }
    }

    if (jogo.origem_b) {
      const src = gameMap.get(jogo.origem_b)
      if (src) {
        const res = resultadoMap.get(src.jogo_numero)
        if (res) {
          const winner = getWinnerFromResult(src, res)
          if (winner && jogo.pais_b !== winner) {
            await supabaseAdmin
              .from('jogos')
              .update({ pais_b: winner })
              .eq('jogo_numero', jogo.jogo_numero)
            jogo.pais_b = winner
            changed = true
          }
        }
      }
    }

    if (changed) {
      updated.push(`Jogo ${jogo.jogo_numero}: ${jogo.pais_a} vs ${jogo.pais_b}`)
    }
  }

  return NextResponse.json({
    message: `${updated.length} jogos atualizados`,
    updated,
  })
}
