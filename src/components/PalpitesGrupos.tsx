'use client'

import { useMemo } from 'react'
import type { Palpite, Resultado, Jogo } from '@/types'
import { calcularPontos } from '@/types'
import { TeamWithFlag } from '@/lib/countryFlags'
import { ScoreBadge } from './ScoreBadge'
import clsx from 'clsx'

export function PalpitesGrupos({
  palpites,
  resultados,
  jogos,
  participantes,
}: {
  palpites: Palpite[]
  resultados: Resultado[]
  jogos: Jogo[]
  participantes: string[]
}) {
  const resultadoMap = useMemo(
    () => new Map(resultados.map((r) => [r.jogo_numero, r])),
    [resultados]
  )

  const jogosGrupos = useMemo(
    () => jogos.filter((j) => j.fase === 'Grupos').sort((a, b) => a.jogo_numero - b.jogo_numero),
    [jogos]
  )

  const palpitesPorJogo = useMemo(() => {
    const map = new Map<number, Map<string, Palpite>>()
    for (const p of palpites) {
      if (p.fase !== 'Grupos') continue
      if (!map.has(p.jogo_numero)) map.set(p.jogo_numero, new Map())
      map.get(p.jogo_numero)!.set(p.nome_participante, p)
    }
    return map
  }, [palpites])

  if (jogosGrupos.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p className="text-3xl mb-2">📋</p>
        <p>Nenhum jogo de grupos cadastrado.</p>
      </div>
    )
  }

  const participantesOrdenados = [...participantes].sort()

  // Precompute max column width based on first name
  const colWidth = useMemo(() => {
    let max = 60
    for (const nome of participantesOrdenados) {
      const first = nome.split(' ')[0]
      max = Math.max(max, first.length * 8 + 16)
    }
    return Math.min(max, 120)
  }, [participantesOrdenados])

  return (
    <div className="overflow-x-auto" style={{ maxHeight: '75vh' }}>
      <table className="w-full text-xs" style={{ minWidth: 600 }}>
        <thead className="sticky top-0 bg-stone-900 z-10">
          <tr className="text-stone-500 uppercase tracking-wider border-b border-stone-800">
            <th className="text-left pb-2 pr-2 font-medium whitespace-nowrap sticky left-0 bg-stone-900 z-20" style={{ minWidth: 60 }}>#</th>
            <th className="text-left pb-2 pr-2 font-medium whitespace-nowrap sticky left-0 bg-stone-900 z-20" style={{ minWidth: 140, left: 40 }}>Jogo</th>
            <th className="text-center pb-2 pr-2 font-medium whitespace-nowrap" style={{ minWidth: 60 }}>Res</th>
            {participantesOrdenados.map((nome) => {
              const first = nome.split(' ')[0]
              return (
                <th key={nome} className="text-center pb-2 px-1 font-medium whitespace-nowrap" title={nome} style={{ minWidth: colWidth, width: colWidth, maxWidth: colWidth }}>
                  <span className="text-[10px] truncate block">{first}</span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-800/50">
          {jogosGrupos.map((jogo) => {
            const resultado = resultadoMap.get(jogo.jogo_numero)
            const palpitesDoJogo = palpitesPorJogo.get(jogo.jogo_numero) ?? new Map()

            return (
              <tr key={jogo.jogo_numero} className="hover:bg-stone-800/40 transition-colors">
                <td className="py-1 pr-2 text-stone-500 font-mono align-top sticky left-0 bg-stone-900 z-10">
                  #{jogo.jogo_numero}
                </td>
                <td className="py-1 pr-2 align-top sticky left-0 bg-stone-900 z-10" style={{ left: 40 }}>
                  <div className="flex flex-col gap-0 leading-tight">
                    <span className="font-semibold text-white text-[11px]">
                      <TeamWithFlag name={jogo.pais_a} />
                    </span>
                    <span className="text-stone-600 text-[10px]">vs</span>
                    <span className="font-semibold text-white text-[11px]">
                      <TeamWithFlag name={jogo.pais_b} />
                    </span>
                  </div>
                </td>
                <td className="py-1 pr-2 text-center align-top">
                  {resultado ? (
                    <span className="font-mono font-bold text-emerald-400 text-[11px]">
                      {resultado.gol_a} × {resultado.gol_b}
                    </span>
                  ) : (
                    <span className="text-stone-600">—</span>
                  )}
                </td>
                {participantesOrdenados.map((nome) => {
                  const palpite = palpitesDoJogo.get(nome)
                  const pontos = palpite && resultado ? calcularPontos(palpite, resultado) : null
                  return (
                    <td key={nome} className="py-1 px-1 text-center align-top" style={{ minWidth: colWidth, width: colWidth, maxWidth: colWidth }}>
                      {palpite ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono font-bold text-white text-[11px] leading-tight">
                            {palpite.gol_a}×{palpite.gol_b}
                          </span>
                          {pontos !== null && (
                            <ScoreBadge pontos={pontos} size="sm" />
                          )}
                          {pontos === null && (
                            <span className="text-transparent text-[10px] leading-none">—</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-stone-700 text-[11px]">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
