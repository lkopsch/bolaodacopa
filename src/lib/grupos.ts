import type { Jogo } from '@/types'

export const GRUPOS: Record<string, string[]> = {
  A: ['México', 'África do Sul', 'Coreia do Sul', 'República Tcheca'],
  B: ['Canadá', 'Bósnia', 'Catar', 'Suíça'],
  C: ['Brasil', 'Marrocos', 'Haiti', 'Escócia'],
  D: ['Estados Unidos', 'Paraguai', 'Austrália', 'Turquia'],
  E: ['Alemanha', 'Curaçau', 'Costa do Marfim', 'Equador'],
  F: ['Holanda', 'Japão', 'Suécia', 'Tunísia'],
  G: ['Bélgica', 'Egito', 'Irã', 'Nova Zelândia'],
  H: ['Espanha', 'Cabo Verde', 'Arábia Saudita', 'Uruguai'],
  I: ['França', 'Senegal', 'Iraque', 'Noruega'],
  J: ['Argentina', 'Argélia', 'Áustria', 'Jordânia'],
  K: ['Portugal', 'República Democrática do Congo', 'Uzbequistão', 'Colômbia'],
  L: ['Inglaterra', 'Croácia', 'Gana', 'Panamá'],
}

export function getGrupoDoTime(time: string): string | null {
  for (const [grupo, times] of Object.entries(GRUPOS)) {
    if (times.includes(time)) return grupo
  }
  return null
}

export function getGrupoDoJogo(jogo: Pick<Jogo, 'pais_a' | 'pais_b' | 'fase'>): string | null {
  if (jogo.fase !== 'Grupos') return null
  const gA = getGrupoDoTime(jogo.pais_a)
  const gB = getGrupoDoTime(jogo.pais_b)
  return gA && gB && gA === gB ? gA : null
}

export function getTimesDoGrupo(grupo: string): string[] {
  return GRUPOS[grupo] ?? []
}

export function isGrupoValido(grupo: string): boolean {
  return grupo in GRUPOS
}
