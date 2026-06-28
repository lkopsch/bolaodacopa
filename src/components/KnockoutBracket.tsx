'use client'

import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import type { Jogo, Resultado } from '@/types'
import { getFaseLabel } from '@/lib/excel-parser'
import { FlagOnly } from '@/lib/countryFlags'
import clsx from 'clsx'

interface BracketGame {
  jogo_numero: number
  fase: string
  pais_a: string | null
  pais_b: string | null
  resultado: Resultado | undefined
  origem_a: number | null
  origem_b: number | null
  data_hora: string | null
}

function getWinner(g: BracketGame): 'A' | 'B' | null {
  if (!g.resultado) return null
  if (g.resultado.penalti_a != null && g.resultado.penalti_b != null && g.resultado.penalti_a !== g.resultado.penalti_b) {
    return g.resultado.penalti_a > g.resultado.penalti_b ? 'A' : 'B'
  }
  if (g.resultado.gol_a > g.resultado.gol_b) return 'A'
  if (g.resultado.gol_b > g.resultado.gol_a) return 'B'
  return null
}

function getWinnerName(g: BracketGame): string | null {
  const w = getWinner(g)
  if (w === 'A') return g.pais_a
  if (w === 'B') return g.pais_b
  return null
}

const CARD_W = 80

function GameSlot({ g, highlight }: { g: BracketGame; highlight?: boolean }) {
  const hasResult = !!g.resultado
  const winner = getWinner(g)

  if (!g.pais_a && !g.pais_b) {
    return <div className="w-3 h-3 rounded-full bg-stone-800 border border-dashed border-stone-700 mx-auto" />
  }

  return (
    <div className={clsx(
      'bg-stone-900 border rounded-sm',
      hasResult ? 'border-emerald-500/20' : 'border-stone-800',
      highlight && 'ring-1 ring-amber-400/30',
    )}>
      <div className="text-[8px] text-stone-500 font-mono text-center leading-tight border-b border-stone-800 py-0.5">
        J{g.jogo_numero}
      </div>
      <div className="py-1" style={{ width: CARD_W - 2 }}>
        <TeamRow
          name={g.pais_a}
          score={hasResult ? g.resultado!.gol_a : null}
          winner={winner === 'A'}
        />
        <TeamRow
          name={g.pais_b}
          score={hasResult ? g.resultado!.gol_b : null}
          winner={winner === 'B'}
        />
      </div>
    </div>
  )
}

function TeamRow({ name, score, winner }: { name: string | null; score: number | null; winner: boolean }) {
  return (
    <div className={clsx(
      'flex items-center gap-1',
      winner ? 'opacity-100' : 'opacity-70',
    )}>
      <FlagOnly name={name} />
      <span className={clsx(
        'text-[9px] font-semibold truncate flex-1 min-w-0',
        winner ? 'text-white' : 'text-stone-400',
      )}>
        {name || '—'}
      </span>
      {score !== null && (
        <span className={clsx(
          'font-mono font-bold text-[11px] min-w-[14px] text-right',
          winner ? 'text-white' : 'text-stone-500',
        )}>
          {score}
        </span>
      )}
    </div>
  )
}

function buildTree(
  game: BracketGame | undefined,
  gameMap: Map<number, BracketGame>,
): { game: BracketGame; left: any; right: any } | null {
  if (!game) return null
  const left = game.origem_a ? buildTree(gameMap.get(game.origem_a), gameMap) : null
  const right = game.origem_b ? buildTree(gameMap.get(game.origem_b), gameMap) : null
  return { game, left, right }
}

interface SlotInfo {
  col: number
  row: number
  span: number
}

function flattenTree(
  node: { game: BracketGame; left: any; right: any } | null,
  depth: number,
  slots: Map<number, SlotInfo>,
  isLeft: boolean,
  rowOffset: number,
  totalSpan: number,
) {
  if (!node) return
  const span = totalSpan / Math.pow(2, depth)
  const row = rowOffset + span / 2
  const col = isLeft ? 3 - depth : 5 + depth
  slots.set(node.game.jogo_numero, { col, row, span })
  flattenTree(node.left, depth + 1, slots, isLeft, rowOffset, totalSpan)
  flattenTree(node.right, depth + 1, slots, isLeft, rowOffset + span, totalSpan)
}

const COL_LABELS = ['Rodada_32', 'Oitavas', 'Quartas', 'Semis', 'Final / 3º', 'Semis', 'Quartas', 'Oitavas', 'Rodada_32']
const ROW_H = 60
const TOTAL_LEAVES = 8

