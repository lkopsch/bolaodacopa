'use client'

import type { ParticipanteRanking } from '@/types'
import clsx from 'clsx'

interface RankingTableProps {
  ranking: ParticipanteRanking[]
  positionChanges?: Record<string, number>
}

const medalhas = ['🥇', '🥈', '🥉']

export function RankingTable({ ranking, positionChanges }: RankingTableProps) {
  if (ranking.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p className="text-4xl mb-3">📊</p>
        <p>Nenhum palpite carregado ainda.</p>
        <p className="text-sm mt-1">Faça upload da planilha para ver o ranking.</p>
      </div>
    )
  }

  const maxPontos = ranking[0]?.pontos_total ?? 0

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-stone-500 uppercase tracking-wider">
            <th className="text-left pb-3 pr-4 font-medium">#</th>
            <th className="text-left pb-3 pr-4 font-medium">Participante</th>
            <th className="text-right pb-3 pr-4 font-medium">Pontos</th>
            <th className="text-right pb-3 pr-4 font-medium hidden sm:table-cell">⚽ Placar</th>
            <th className="text-right pb-3 pr-4 font-medium hidden sm:table-cell">✓ Resultado</th>
            <th className="text-right pb-3 font-medium hidden md:table-cell">Jogos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-800/50">
          {ranking.map((p, i) => {
            const pct = maxPontos > 0 ? (p.pontos_total / maxPontos) * 100 : 0
            return (
              <tr
                key={p.nome}
                className={clsx(
                  'group transition-colors',
                  i === 0 && 'bg-amber-500/5',
                  i > 0 && 'hover:bg-stone-800/40'
                )}
              >
                <td className="py-3 pr-4 text-stone-500 font-mono font-bold w-8">
                  {medalhas[i] ?? <span className="text-stone-600">{i + 1}</span>}
                  {positionChanges && positionChanges[p.nome] !== undefined && positionChanges[p.nome] !== 0 && (
                    <span className={clsx(
                      'text-[10px] ml-0.5',
                      positionChanges[p.nome] < 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {positionChanges[p.nome] < 0 ? '↑' : '↓'}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div>
                    <p className={clsx(
                      'font-semibold',
                      i === 0 ? 'text-amber-300' : 'text-white'
                    )}>
                      {p.nome}
                    </p>
                    {/* Progress bar */}
                    <div className="mt-1 h-1 bg-stone-800 rounded-full overflow-hidden w-32 hidden sm:block">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all',
                          i === 0 ? 'bg-amber-400' : 'bg-emerald-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-right">
                  <span className={clsx(
                    'font-mono font-black text-lg',
                    i === 0 ? 'text-amber-300' : 'text-white'
                  )}>
                    {p.pontos_total}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right hidden sm:table-cell">
                  <span className="text-amber-400 font-mono">{p.acertos_placar}</span>
                </td>
                <td className="py-3 pr-4 text-right hidden sm:table-cell">
                  <span className="text-emerald-400 font-mono">{p.acertos_resultado}</span>
                </td>
                <td className="py-3 text-right hidden md:table-cell">
                  <span className="text-stone-400 font-mono">{p.jogos_palpitados}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-stone-800 flex gap-4 text-xs text-stone-500 flex-wrap">
        <span><span className="text-amber-400">⚽ Placar</span> = placar exato (1+1+5+3 = 10pts)</span>
        <span><span className="text-emerald-400">✓ Resultado</span> = acertou resultado (5pts + lados)</span>
        <span><span className="text-sky-400">❶ Lado</span> = acertou um lado (1pt)</span>
      </div>
    </div>
  )
}
