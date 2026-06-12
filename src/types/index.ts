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
  erros: number
}

export interface ParsedSheet {
  participantes: string[]
  palpites: Palpite[]
}

// Scoring system
// Errou tudo (mas palpitou) = 1 ponto
// Acertou resultado (vitória/empate) = 6 pontos
// Acertou placar exato = 10 pontos
export function calcularPontos(palpite: Palpite, resultado: Resultado): number {
  const golsA = palpite.gol_a
  const golsB = palpite.gol_b
  const resA = resultado.gol_a
  const resB = resultado.gol_b

  // Exact score
  if (golsA === resA && golsB === resB) {
    // Check penalties if applicable
    if (resultado.penalti_a !== null && palpite.penalti_a !== null) {
      if (palpite.penalti_a === resultado.penalti_a && palpite.penalti_b === resultado.penalti_b) {
        return 10
      }
      // Got regulation right but not penalties = 6
      return 6
    }
    return 10
  }

  // Got outcome right (win/draw)
  const palpiteOutcome = golsA > golsB ? 'A' : golsB > golsA ? 'B' : 'E'
  const resOutcome = resA > resB ? 'A' : resB > resA ? 'B' : 'E'

  if (palpiteOutcome === resOutcome) {
    return 6
  }

  // Participated but got nothing right
  return 1
}
