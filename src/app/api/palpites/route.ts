import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calcularPontos, calcularPontosMataMata, calcularAcertosConfronto, calcularPontosPodio } from '@/types'
import type { Palpite, Resultado, ParticipanteRanking, Jogo } from '@/types'

function buildRanking(
  palpites: Palpite[],
  resultadosMap: Map<number, Resultado>,
  jogosMap: Map<number, Jogo>,
  podiumPontos: Map<string, number>,
  mmAtivo: boolean,
): ParticipanteRanking[] {
  const rankingMap = new Map<string, ParticipanteRanking>()

  for (const palpite of palpites) {
    const resultado = resultadosMap.get(palpite.jogo_numero)

    if (!rankingMap.has(palpite.nome_participante)) {
      rankingMap.set(palpite.nome_participante, {
        nome: palpite.nome_participante,
        pontos_total: 0,
        jogos_palpitados: 0,
        acertos_placar: 0,
        acertos_resultado: 0,
        acertos_um_lado: 0,
        erros: 0,
        mm_acertos: 0,
        pontos_podio: 0,
      })
    }

    const entry = rankingMap.get(palpite.nome_participante)!
    entry.jogos_palpitados++

    const jogo = jogosMap.get(palpite.jogo_numero)
    const isKnockout = palpite.fase !== 'Grupos'

    // MM counts confronto acertos even without resultado (times são conhecidos do bracket)
    if (isKnockout && jogo) {
      entry.mm_acertos += calcularAcertosConfronto(palpite, jogo)
    }

    if (resultado) {
      const pontos = (jogo && isKnockout)
        ? calcularPontosMataMata(palpite, resultado, jogo)
        : calcularPontos(palpite, resultado)

      entry.pontos_total += pontos

      if (pontos === 10) entry.acertos_placar++
      else if (pontos >= 5) entry.acertos_resultado++
      else if (pontos === 1) entry.acertos_um_lado++
      else entry.erros++
    }
  }

  for (const entry of rankingMap.values()) {
    const podio = podiumPontos.get(entry.nome) ?? 0
    entry.pontos_total += podio
    entry.pontos_podio = podio
    if (mmAtivo) {
      entry.pontos_total += entry.mm_acertos * 10
    }
  }

  return Array.from(rankingMap.values()).sort(
    (a, b) => b.pontos_total - a.pontos_total
  )
}

export async function GET() {
  const [{ data: palpites, error: e1 }, { data: resultados, error: e2 }, { data: aoVivo }, { data: jogos, error: e3 }] = await Promise.all([
    supabase.from('palpites').select('*').order('jogo_numero').limit(1000000),
    supabase.from('resultados').select('*'),
    supabase.from('jogos_ao_vivo').select('*'),
    supabase.from('jogos').select('*'),
  ])

  if (e1 || e2 || e3) {
    return NextResponse.json({ error: e1?.message ?? e2?.message ?? e3?.message }, { status: 500 })
  }

  const palpitesArr = (palpites ?? []) as Palpite[]
  const resultadosArr = (resultados ?? []) as Resultado[]
  const aoVivoArr = (aoVivo ?? []) as any[]
  const jogosArr = (jogos ?? []) as Jogo[]

  const jogosMap = new Map<number, Jogo>(jogosArr.map((j) => [j.jogo_numero, j]))
  const aoVivoSet = new Set<number>(aoVivoArr.map((l) => l.jogo_numero))

  const totalGrupos = jogosArr.filter((j) => j.fase === 'Grupos').length
  const gruposComResultado = resultadosArr.filter((r) => {
    const jogo = jogosMap.get(r.jogo_numero)
    return jogo && jogo.fase === 'Grupos'
  }).length
  const mmAtivo = totalGrupos > 0 && gruposComResultado >= totalGrupos

  const podiumPontos = calcularPontosPodio(palpitesArr, resultadosArr, jogosArr)

  // Base ranking (sem live scores)
  const baseResultadosMap = new Map<number, Resultado>(
    resultadosArr.map((r) => [r.jogo_numero, r])
  )
  const rankingBase = buildRanking(palpitesArr, baseResultadosMap, jogosMap, podiumPontos, mmAtivo)

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
  const rankingLive = buildRanking(palpitesArr, liveResultadosMap, jogosMap, podiumPontos, mmAtivo)

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
    mm_ativo: mmAtivo,
  })
}
