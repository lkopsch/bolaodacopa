'use client'

import { useMemo } from 'react'
import { Trophy, ArrowRight } from 'lucide-react'
import type { Jogo, Resultado } from '@/types'
import { getFaseLabel } from '@/lib/excel-parser'
import { TeamWithFlag } from '@/lib/countryFlags'
import clsx from 'clsx'

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

function getWinnerName(g: BracketGame): string | null {
  const w = getWinner(g.resultado)
  if (w === 'A') return g.pais_a
  if (w === 'B') return g.pais_b
  return null
}

const ROUND_CONFIG: { fase: string; count: number }[] = [
  { fase: 'Rodada_32', count: 16 },
  { fase: 'Oitavas', count: 8 },
  { fase: 'Quartas', count: 4 },
  { fase: 'Semi', count: 2 },
  { fase: 'Final', count: 1 },
]

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
        pais_a: j.pais_a || null,
        pais_b: j.pais_b || null,
        resultado: resultadoMap.get(j.jogo_numero),
      }
      if (!map.has(j.fase)) map.set(j.fase, [])
      map.get(j.fase)!.push(g)
    }

    for (const { fase, count } of ROUND_CONFIG) {
      if (!map.has(fase)) map.set(fase, [])
    }
    if (!map.has('Disputa_Terceiro')) map.set('Disputa_Terceiro', [])

    return map
  }, [sortedJogos, resultadoMap])

  const resolveGame = (idx: number, fase: string): BracketGame => {
    const games = gamesByFase.get(fase) ?? []
    return games[idx] ?? { jogo_numero: 0, fase, pais_a: null, pais_b: null, resultado: undefined }
  }

  const terceiroGames = gamesByFase.get('Disputa_Terceiro') ?? []

  const champion = useMemo(() => {
    const finalGame = (gamesByFase.get('Final') ?? [])[0]
    if (!finalGame?.resultado) return null
    return getWinnerName(finalGame)
  }, [gamesByFase])

  return (
    <div className="space-y-8">
      {/* Bracket visualization */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {ROUND_CONFIG.map(({ fase, count }, roundIdx) => {
            const games = gamesByFase.get(fase) ?? []
            const hasGames = games.some((g) => g.pais_a && g.pais_b)

            return (
              <div key={fase} className="flex flex-col justify-around min-w-0" style={{ width: 180 }}>
                {/* Round header */}
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider text-center mb-4 pb-2 border-b border-stone-800">
                  {getFaseLabel(fase)}
                </h3>

                <div className={clsx(
                  'flex flex-col',
                  count === 16 && 'gap-1',
                  count === 8 && 'gap-3',
                  count === 4 && 'gap-6',
                  count === 2 && 'gap-10',
                  count === 1 && 'gap-0 justify-center flex-1'
                )}>
                  {Array.from({ length: count }).map((_, i) => {
                    const g = games[i]
                    if (!g || (!g.pais_a && !g.pais_b)) {
                      return (
                        <div key={`${fase}-${i}`} className="bg-stone-900/50 border border-dashed border-stone-800 rounded-xl p-3 text-center relative">
                          <span className="text-xs text-stone-600">A definir</span>
                          {/* Arrow to next round */}
                          {roundIdx < ROUND_CONFIG.length - 1 && (
                            <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-stone-700">
                              <ArrowRight size={12} />
                            </div>
                          )}
                        </div>
                      )
                    }

                    const winner = getWinner(g.resultado)
                    const hasResult = !!g.resultado
                    const jogoNum = g.jogo_numero

                    return (
                      <div key={jogoNum} className={clsx(
                        'bg-stone-900 border rounded-xl p-3 relative',
                        hasResult ? 'border-emerald-500/20' : 'border-stone-800'
                      )}>
                        <div className="text-[10px] text-stone-600 font-mono mb-1.5 text-center">
                          #{jogoNum}
                        </div>
                        <div className="space-y-1">
                          <div className={clsx(
                            'flex items-center justify-between gap-1 px-2 py-1 rounded text-xs',
                            winner === 'A' ? 'bg-emerald-500/10 text-emerald-300 font-bold' : 'text-stone-400'
                          )}>
                            <span className="truncate min-w-0 max-w-24"><TeamWithFlag name={g.pais_a} /></span>
                            {hasResult && <span className="font-mono shrink-0">{g.resultado!.gol_a}</span>}
                            {!hasResult && g.pais_a && <span className="text-stone-600 text-[10px] shrink-0">-</span>}
                          </div>
                          <div className={clsx(
                            'flex items-center justify-between gap-1 px-2 py-1 rounded text-xs',
                            winner === 'B' ? 'bg-emerald-500/10 text-emerald-300 font-bold' : 'text-stone-400'
                          )}>
                            <span className="truncate min-w-0 max-w-24"><TeamWithFlag name={g.pais_b} /></span>
                            {hasResult && <span className="font-mono shrink-0">{g.resultado!.gol_b}</span>}
                            {!hasResult && g.pais_b && <span className="text-stone-600 text-[10px] shrink-0">-</span>}
                          </div>
                          {hasResult && g.resultado!.penalti_a != null && (
                            <div className="text-[10px] text-stone-600 text-center mt-1">
                              pên: {g.resultado!.penalti_a} × {g.resultado!.penalti_b}
                            </div>
                          )}
                        </div>

                        {/* Arrow to next round */}
                        {roundIdx < ROUND_CONFIG.length - 1 && (
                          <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-stone-700">
                            <ArrowRight size={12} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3º Lugar */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider">
            {getFaseLabel('Disputa_Terceiro')}
          </h2>
          <div className="flex-1 h-px bg-stone-800" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {terceiroGames.length === 0 || (!terceiroGames[0]?.pais_a && !terceiroGames[0]?.pais_b) ? (
            <div className="bg-stone-900/50 border border-dashed border-stone-800 rounded-xl p-4 text-center col-span-full">
              <span className="text-stone-600 text-sm">A definir</span>
            </div>
          ) : (
            terceiroGames.map((g) => (
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

      {/* Champion */}
      {champion && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-8 py-6">
            <Trophy className="text-amber-400" size={32} />
            <div>
              <p className="text-xs text-amber-400/80 uppercase tracking-wider font-bold">Campeão</p>
              <p className="text-2xl font-black text-white"><TeamWithFlag name={champion} /></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