export function KnockoutBracket({ jogos, resultados }: { jogos: Jogo[]; resultados: Resultado[] }) {
  const resultadoMap = useMemo(() => new Map(resultados.map((r) => [r.jogo_numero, r])), [resultados])

  const gameMap = useMemo(() => {
    const m = new Map<number, BracketGame>()
    for (const j of jogos) {
      if (j.fase === 'Grupos') continue
      m.set(j.jogo_numero, {
        jogo_numero: j.jogo_numero,
        fase: j.fase,
        pais_a: j.pais_a || null,
        pais_b: j.pais_b || null,
        resultado: resultadoMap.get(j.jogo_numero),
        origem_a: j.origem_a || null,
        origem_b: j.origem_b || null,
        data_hora: j.data_hora,
      })
    }

    // Resolve knockout teams: fill empty pais_a/b from the winner of the origem game
    const sorted = [...m.keys()].sort((a, b) => a - b)
    for (const num of sorted) {
      const g = m.get(num)!
      if (g.origem_a && !g.pais_a) {
        const src = m.get(g.origem_a)
        if (src) {
          const w = getWinnerName(src)
          if (w) g.pais_a = w
        }
      }
      if (g.origem_b && !g.pais_b) {
        const src = m.get(g.origem_b)
        if (src) {
          const w = getWinnerName(src)
          if (w) g.pais_b = w
        }
      }
    }

    return m
  }, [jogos, resultadoMap])

  const bracketData = useMemo(() => {
    if (gameMap.size === 0) return null

    const sf101 = gameMap.get(101)
    const sf102 = gameMap.get(102)
    if (!sf101 || !sf102) return null

    const leftTree = buildTree(sf101, gameMap)
    const rightTree = buildTree(sf102, gameMap)
    const slots = new Map<number, SlotInfo>()

    flattenTree(leftTree, 0, slots, true, 0, TOTAL_LEAVES)
    flattenTree(rightTree, 0, slots, false, 0, TOTAL_LEAVES)

    const final104 = gameMap.get(104)
    if (final104) slots.set(104, { col: 4, row: 2, span: 1 })
    const third103 = gameMap.get(103)
    if (third103) slots.set(103, { col: 4, row: 5, span: 1 })

    return { leftTree, rightTree, slots }
  }, [gameMap])

  const champion = useMemo(() => {
    const finalGame = gameMap.get(104)
    if (!finalGame?.resultado) return null
    return getWinnerName(finalGame)
  }, [gameMap])

  if (!bracketData) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p className="text-3xl mb-2">⚔️</p>
        <p>Bracket ainda não disponível. Complete os jogos de grupos primeiro.</p>
      </div>
    )
  }

  const allSlots = Array.from(bracketData.slots.entries())
  const maxRow = allSlots.length > 0 ? Math.max(...allSlots.map(([_, s]) => s.row)) : 0
  const columnH = Math.max((maxRow + 1) * ROW_H, TOTAL_LEAVES * ROW_H) + 20

  const childToParent = useMemo(() => {
    const map = new Map<number, { parentNum: number; type: 'a' | 'b' }>()
    for (const [num, g] of gameMap) {
      if (g.origem_a) map.set(g.origem_a, { parentNum: num, type: 'a' })
      if (g.origem_b) map.set(g.origem_b, { parentNum: num, type: 'b' })
    }
    return map
  }, [gameMap])

  function ConnectorLine({ dir, top, h, topChild }: { dir: 'l' | 'r'; top: number | string; h: number; topChild: boolean }) {
    const isRight = dir === 'r'
    return (
      <div
        className="absolute pointer-events-none"
        style={{
          [isRight ? 'left' : 'right']: '100%',
          top,
          width: 12,
          height: h,
          overflow: 'visible',
        }}
      >
        <svg width={12} height={h} viewBox={`0 0 12 ${h}`}>
          <path
            d={isRight
              ? (topChild ? `M0,0 H6 V${h}` : `M0,${h} H6 V0`)
              : (topChild ? `M12,0 H6 V${h}` : `M12,${h} H6 V0`)
            }
            stroke="rgb(120 113 108)" strokeWidth="1.5" fill="none"
          />
        </svg>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-6 w-full">
      <div className="w-[90%] mx-auto">
        <div className="flex" style={{ gap: 12 }}>
          {COL_LABELS.map((fase, colIdx) => {
            const isCenter = colIdx === 4

            return (
              <div key={colIdx} className="flex flex-col flex-1 min-w-0">
                {isCenter ? (
                  <div className="text-center pb-2 border-b border-stone-800 mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Final</h3>
                    <h4 className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">3º Lugar</h4>
                  </div>
                ) : (
                  <h3 className="text-xs font-bold uppercase tracking-wider text-center pb-2 border-b border-stone-800 mb-2 text-stone-400">
                    {getFaseLabel(fase)}
                  </h3>
                )}

                <div className="relative overflow-visible" style={{ height: columnH }}>
                  {allSlots
                    .filter(([_, s]) => s.col === colIdx)
                    .map(([num, slot]) => {
                      const g = gameMap.get(num)
                      if (!g) return null
                      const isFinal = num === 104
                      const isThird = num === 103

                      const isChild = childToParent.has(num)
                      const hasChildren = !!(g.origem_a || g.origem_b)

                      // Calculate child connector (toward parent)
                      let childDir: 'l' | 'r' = 'r'
                      let connectorH = 0
                      let isTopChild = false
                      if (isChild) {
                        const ci = childToParent.get(num)!
                        const parentGame = gameMap.get(ci.parentNum)
                        const parentSlot = bracketData.slots.get(ci.parentNum)
                        if (parentSlot) {
                          childDir = parentSlot.col > slot.col ? 'r' : 'l'
                        }
                        const siblingNum = ci.type === 'a'
                          ? parentGame?.origem_b
                          : parentGame?.origem_a
                        const siblingSlot = siblingNum ? bracketData.slots.get(siblingNum) : undefined
                        if (siblingSlot) {
                          const mid = (slot.row + siblingSlot.row) / 2
                          connectorH = Math.abs(mid - slot.row) * ROW_H
                          isTopChild = ci.type === 'a'
                        }
                      }

                      // Parent connectors: pure horizontal lines toward children's column
                      const parentDirs: Set<'l' | 'r'> = new Set()
                      if (hasChildren) {
                        for (const origem of [g.origem_a, g.origem_b]) {
                          if (!origem) continue
                          const childSlot = bracketData.slots.get(origem)
                          if (!childSlot) continue
                          parentDirs.add(childSlot.col < slot.col ? 'l' : 'r')
                        }
                      }

                      return (
                        <div
                          key={num}
                          className="absolute"
                          style={{
                            left: '50%',
                            transform: 'translateX(-50%)',
                            top: slot.row * ROW_H - (isFinal || isThird ? 28 : 26),
                          }}
                        >
                          <div className="relative">
                            {isFinal ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">Grande Final</div>
                                <GameSlot g={g} highlight />
                              </div>
                            ) : isThird ? (
                              <div className="text-center">
                                <div className="text-[10px] text-stone-500 mb-0.5">3º lugar</div>
                                <GameSlot g={g} />
                              </div>
                            ) : (
                              <GameSlot g={g} highlight={getWinner(g) !== null} />
                            )}

                            {/* Parent connector: pure horizontal line toward children's column */}
                            {Array.from(parentDirs).map((d) => (
                              <div
                                key={d}
                                className="absolute pointer-events-none top-1/2 -translate-y-1/2"
                                style={{
                                  [d === 'r' ? 'left' : 'right']: '100%',
                                  width: 12,
                                  height: 1,
                                }}
                              >
                                <svg width="12" height="1" viewBox="0 0 12 1">
                                  <line
                                    x1={d === 'r' ? "0" : "12"}
                                    y1="0.5"
                                    x2={d === 'r' ? "12" : "0"}
                                    y2="0.5"
                                    stroke="rgb(120 113 108)" strokeWidth="1.5"
                                  />
                                </svg>
                              </div>
                            ))}

                            {/* Child connector: L-shaped line toward parent */}
                            {isChild && connectorH > 0 && (
                              <ConnectorLine
                                dir={childDir}
                                top={isTopChild ? '50%' : `calc(50% - ${connectorH}px)`}
                                h={connectorH}
                                topChild={isTopChild}
                              />
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
      </div>

      {champion && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-8 py-6">
            <Trophy className="text-amber-400" size={32} />
            <div>
              <p className="text-xs text-amber-400/80 uppercase tracking-wider font-bold">Campeão</p>
              <p className="text-2xl font-black text-white"><FlagOnly name={champion} /> {champion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}