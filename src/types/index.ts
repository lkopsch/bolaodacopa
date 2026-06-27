export interface Palpite {
  id?: number
  numero_inscricao: string | null
  jogo_numero: number
  nome_participante: string
  fase: string
  pais_a: string
  gol_a: number
  gol_b: number
  pais_b: string
  penalti_a: number | null
  penalti_b: number | null
  grupo: string | null
  critica: string | null
}

export interface Jogo {
  id?: number
  jogo_numero: number
  fase: string
  grupo: string | null
  pais_a: string
  pais_b: string
  data_hora: string | null
  estadio: string | null
  origem_a: number | null
  origem_b: number | null
  created_at?: string
}

export interface Resultado {
  id?: number
  jogo_numero: number
  gol_a: number
  gol_b: number
  penalti_a: number | null
  penalti_b: number | null
  registrado_em?: string
}

export interface PalpiteComPontos extends Palpite {
  resultado?: Resultado
  pontos: number
}

export interface ParticipanteRanking {
  nome: string
  pontos_total: number
  jogos_palpitados: number
  acertos_placar: number
  acertos_resultado: number
  acertos_um_lado: number
  erros: number
  mm_acertos: number
  pontos_podio: number
}

export interface Usuario {
  id: number
  email: string
  nome_completo: string
  nickname: string
  is_admin: boolean
  created_at?: string
}

export interface ParsedSheet {
  participante: string
  palpites: Palpite[]
}

// Scoring system (cumulativo):
// 1pt por lado do placar acertado
// 5pt por resultado (vitória/empate) acertado
// 3pt bônus por placar exato
// Total máx = 1+1+5+3 = 10
export function calcularPontos(palpite: Palpite, resultado: Resultado): number {
  const golsA = palpite.gol_a
  const golsB = palpite.gol_b
  const resA = resultado.gol_a
  const resB = resultado.gol_b

  let pontos = 0

  if (golsA === resA) pontos += 1
  if (golsB === resB) pontos += 1

  const palpiteOutcome = golsA > golsB ? 'A' : golsB > golsA ? 'B' : 'E'
  const resOutcome = resA > resB ? 'A' : resB > resA ? 'B' : 'E'

  if (palpiteOutcome === resOutcome) pontos += 5

  if (golsA === resA && golsB === resB) {
    if (resultado.penalti_a !== null && palpite.penalti_a !== null) {
      if (palpite.penalti_a === resultado.penalti_a && palpite.penalti_b === resultado.penalti_b) {
        pontos += 3
      }
    } else {
      pontos += 3
    }
  }

  return pontos
}

export function calcularAcertosConfronto(palpite: Palpite, jogo: Jogo): number {
  let acertos = 0
  if (jogo.pais_a && palpite.pais_a === jogo.pais_a) acertos++
  if (jogo.pais_b && palpite.pais_b === jogo.pais_b) acertos++
  return acertos
}

export function calcularPontosMataMata(palpite: Palpite, resultado: Resultado, jogo: Jogo): number {
  const teamACorrect = !!(jogo.pais_a && palpite.pais_a === jogo.pais_a)
  const teamBCorrect = !!(jogo.pais_b && palpite.pais_b === jogo.pais_b)

  if (!teamACorrect && !teamBCorrect) return 0

  const confrontoBonus = teamACorrect && teamBCorrect ? 10 : 5

  let pontos = 0

  if (teamACorrect && palpite.gol_a === resultado.gol_a) pontos += 1
  if (teamBCorrect && palpite.gol_b === resultado.gol_b) pontos += 1

  const palpiteOutcome = palpite.gol_a > palpite.gol_b ? 'A' : palpite.gol_b > palpite.gol_a ? 'B' : 'E'
  const resOutcome = resultado.gol_a > resultado.gol_b ? 'A' : resultado.gol_b > resultado.gol_a ? 'B' : 'E'

  if (palpiteOutcome === resOutcome) pontos += 5

  if (palpite.gol_a === resultado.gol_a && palpite.gol_b === resultado.gol_b) {
    if (resultado.penalti_a !== null && palpite.penalti_a !== null) {
      if (palpite.penalti_a === resultado.penalti_a && palpite.penalti_b === resultado.penalti_b) {
        pontos += 3
      }
    } else {
      pontos += 3
    }
  }

  return confrontoBonus + pontos
}

function getMatchWinner(paisA: string, paisB: string, resultado: Resultado): string {
  if (resultado.gol_a > resultado.gol_b) return paisA
  if (resultado.gol_b > resultado.gol_a) return paisB
  if (resultado.penalti_a !== null && resultado.penalti_b !== null) {
    return resultado.penalti_a > resultado.penalti_b ? paisA : paisB
  }
  return paisB
}

function getMatchLoser(paisA: string, paisB: string, resultado: Resultado): string {
  const winner = getMatchWinner(paisA, paisB, resultado)
  return winner === paisA ? paisB : paisA
}

function getPredictedWinner(palpite: Palpite): string {
  if (palpite.gol_a > palpite.gol_b) return palpite.pais_a
  if (palpite.gol_b > palpite.gol_a) return palpite.pais_b
  if (palpite.penalti_a !== null && palpite.penalti_b !== null) {
    return palpite.penalti_a > palpite.penalti_b ? palpite.pais_a : palpite.pais_b
  }
  return palpite.pais_b
}

function getPredictedLoser(palpite: Palpite): string {
  const winner = getPredictedWinner(palpite)
  return winner === palpite.pais_a ? palpite.pais_b : palpite.pais_a
}

export function calcularPontosPodio(
  palpites: Palpite[],
  resultados: Resultado[],
  jogos: Jogo[],
): Map<string, number> {
  const finalJogo = jogos.find((j) => j.jogo_numero === 104)
  const terceiroJogo = jogos.find((j) => j.jogo_numero === 103)
  const finalResult = resultados.find((r) => r.jogo_numero === 104)
  const terceiroResult = resultados.find((r) => r.jogo_numero === 103)

  if (!finalJogo || !terceiroJogo || !finalResult || !terceiroResult) return new Map()

  const champion = getMatchWinner(finalJogo.pais_a, finalJogo.pais_b, finalResult)
  const vice = getMatchLoser(finalJogo.pais_a, finalJogo.pais_b, finalResult)
  const terceiro = getMatchWinner(terceiroJogo.pais_a, terceiroJogo.pais_b, terceiroResult)
  const quarto = getMatchLoser(terceiroJogo.pais_a, terceiroJogo.pais_b, terceiroResult)

  const pontosMap = new Map<string, number>()

  for (const p of palpites.filter((p) => p.jogo_numero === 104)) {
    let pts = 0
    if (getPredictedWinner(p) === champion) pts += 25
    if (getPredictedLoser(p) === vice) pts += 10
    pontosMap.set(p.nome_participante, (pontosMap.get(p.nome_participante) ?? 0) + pts)
  }

  for (const p of palpites.filter((p) => p.jogo_numero === 103)) {
    let pts = 0
    if (getPredictedWinner(p) === terceiro) pts += 5
    if (getPredictedLoser(p) === quarto) pts += 2
    pontosMap.set(p.nome_participante, (pontosMap.get(p.nome_participante) ?? 0) + pts)
  }

  return pontosMap
}
