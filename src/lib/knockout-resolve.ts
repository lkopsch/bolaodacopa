import { supabaseAdmin } from './supabase'
import type { Jogo, Resultado } from '@/types'

export function getWinnerFromResult(jogo: Jogo, result: Resultado): string | null {
  if (result.penalti_a != null && result.penalti_b != null && result.penalti_a !== result.penalti_b) {
    return result.penalti_a > result.penalti_b ? jogo.pais_a : jogo.pais_b
  }
  if (result.gol_a > result.gol_b) return jogo.pais_a
  if (result.gol_b > result.gol_a) return jogo.pais_b
  return null
}

export async function advanceWinner(
  jogoNumero: number,
  golA: number,
  golB: number,
  penA: number | null,
  penB: number | null
) {
  const { data: jogo } = await supabaseAdmin
    .from('jogos')
    .select('pais_a, pais_b')
    .eq('jogo_numero', jogoNumero)
    .single()

  if (!jogo) return

  const fakeResult: Resultado = {
    jogo_numero: jogoNumero,
    gol_a: golA,
    gol_b: golB,
    penalti_a: penA,
    penalti_b: penB,
  }

  const winner = getWinnerFromResult(jogo as Jogo, fakeResult)
  if (!winner) return

  const { data: targets } = await supabaseAdmin
    .from('jogos')
    .select('jogo_numero, origem_a, origem_b')
    .or(`origem_a.eq.${jogoNumero},origem_b.eq.${jogoNumero}`)

  if (!targets) return

  for (const target of targets) {
    const field = target.origem_a === jogoNumero ? 'pais_a' : 'pais_b'
    await supabaseAdmin
      .from('jogos')
      .update({ [field]: winner })
      .eq('jogo_numero', target.jogo_numero)
  }
}
