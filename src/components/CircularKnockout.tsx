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

// Posições extraídas do test.html (ordem: sentido horário do topo)
const POS_RING_1: [number, number][] = [
  [54.953, -0.289], [64.669, 1.644], [73.821, 5.435], [82.057, 10.938],
  [89.062, 17.943], [94.565, 26.179], [98.356, 35.331], [100.289, 45.047],
  [100.289, 54.953], [98.356, 64.669], [94.565, 73.821], [89.062, 82.057],
  [82.057, 89.062], [73.821, 94.565], [64.669, 98.356], [54.953, 100.289],
  [45.047, 100.289], [35.331, 98.356], [26.179, 94.565], [17.943, 89.062],
  [10.938, 82.057], [5.435, 73.821], [1.644, 64.669], [-0.289, 54.953],
  [-0.289, 45.047], [1.644, 35.331], [5.435, 26.179], [10.938, 17.943],
  [17.943, 10.938], [26.179, 5.435], [35.331, 1.644], [45.047, -0.289],
]

const POS_RING_2: [number, number][] = [
  [56.152, 19.074], [67.518, 23.782], [76.218, 32.482], [80.926, 43.848],
  [80.926, 56.152], [76.218, 67.518], [67.518, 76.218], [56.152, 80.926],
  [43.848, 80.926], [32.482, 76.218], [23.782, 67.518], [19.074, 56.152],
  [19.074, 43.848], [23.782, 32.482], [32.482, 23.782], [43.848, 19.074],
]

const POS_RING_3: [number, number][] = [
  [58.623, 29.183], [70.817, 41.377], [70.817, 58.623], [58.623, 70.817],
  [41.377, 70.817], [29.183, 58.623], [29.183, 41.377], [41.377, 29.183],
]

const POS_RING_4: [number, number][] = [
  [59.922, 40.078], [59.922, 59.922], [40.078, 59.922], [40.078, 40.078],
]

