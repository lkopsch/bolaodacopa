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
  erros: number
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
