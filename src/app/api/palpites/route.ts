import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calcularPontos } from '@/types'
import type { Palpite, Resultado, ParticipanteRanking } from '@/types'

function buildRanking(
  palpites: Palpite[],
  resultadosMap: Map<number, Resultado>,
): ParticipanteRanking[] {
  const rankingMap = new Map<string, ParticipanteRanking>()

  for (const palpite of palpites) {
    const resultado = resultadosMap.get(palpite.jogo_numero)
    const pontos = resultado ? calcularPontos(palpite, resultado) : 0

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

  return Array.from(rankingMap.values()).sort(
    (a, b) => b.pontos_total - a.pontos_total
  )
}

export async function GET() {
  const [{ data: palpites, error: e1 }, { data: resultados, error: e2 }, { data: aoVivo }] = await Promise.all([
    supabase.from('palpites').select('*').order('jogo_numero'),
    supabase.from('resultados').select('*'),
    supabase.from('jogos_ao_vivo').select('*'),
  ])

  if (e1 || e2) {
    return NextResponse.json({ error: e1?.message ?? e2?.message }, { status: 500 })
  }

  const palpitesArr = (palpites ?? []) as Palpite[]
  const resultadosArr = (resultados ?? []) as Resultado[]
  const aoVivoArr = (aoVivo ?? []) as any[]

  const aoVivoSet = new Set<number>(aoVivoArr.map((l) => l.jogo_numero))

  // Base ranking (sem live scores)
  const baseResultadosMap = new Map<number, Resultado>(
    resultadosArr.map((r) => [r.jogo_numero, r])
  )
  const rankingBase = buildRanking(palpitesArr, baseResultadosMap)

  // Live ranking (merge live scores on top)
  const liveResultadosMap = new Map(baseResultadosMap)
  for (const live of aoVivoArr) {
    liveResultadosMap.set(live.jogo_numero, {
      jogo_numero: live.jogo_numero,
      gol_a: live.gol_a,
      gol_b: live.gol_b,
      penalti_a: null,
      penalti_b: null,
    } as Resultado)
  }
  const rankingLive = buildRanking(palpitesArr, liveResultadosMap)

  // Merge resultados for frontend display
  const resultadosMerged = resultadosArr.filter(
    (r) => !aoVivoSet.has(r.jogo_numero)
  )
  for (const live of aoVivoArr) {
    resultadosMerged.push({
      jogo_numero: live.jogo_numero,
      gol_a: live.gol_a,
      gol_b: live.gol_b,
      penalti_a: null,
      penalti_b: null,
    } as Resultado)
  }

  return NextResponse.json({
    palpites: palpitesArr,
    resultados: resultadosMerged,
    ranking: rankingLive,
    ranking_base: rankingBase,
    ao_vivo: Array.from(aoVivoSet),
  })
}
