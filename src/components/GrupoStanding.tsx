'use client'

import type { Jogo, Resultado } from '@/types'
import { GRUPOS } from '@/lib/grupos'
import { TeamWithFlag } from '@/lib/countryFlags'
import clsx from 'clsx'

interface TimeStanding {
  time: string
  pontos: number
  jogos: number
  gp: number
  gc: number
  sg: number
}

function calcularStandings(grupo: string, jogos: Jogo[], resultados: Resultado[]): TimeStanding[] {
  const times = GRUPOS[grupo]
  if (!times) return []

  const stats = new Map<string, TimeStanding>()
  for (const time of times) {
    stats.set(time, { time, pontos: 0, jogos: 0, gp: 0, gc: 0, sg: 0 })
  }

  const resultadoMap = new Map(resultados.map((r) => [r.jogo_numero, r]))

  for (const jogo of jogos) {
    if (jogo.fase !== 'Grupos') continue
    if (jogo.grupo !== grupo) continue

    const resultado = resultadoMap.get(jogo.jogo_numero)
    if (!resultado) continue

    const a = stats.get(jogo.pais_a)
    const b = stats.get(jogo.pais_b)
    if (!a || !b) continue

    a.jogos++
    b.jogos++
    a.gp += resultado.gol_a
    a.gc += resultado.gol_b
    b.gp += resultado.gol_b
    b.gc += resultado.gol_a

    if (resultado.gol_a > resultado.gol_b) {
      a.pontos += 3
    } else if (resultado.gol_a < resultado.gol_b) {
      b.pontos += 3
    } else {
      a.pontos += 1
      b.pontos += 1
    }
  }

  for (const st of stats.values()) {
    st.sg = st.gp - st.gc
  }

  return Array.from(stats.values()).sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.sg !== a.sg) return b.sg - a.sg
    return b.gp - a.gp
  })
}

export function GrupoStanding({
  grupo,
  jogos,
  resultados,
}: {
  grupo: string
  jogos: Jogo[]
  resultados: Resultado[]
}) {
  const tabela = calcularStandings(grupo, jogos, resultados)

  return (
    <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-stone-700/50">
        <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-lg">
          GRUPO {grupo}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-stone-500 border-b border-stone-700/50">
              <th className="text-left px-3 py-2 font-medium">Time</th>
              <th className="text-center px-2 py-2 font-medium">P</th>
              <th className="text-center px-2 py-2 font-medium">J</th>
              <th className="text-center px-2 py-2 font-medium">GP</th>
              <th className="text-center px-2 py-2 font-medium">GC</th>
              <th className="text-center px-3 py-2 font-medium">SG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-700/30">
            {tabela.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-4 text-stone-500">
                  Nenhum jogo com resultado
                </td>
              </tr>
            ) : (
              tabela.map((t, i) => (
                <tr key={t.time} className={clsx(i < 2 && 'bg-emerald-500/5')}>
                  <td className="px-3 py-2 text-white font-medium truncate max-w-40"><TeamWithFlag name={t.time} /></td>
                  <td className="text-center px-2 py-2 font-mono font-bold text-white">{t.pontos}</td>
                  <td className="text-center px-2 py-2 font-mono text-stone-400">{t.jogos}</td>
                  <td className="text-center px-2 py-2 font-mono text-stone-400">{t.gp}</td>
                  <td className="text-center px-2 py-2 font-mono text-stone-400">{t.gc}</td>
                  <td className={clsx(
                    'text-center px-3 py-2 font-mono font-bold',
                    t.sg > 0 ? 'text-emerald-400' : t.sg < 0 ? 'text-red-400' : 'text-stone-400'
                  )}>
                    {t.sg > 0 ? `+${t.sg}` : t.sg}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function MelhoresTerceiros({
  jogos,
  resultados,
}: {
  jogos: Jogo[]
  resultados: Resultado[]
}) {
  const terceiros: TimeStanding[] = []

  for (const grupo of Object.keys(GRUPOS)) {
    const tabela = calcularStandings(grupo, jogos, resultados)
    if (tabela.length >= 3) {
      terceiros.push(tabela[2])
    }
  }

  terceiros.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.sg !== a.sg) return b.sg - a.sg
    return b.gp - a.gp
  })

  if (terceiros.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wider mb-3">
        Melhores Terceiros
      </h3>
      <div className="bg-stone-800/30 border border-stone-700/30 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-stone-500 border-b border-stone-700/50">
              <th className="text-left px-3 py-2 font-medium">Grupo</th>
              <th className="text-left px-3 py-2 font-medium">Time</th>
              <th className="text-center px-2 py-2 font-medium">P</th>
              <th className="text-center px-2 py-2 font-medium">J</th>
              <th className="text-center px-2 py-2 font-medium">GP</th>
              <th className="text-center px-2 py-2 font-medium">GC</th>
              <th className="text-center px-3 py-2 font-medium">SG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-700/30">
            {terceiros.map((t, i) => {
              const grupo = Object.keys(GRUPOS).find((g) => GRUPOS[g].includes(t.time)) ?? ''
              return (
                <tr key={t.time} className={clsx(i < 8 && 'bg-amber-500/5')}>
                  <td className="px-3 py-2 text-emerald-400 font-mono font-bold">{grupo}</td>
                  <td className="px-3 py-2 text-white font-medium"><TeamWithFlag name={t.time} /></td>
                  <td className="text-center px-2 py-2 font-mono font-bold text-white">{t.pontos}</td>
                  <td className="text-center px-2 py-2 font-mono text-stone-400">{t.jogos}</td>
                  <td className="text-center px-2 py-2 font-mono text-stone-400">{t.gp}</td>
                  <td className="text-center px-2 py-2 font-mono text-stone-400">{t.gc}</td>
                  <td className={clsx(
                    'text-center px-3 py-2 font-mono font-bold',
                    t.sg > 0 ? 'text-emerald-400' : t.sg < 0 ? 'text-red-400' : 'text-stone-400'
                  )}>
                    {t.sg > 0 ? `+${t.sg}` : t.sg}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