const POS_RING_5: [number, number][] = [
  [56.032, 50], [43.968, 50],
]

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

  // Mapeia cada slot para o time que ocupa ele
  const slotData = useMemo(() => {
    const map = new Map<string, { team: string | null; won: boolean; lost: boolean }>()

    const set = (ring: number, slot: number, team: string | null, won: boolean, lost: boolean) => {
      map.set(`${ring}-${slot}`, { team, won, lost })
    }

    // Ordem fixa dos times no anel externo (posições 0-31, sentido horário do topo)
    // Lado direito (posições 0-15): topo → base
    // Lado esquerdo (posições 31-16): topo → base (invertido para ordem horária)
    const R0_TEAMS: (string | null)[] = [
      'Brasil', 'Japão', 'Costa do Marfim', 'Noruega',
      'México', 'Equador', 'Inglaterra', 'Congo',
      'Argentina', 'Cabo Verde', 'Austrália', 'Egito',
      'Suíça', 'Argélia', 'Colômbia', 'Gana',
      'Senegal', 'Bélgica', 'EUA', 'Bósnia',
      'Espanha', 'Áustria', 'Portugal', 'Croácia',
      'Holanda', 'Marrocos', 'Canadá', 'África do Sul',
      'França', 'Suécia', 'Alemanha', 'Paraguai',
    ]

    for (let i = 0; i < 32; i++) {
      set(0, i, R0_TEAMS[i], false, false)
    }

    function findGameByTeams(phase: string, tA: string | null, tB: string | null): BracketGame | undefined {
      if (!tA || !tB) return undefined
      for (const [, g] of gameMap) {
        if (g.fase !== phase) continue
        if ((g.pais_a === tA && g.pais_b === tB) || (g.pais_a === tB && g.pais_b === tA)) return g
      }
      return undefined
    }

    const resolveRound = (fromRing: number, toRing: number, phase: string, pairCount: number) => {
      for (let k = 0; k < pairCount; k++) {
        const tA = map.get(`${fromRing}-${k * 2}`)?.team ?? null
        const tB = map.get(`${fromRing}-${k * 2 + 1}`)?.team ?? null
        const game = findGameByTeams(phase, tA, tB)
        const w = game ? getWinner(game) : null
        const wName = game ? getWinnerName(game) : null

        if (w) {
          set(fromRing, k * 2, tA, w === 'A', w === 'B')
          set(fromRing, k * 2 + 1, tB, w === 'B', w === 'A')
        }

        set(toRing, k, wName, false, false)
      }
    }

    resolveRound(0, 1, 'Rodada_32', 16)
    resolveRound(1, 2, 'Oitavas', 8)
    resolveRound(2, 3, 'Quartas', 4)
    resolveRound(3, 4, 'Semi', 2)

    const tA = map.get('4-0')?.team ?? null
    const tB = map.get('4-1')?.team ?? null
    const finalGame = findGameByTeams('Final', tA, tB)
    const fw = finalGame ? getWinner(finalGame) : null
    if (fw) {
      set(4, 0, tA, fw === 'A', fw === 'B')
      set(4, 1, tB, fw === 'B', fw === 'A')
    }

    return map
  }, [gameMap])

  const champion = useMemo(() => {
    const finalGame = gameMap.get(104)
    if (!finalGame?.resultado) return null
    return getWinnerName(finalGame)
  }, [gameMap])

  function renderSlot(key: string, pos: [number, number], data: { team: string | null; won: boolean; lost: boolean } | undefined, isTeam = false) {
    return (
      <div
        key={key}
        className={clsx(
          'absolute flex items-center justify-center',
          isTeam && 'rounded-full bg-white/[0.06] border border-white/10',
          data?.lost && !data?.won && 'opacity-25',
        )}
        style={{
          left: `${pos[0]}%`,
          top: `${pos[1]}%`,
          width: 28,
          height: 28,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {data?.team ? (
          <FlagOnly name={data.team} />
        ) : (
          <span className={clsx(
            'w-[6px] h-[6px] rounded-full',
            data?.won ? 'bg-emerald-400 shadow-[0_0_4px_#4ade80]' : 'bg-white/30',
          )} />
        )}
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a2e] rounded-2xl p-4">
      <div className="relative w-full max-w-[800px] mx-auto" style={{ aspectRatio: '1/1' }}>
        {/* SVG conector — exatamente igual ao test.html */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          style={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 0.5, fill: 'none', overflow: 'visible' }}
        >
          <line x1="54.953" y1="-0.289" x2="54.022" y2="9.166" />
          <line x1="64.669" y1="1.644" x2="61.911" y2="10.735" />
          <line x1="73.821" y1="5.435" x2="69.342" y2="13.813" />
          <line x1="82.057" y1="10.938" x2="76.030" y2="18.282" />
          <line x1="89.062" y1="17.943" x2="81.718" y2="23.970" />
          <line x1="94.565" y1="26.179" x2="86.187" y2="30.658" />
          <line x1="98.356" y1="35.331" x2="89.265" y2="38.089" />
          <line x1="100.289" y1="45.047" x2="90.834" y2="45.978" />
          <line x1="100.289" y1="54.953" x2="90.834" y2="54.022" />
          <line x1="98.356" y1="64.669" x2="89.265" y2="61.911" />
          <line x1="94.565" y1="73.821" x2="86.187" y2="69.342" />
          <line x1="89.062" y1="82.057" x2="81.718" y2="76.030" />
          <line x1="82.057" y1="89.062" x2="76.030" y2="81.718" />
          <line x1="73.821" y1="94.565" x2="69.342" y2="86.187" />
          <line x1="64.669" y1="98.356" x2="61.911" y2="89.265" />
          <line x1="54.953" y1="100.289" x2="54.022" y2="90.834" />
          <line x1="45.047" y1="100.289" x2="45.978" y2="90.834" />
          <line x1="35.331" y1="98.356" x2="38.089" y2="89.265" />
          <line x1="26.179" y1="94.565" x2="30.658" y2="86.187" />
          <line x1="17.943" y1="89.062" x2="23.970" y2="81.718" />
          <line x1="10.938" y1="82.057" x2="18.282" y2="76.030" />
          <line x1="5.435" y1="73.821" x2="13.813" y2="69.342" />
          <line x1="1.644" y1="64.669" x2="10.735" y2="61.911" />
          <line x1="-0.289" y1="54.953" x2="9.166" y2="54.022" />
          <line x1="-0.289" y1="45.047" x2="9.166" y2="45.978" />
          <line x1="1.644" y1="35.331" x2="10.735" y2="38.089" />
          <line x1="5.435" y1="26.179" x2="13.813" y2="30.658" />
          <line x1="10.938" y1="17.943" x2="18.282" y2="23.970" />
          <line x1="17.943" y1="10.938" x2="23.970" y2="18.282" />
          <line x1="26.179" y1="5.435" x2="30.658" y2="13.813" />
          <line x1="35.331" y1="1.644" x2="38.089" y2="10.735" />
          <line x1="45.047" y1="-0.289" x2="45.978" y2="9.166" />

          <path d="M 54.022 9.166 A 41.032 41.032 0 0 1 61.911 10.735" />
          <path d="M 69.342 13.813 A 41.032 41.032 0 0 1 76.030 18.282" />
          <path d="M 81.718 23.970 A 41.032 41.032 0 0 1 86.187 30.658" />
          <path d="M 89.265 38.089 A 41.032 41.032 0 0 1 90.834 45.978" />
          <path d="M 90.834 54.022 A 41.032 41.032 0 0 1 89.265 61.911" />
          <path d="M 86.187 69.342 A 41.032 41.032 0 0 1 81.718 76.030" />
          <path d="M 76.030 81.718 A 41.032 41.032 0 0 1 69.342 86.187" />
          <path d="M 61.911 89.265 A 41.032 41.032 0 0 1 54.022 90.834" />
          <path d="M 45.978 90.834 A 41.032 41.032 0 0 1 38.089 89.265" />
          <path d="M 30.658 86.187 A 41.032 41.032 0 0 1 23.970 81.718" />
          <path d="M 18.282 76.030 A 41.032 41.032 0 0 1 13.813 69.342" />
          <path d="M 10.735 61.911 A 41.032 41.032 0 0 1 9.166 54.022" />
          <path d="M 9.166 45.978 A 41.032 41.032 0 0 1 10.735 38.089" />
          <path d="M 13.813 30.658 A 41.032 41.032 0 0 1 18.282 23.970" />
          <path d="M 23.970 18.282 A 41.032 41.032 0 0 1 30.658 13.813" />
          <path d="M 38.089 10.735 A 41.032 41.032 0 0 1 45.978 9.166" />

          <line x1="58.005" y1="9.757" x2="56.152" y2="19.074" />
          <line x1="72.796" y1="15.883" x2="67.518" y2="23.782" />
          <line x1="84.117" y1="27.204" x2="76.218" y2="32.482" />
          <line x1="90.243" y1="41.995" x2="80.926" y2="43.848" />
          <line x1="90.243" y1="58.005" x2="80.926" y2="56.152" />
          <line x1="84.117" y1="72.796" x2="76.218" y2="67.518" />
          <line x1="72.796" y1="84.117" x2="67.518" y2="76.218" />
          <line x1="58.005" y1="90.243" x2="56.152" y2="80.926" />
          <line x1="41.995" y1="90.243" x2="43.848" y2="80.926" />
          <line x1="27.204" y1="84.117" x2="32.482" y2="76.218" />
          <line x1="15.883" y1="72.796" x2="23.782" y2="67.518" />
          <line x1="9.757" y1="58.005" x2="19.074" y2="56.152" />
          <line x1="9.757" y1="41.995" x2="19.074" y2="43.848" />
          <line x1="15.883" y1="27.204" x2="23.782" y2="32.482" />
          <line x1="27.204" y1="15.883" x2="32.482" y2="23.782" />
          <line x1="41.995" y1="9.757" x2="43.848" y2="19.074" />

          <path d="M 56.152 19.074 A 31.532 31.532 0 0 1 67.518 23.782" />
          <path d="M 76.218 32.482 A 31.532 31.532 0 0 1 80.926 43.848" />
          <path d="M 80.926 56.152 A 31.532 31.532 0 0 1 76.218 67.518" />
          <path d="M 67.518 76.218 A 31.532 31.532 0 0 1 56.152 80.926" />
          <path d="M 43.848 80.926 A 31.532 31.532 0 0 1 32.482 76.218" />
          <path d="M 23.782 67.518 A 31.532 31.532 0 0 1 19.074 56.152" />
          <path d="M 19.074 43.848 A 31.532 31.532 0 0 1 23.782 32.482" />
          <path d="M 32.482 23.782 A 31.532 31.532 0 0 1 43.848 19.074" />

          <line x1="62.067" y1="20.868" x2="58.623" y2="29.183" />
          <line x1="79.132" y1="37.933" x2="70.817" y2="41.377" />
          <line x1="79.132" y1="62.067" x2="70.817" y2="58.623" />
          <line x1="62.067" y1="79.132" x2="58.623" y2="70.817" />
          <line x1="37.933" y1="79.132" x2="41.377" y2="70.817" />
          <line x1="20.868" y1="62.067" x2="29.183" y2="58.623" />
          <line x1="20.868" y1="37.933" x2="29.183" y2="41.377" />
          <line x1="37.933" y1="20.868" x2="41.377" y2="29.183" />

          <path d="M 58.623 29.183 A 22.532 22.532 0 0 1 70.817 41.377" />
          <path d="M 70.817 58.623 A 22.532 22.532 0 0 1 58.623 70.817" />
          <path d="M 41.377 70.817 A 22.532 22.532 0 0 1 29.183 58.623" />
          <path d="M 29.183 41.377 A 22.532 22.532 0 0 1 41.377 29.183" />

          <line x1="65.932" y1="34.068" x2="59.922" y2="40.078" />
          <line x1="65.932" y1="65.932" x2="59.922" y2="59.922" />
          <line x1="34.068" y1="65.932" x2="40.078" y2="59.922" />
          <line x1="34.068" y1="34.068" x2="40.078" y2="40.078" />

          <path d="M 59.922 40.078 A 14.032 14.032 0 0 1 59.922 59.922" />
          <path d="M 40.078 59.922 A 14.032 14.032 0 0 1 40.078 40.078" />

          <line x1="64.032" y1="50" x2="56.032" y2="50" />
          <line x1="35.968" y1="50" x2="43.968" y2="50" />

          {champion && (
            <text x={50} y={49} textAnchor="middle" dominantBaseline="central" fontSize="6" fill="white" className="select-none">
              🏆
            </text>
          )}
        </svg>

        {/* Anel externo — Rodada de 32 (32 times) */}
        <div className="absolute inset-0">
          {POS_RING_1.map((p, i) => renderSlot(`r0-${i}`, p, slotData.get(`0-${i}`)))}
        </div>

        {/* Anel 2 — Oitavas (16 times) */}
        <div className="absolute inset-0">
          {POS_RING_2.map((p, i) => renderSlot(`r1-${i}`, p, slotData.get(`1-${i}`), true))}
        </div>

        {/* Anel 3 — Quartas (8 times) */}
        <div className="absolute inset-0">
          {POS_RING_3.map((p, i) => renderSlot(`r2-${i}`, p, slotData.get(`2-${i}`), true))}
        </div>

        {/* Anel 4 — Semi (4 times) */}
        <div className="absolute inset-0">
          {POS_RING_4.map((p, i) => renderSlot(`r3-${i}`, p, slotData.get(`3-${i}`), true))}
        </div>

        {/* Anel 5 — Final (2 times) */}
        <div className="absolute inset-0">
          {POS_RING_5.map((p, i) => renderSlot(`r4-${i}`, p, slotData.get(`4-${i}`), true))}
        </div>
      </div>
    </div>
  )
}
