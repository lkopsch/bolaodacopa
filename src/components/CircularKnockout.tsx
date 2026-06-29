'use client'

import { useMemo } from 'react'
import type { Jogo, Resultado } from '@/types'
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

const RINGS = [
  { count: 32, radiusPct: 47, label: 'Rodada de 32' },
  { count: 16, radiusPct: 37, label: 'Oitavas' },
  { count: 8, radiusPct: 27.5, label: 'Quartas' },
  { count: 4, radiusPct: 18.5, label: 'Semifinais' },
  { count: 2, radiusPct: 10, label: 'Final' },
]

function getSlotPos(ringIndex: number, slotIndex: number) {
  const ring = RINGS[ringIndex]
  const angle = (slotIndex / ring.count) * 2 * Math.PI - Math.PI / 2
  return {
    x: 50 + ring.radiusPct * Math.cos(angle),
    y: 50 + ring.radiusPct * Math.sin(angle),
  }
}

function getRingAngle(ringIndex: number, slotIndex: number) {
  return (slotIndex / RINGS[ringIndex].count) * 2 * Math.PI - Math.PI / 2
}

export function CircularKnockout({ jogos, resultados }: { jogos: Jogo[]; resultados: Resultado[] }) {
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
      })
    }
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

  const slotTeams = useMemo(() => {
    const map = new Map<string, { team: string | null; decided: boolean; won: boolean; lost: boolean }>()

    const addSlot = (ringIndex: number, slotIndex: number, team: string | null, won: boolean, lost: boolean) => {
      map.set(`${ringIndex}-${slotIndex}`, {
        team,
        decided: won || lost,
        won,
        lost,
      })
    }

    for (const [num, game] of gameMap) {
      if (num >= 73 && num <= 88) {
        const i = num - 73
        const winner = getWinner(game)
        addSlot(0, i * 2, game.pais_a, winner === 'A', winner === 'B')
        addSlot(0, i * 2 + 1, game.pais_b, winner === 'B', winner === 'A')
      } else if (num >= 89 && num <= 96) {
        const i = num - 89
        const winner = getWinner(game)
        addSlot(1, i * 2, game.pais_a, winner === 'A', winner === 'B')
        addSlot(1, i * 2 + 1, game.pais_b, winner === 'B', winner === 'A')
      } else if (num >= 97 && num <= 100) {
        const i = num - 97
        const winner = getWinner(game)
        addSlot(2, i * 2, game.pais_a, winner === 'A', winner === 'B')
        addSlot(2, i * 2 + 1, game.pais_b, winner === 'B', winner === 'A')
      } else if (num >= 101 && num <= 102) {
        const i = num - 101
        const winner = getWinner(game)
        addSlot(3, i * 2, game.pais_a, winner === 'A', winner === 'B')
        addSlot(3, i * 2 + 1, game.pais_b, winner === 'B', winner === 'A')
      } else if (num === 104) {
        const winner = getWinner(game)
        addSlot(4, 0, game.pais_a, winner === 'A', winner === 'B')
        addSlot(4, 1, game.pais_b, winner === 'B', winner === 'A')
      }
    }

    return map
  }, [gameMap])

  const champion = useMemo(() => {
    const finalGame = gameMap.get(104)
    if (!finalGame?.resultado) return null
    return getWinnerName(finalGame)
  }, [gameMap])

  const connectorLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = []

    for (let ri = 0; ri < RINGS.length - 1; ri++) {
      const count = RINGS[ri].count
      for (let i = 0; i < count; i++) {
        const from = getSlotPos(ri, i)
        const to = getSlotPos(ri + 1, Math.floor(i / 2))
        lines.push({
          x1: from.x, y1: from.y,
          x2: to.x, y2: to.y,
          key: `conn-${ri}-${i}`,
        })
      }
    }

    return lines
  }, [])

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4">
      <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
        {/* SVG layer: circles + connector lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          {connectorLines.map((l) => (
            <line
              key={l.key}
              x1={l.x1} y1={l.y1}
              x2={l.x2} y2={l.y2}
              stroke="rgb(68, 64, 60)"
              strokeWidth="0.12"
            />
          ))}

          {RINGS.map((ring, ri) => (
            <circle
              key={`ring-${ri}`}
              cx={50}
              cy={50}
              r={ring.radiusPct}
              fill="none"
              stroke="rgb(68, 64, 60)"
              strokeWidth="0.15"
              strokeDasharray={ri === 0 ? 'none' : '1 0.8'}
            />
          ))}

          {/* Ring labels */}
          {RINGS.map((ring, ri) => {
            const labelAngle = -Math.PI / 2
            const lx = 50 + (ring.radiusPct + 2.5) * Math.cos(labelAngle)
            const ly = 50 + (ring.radiusPct + 2.5) * Math.sin(labelAngle)
            return (
              <text
                key={`label-${ri}`}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgb(120, 113, 108)"
                fontSize="1.8"
                fontFamily="ui-monospace, monospace"
                fontWeight="600"
                className="select-none"
              >
                {ring.label}
              </text>
            )
          })}

          {/* Trophy center */}
          {champion && (
            <text
              x={50}
              y={49}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="8"
              className="select-none"
            >
              🏆
            </text>
          )}
        </svg>

        {/* Flags layer */}
        <div className="absolute inset-0">
          {Array.from(slotTeams.entries()).map(([key, data]) => {
            const [ri, si] = key.split('-').map(Number)
            const pos = getSlotPos(ri, si)

            const isDecided = data.decided

            return (
              <div
                key={key}
                className={clsx(
                  'absolute transition-all duration-500',
                  data.lost && 'opacity-25',
                )}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {data.team ? (
                  <div className={clsx(
                    'rounded-full p-1',
                    data.won && 'bg-emerald-500/15 ring-1 ring-emerald-500/40',
                    data.lost && 'bg-transparent',
                    !isDecided && 'bg-stone-800 ring-1 ring-stone-700/50',
                  )}>
                    <FlagOnly name={data.team} />
                  </div>
                ) : (
                  <div className="w-[18px] h-[12px] rounded-full bg-stone-800 border border-dashed border-stone-700" />
                )}
              </div>
            )
          })}

          {/* Champion flag in center */}
          {champion && (
            <div
              className="absolute"
              style={{
                left: '50%',
                top: '56%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="bg-amber-500/15 ring-2 ring-amber-500/40 rounded-full p-1.5">
                <FlagOnly name={champion} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
