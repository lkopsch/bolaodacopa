import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calcularPontos } from '@/types'
import type { Palpite, Resultado, ParticipanteRanking } from '@/types'

export async function GET() {
  const [{ data: palpites, error: e1 }, { data: resultados, error: e2 }] = await Promise.all([
    supabase.from('palpites').select('*').order('jogo_numero'),
    supabase.from('resultados').select('*'),
  ])

  if (e1 || e2) {
    return NextResponse.json({ error: e1?.message ?? e2?.message }, { status: 500 })
  }

  const resultadoMap = new Map<number, Resultado>(
    (resultados ?? []).map((r: Resultado) => [r.jogo_numero, r])
  )

  // Build ranking
  const rankingMap = new Map<string, ParticipanteRanking>()

  for (const palpite of palpites ?? []) {
    const resultado = resultadoMap.get(palpite.jogo_numero)
    const pontos = resultado ? calcularPontos(palpite as Palpite, resultado) : 0

    if (!rankingMap.has(palpite.nome_participante)) {
      rankingMap.set(palpite.nome_participante, {
        nome: palpite.nome_participante,
        pontos_total: 0,
        jogos_palpitados: 0,
        acertos_placar: 0,
        acertos_resultado: 0,
        erros: 0,
      })
    }

    const entry = rankingMap.get(palpite.nome_participante)!
    entry.jogos_palpitados++

    if (resultado) {
      entry.pontos_total += pontos
      if (pontos === 10) entry.acertos_placar++
      else if (pontos >= 5) entry.acertos_resultado++
      else entry.erros++
    }
  }

  const ranking = Array.from(rankingMap.values()).sort(
    (a, b) => b.pontos_total - a.pontos_total
  )

  return NextResponse.json({
    palpites: palpites ?? [],
    resultados: resultados ?? [],
    ranking,
  })
}
