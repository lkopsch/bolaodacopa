'use client'

import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import type { Jogo, Resultado } from '@/types'
import { getFaseLabel, FASES_ORDER } from '@/lib/excel-parser'
import { TeamWithFlag } from '@/lib/countryFlags'
import clsx from 'clsx'

const ROUNDS = ['Rodada_32', 'Oitavas', 'Quartas', 'Semi', 'Final']

interface BracketGame {
  jogo_numero: number
  fase: string
  pais_a: string | null
  pais_b: string | null
  resultado: Resultado | undefined
}

function getWinner(resultado: Resultado | undefined): 'A' | 'B' | null {
  if (!resultado) return null
  if (resultado.penalti_a != null && resultado.penalti_b != null && resultado.penalti_a !== resultado.penalti_b) {
    return resultado.penalti_a > resultado.penalti_b ? 'A' : 'B'
  }
  if (resultado.gol_a > resultado.gol_b) return 'A'
  if (resultado.gol_b > resultado.gol_a) return 'B'
  return null
}

export function KnockoutBracket({
  jogos,
  resultados,
}: {
  jogos: Jogo[]
  resultados: Resultado[]
}) {
  const resultadoMap = useMemo(
    () => new Map(resultados.map((r) => [r.jogo_numero, r])),
    [resultados]
  )

  const sortedJogos = useMemo(
    () => [...jogos].sort((a, b) => a.jogo_numero - b.jogo_numero),
    [jogos]
  )

  const gamesByFase = useMemo(() => {
    const map = new Map<string, BracketGame[]>()
    for (const j of sortedJogos) {
      if (j.fase === 'Grupos') continue
      const g: BracketGame = {
        jogo_numero: j.jogo_numero,
        fase: j.fase,
        pais_a: j.pais_a,
        pais_b: j.pais_b,
        resultado: resultadoMap.get(j.jogo_numero),
      }
      if (!map.has(j.fase)) map.set(j.fase, [])
      map.get(j.fase)!.push(g)
    }

    // Preenche placeholders para rounds sem jogos
    if (!map.has('Rodada_32')) map.set('Rodada_32', [])
    if (!map.has('Oitavas')) map.set('Oitavas', [])
    if (!map.has('Quartas')) map.set('Quartas', [])
    if (!map.has('Semi')) map.set('Semi', [])
    if (!map.has('Final')) map.set('Final', [])
    if (!map.has('Disputa_Terceiro')) map.set('Disputa_Terceiro', [])

    return map
  }, [sortedJogos, resultadoMap])

  return (
    <div className="space-y-8">
      {/* Bracket rounds */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {ROUNDS.map((fase) => {
          const games = gamesByFase.get(fase) ?? []
          const expected = FASES_ORDER[fase] ? (fase === 'Rodada_32' ? 16 : fase === 'Oitavas' ? 8 : fase === 'Quartas' ? 4 : fase === 'Semi' ? 2 : 1) : 0

          return (
            <div key={fase} className="min-w-0">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider text-center mb-4 pb-2 border-b border-stone-800">
                {getFaseLabel(fase)}
              </h3>
              <div className="space-y-3">
                {Array.from({ length: Math.max(games.length, expected) }).map((_, i) => {
                  const g = games[i]
                  if (!g) {
                    return (
                      <div
                        key={`empty-${i}`}
                        className="bg-stone-900/50 border border-dashed border-stone-800 rounded-xl p-3 text-center"
                      >
                        <span className="text-stone-600 text-xs">A definir</span>
                      </div>
                    )
                  }

                  const winner = getWinner(g.resultado)
                  const hasResult = !!g.resultado

                  return (
                    <div
                      key={g.jogo_numero}
                      className={clsx(
                        'bg-stone-900 border rounded-xl p-3',
                        hasResult ? 'border-emerald-500/20' : 'border-stone-800'
                      )}
                    >
                      <div className="text-[10px] text-stone-600 font-mono mb-1.5 text-center">
                        #{g.jogo_numero}
                      </div>
                      <div className="space-y-1">
                        <div className={clsx(
                          'flex items-center justify-between gap-1 px-2 py-1 rounded text-xs',
                          winner === 'A' ? 'bg-emerald-500/10 text-emerald-300 font-bold' : 'text-stone-400'
                        )}>
                          <span className="truncate"><TeamWithFlag name={g.pais_a} /></span>
                          {hasResult && <span className="font-mono shrink-0">{g.resultado!.gol_a}</span>}
                        </div>
                        <div className={clsx(
                          'flex items-center justify-between gap-1 px-2 py-1 rounded text-xs',
                          winner === 'B' ? 'bg-emerald-500/10 text-emerald-300 font-bold' : 'text-stone-400'
                        )}>
                          <span className="truncate"><TeamWithFlag name={g.pais_b} /></span>
                          {hasResult && <span className="font-mono shrink-0">{g.resultado!.gol_b}</span>}
                        </div>
                        {hasResult && g.resultado!.penalti_a != null && (
                          <div className="text-[10px] text-stone-600 text-center mt-1">
                            pên: {g.resultado!.penalti_a} × {g.resultado!.penalti_b}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* 3º Lugar */}
      {((gamesByFase.get('Disputa_Terceiro')?.length ?? 0) > 0 || true) && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider">
              {getFaseLabel('Disputa_Terceiro')}
            </h2>
            <div className="flex-1 h-px bg-stone-800" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {gamesByFase.get('Disputa_Terceiro')?.length === 0 ? (
              <div className="bg-stone-900/50 border border-dashed border-stone-800 rounded-xl p-4 text-center col-span-full">
                <span className="text-stone-600 text-sm">A definir</span>
              </div>
            ) : (
              gamesByFase.get('Disputa_Terceiro')?.map((g) => (
                <div key={g.jogo_numero} className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                  <div className="text-xs text-stone-600 font-mono mb-2">#{g.jogo_numero}</div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-white text-sm truncate"><TeamWithFlag name={g.pais_a} /></span>
                    <span className="text-stone-600 text-xs">vs</span>
                    <span className="font-semibold text-white text-sm truncate"><TeamWithFlag name={g.pais_b} /></span>
                  </div>
                  {g.resultado && (
                    <div className="text-center text-emerald-400 font-mono font-bold">
                      {g.resultado.gol_a} × {g.resultado.gol_b}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Champion */}
      {(() => {
        const finalGames = gamesByFase.get('Final') ?? []
        const finalGame = finalGames[0]
        if (!finalGame?.resultado) return null
        const winner = finalGame.resultado.gol_a > finalGame.resultado.gol_b ? finalGame.pais_a
          : finalGame.resultado.gol_b > finalGame.resultado.gol_a ? finalGame.pais_b
          : null
        if (!winner) return null
        return (
          <div className="text-center py-6">
            <div className="inline-flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-8 py-6">
              <Trophy className="text-amber-400" size={32} />
              <div>
                <p className="text-xs text-amber-400/80 uppercase tracking-wider font-bold">Campeão</p>
                <p className="text-2xl font-black text-white"><TeamWithFlag name={winner} /></p>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
