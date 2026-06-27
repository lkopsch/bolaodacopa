'use client'

import type { ParticipanteRanking } from '@/types'
import { AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

interface RankingTableProps {
  ranking: ParticipanteRanking[]
  positionChanges?: Record<string, number>
  mmAtivo?: boolean
}

const medalhas = ['🥇', '🥈', '🥉']

export function RankingTable({ ranking, positionChanges, mmAtivo = false }: RankingTableProps) {
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
            <th className="text-right pb-3 pr-4 font-medium" title="Pontos totais">P</th>
            <th className="text-right pb-3 pr-4 font-medium hidden sm:table-cell" title="Jogos palpitados">J</th>
            <th className="text-right pb-3 pr-4 font-medium hidden sm:table-cell" title="Acertou um lado do placar (1pt)">xG</th>
            <th className="text-right pb-3 pr-4 font-medium hidden sm:table-cell" title="Acertou o resultado (5-6pts)">R</th>
            <th className="text-right pb-3 pr-4 font-medium hidden md:table-cell" title="Resultado exato (10pts)">RE</th>
            <th className="text-right pb-3 font-medium hidden md:table-cell" title={mmAtivo ? 'Acertos de times no Mata-Mata' : 'Aguardando todos os resultados da fase de grupos'}>
              <span className="inline-flex items-center gap-1">
                {!mmAtivo && <AlertTriangle size={12} className="text-amber-400" />}
                <span className={!mmAtivo ? 'text-amber-400/80' : ''}>MM</span>
              </span>
            </th>
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
                  i > 0 && 'hover:bg-stone-800/40',
                  positionChanges && positionChanges[p.nome] !== undefined && positionChanges[p.nome] > 0
                    && 'bg-emerald-500/5',
                  positionChanges && positionChanges[p.nome] !== undefined && positionChanges[p.nome] < 0
                    && 'bg-red-500/5'
                )}
              >
                <td className={clsx(
                  'py-3 pr-4 text-stone-500 font-mono font-bold whitespace-nowrap',
                  positionChanges && positionChanges[p.nome] !== undefined && positionChanges[p.nome] > 0
                    && 'border-l-2 border-emerald-500 pl-4',
                  positionChanges && positionChanges[p.nome] !== undefined && positionChanges[p.nome] < 0
                    && 'border-l-2 border-red-500 pl-4'
                )}>
                  <span className="inline-flex items-center gap-1">
                    {medalhas[i] ?? <span className="text-stone-600">{i + 1}</span>}
                    {positionChanges && positionChanges[p.nome] !== undefined && positionChanges[p.nome] !== 0 && (
                      <span className={clsx(
                        'text-[10px]',
                        positionChanges[p.nome] > 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {positionChanges[p.nome] > 0 ? '↑' : '↓'}
                        {Math.abs(positionChanges[p.nome])}
                      </span>
                    )}
                  </span>
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
                  <span className="text-stone-400 font-mono">{p.jogos_palpitados}</span>
                </td>
                <td className="py-3 pr-4 text-right hidden sm:table-cell">
                  <span className="text-sky-400 font-mono">{p.acertos_um_lado}</span>
                </td>
                <td className="py-3 pr-4 text-right hidden sm:table-cell">
                  <span className="text-emerald-400 font-mono">{p.acertos_resultado}</span>
                </td>
                <td className="py-3 pr-4 text-right hidden md:table-cell">
                  <span className="text-amber-400 font-mono">{p.acertos_placar}</span>
                </td>
                <td className="py-3 pr-4 text-right hidden md:table-cell">
                  <span className={clsx('font-mono', p.mm_acertos > 0 ? 'text-purple-400' : 'text-stone-600')}>{p.mm_acertos}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-stone-800 flex gap-4 text-xs text-stone-500 flex-wrap">
        <span><span className="text-amber-400">RE</span> = resultado exato (10pts)</span>
        <span><span className="text-emerald-400">R</span> = acertou resultado (5-6pts)</span>
        <span><span className="text-sky-400">xG</span> = acertou um lado (1pt)</span>
        {mmAtivo ? (
          <span><span className="text-purple-400">MM</span> = acertos de times no mata-mata (+10pts cada)</span>
        ) : (
          <span><span className="text-amber-400/80"><AlertTriangle size={10} className="inline" /></span> MM = Aguardando resultados dos grupos</span>
        )}
      </div>
    </div>
  )
}
