'use client'

import { useMemo } from 'react'
import type { Palpite, Resultado, Jogo } from '@/types'
import { calcularPontosMataMata, calcularAcertosConfronto, descreverPontosMataMata } from '@/types'
import { getFaseLabel } from '@/lib/excel-parser'
import { TeamWithFlag } from '@/lib/countryFlags'
import { ScoreBadge } from './ScoreBadge'
import clsx from 'clsx'

export function PalpitesMataMata({
  palpites,
  resultados,
  jogos,
}: {
  palpites: Palpite[]
  resultados: Resultado[]
  jogos: Jogo[]
}) {
  const resultadoMap = useMemo(
    () => new Map(resultados.map((r) => [r.jogo_numero, r])),
    [resultados]
  )

  const jogoMap = useMemo(
    () => new Map(jogos.map((j) => [j.jogo_numero, j])),
    [jogos]
  )

  const knockoutPalpites = useMemo(() => {
    return palpites
      .filter((p) => p.fase !== 'Grupos')
      .sort((a, b) => {
        if (a.jogo_numero !== b.jogo_numero) return a.jogo_numero - b.jogo_numero
        return a.nome_participante.localeCompare(b.nome_participante)
      })
  }, [palpites])

  const fases = useMemo(() => {
    return [...new Set(knockoutPalpites.map((p) => p.fase))].sort(
      (a, b) => {
        const order: Record<string, number> = { Rodada_32: 1, Oitavas: 2, Quartas: 3, Semi: 4, Disputa_Terceiro: 5, Final: 6 }
        return (order[a] ?? 99) - (order[b] ?? 99)
      }
    )
  }, [knockoutPalpites])

  if (knockoutPalpites.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p className="text-3xl mb-2">⚔️</p>
        <p>Nenhum palpite de mata-mata encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {fases.map((fase) => {
        const palpitesDaFase = knockoutPalpites.filter((p) => p.fase === fase)
        return (
          <div key={fase}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                {getFaseLabel(fase)}
              </h3>
              <div className="flex-1 h-px bg-stone-800" />
              <span className="text-xs text-stone-600">{palpitesDaFase.length} palpites</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-stone-500 uppercase tracking-wider border-b border-stone-800">
                    <th className="text-left pb-2 pr-2 font-medium">#</th>
                    <th className="text-left pb-2 pr-2 font-medium">Participante</th>
                    <th className="text-left pb-2 pr-2 font-medium">Jogo</th>
                    <th className="text-center pb-2 pr-2 font-medium">Palpite</th>
                    <th className="text-center pb-2 pr-2 font-medium">Resultado</th>
                    <th className="text-right pb-2 font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/50">
                  {palpitesDaFase.map((p) => {
                    const resultado = resultadoMap.get(p.jogo_numero)
                    const jogo = jogoMap.get(p.jogo_numero)
                    const pontos = resultado && jogo ? calcularPontosMataMata(p, resultado, jogo) : null
                    const descricao = resultado && jogo ? descreverPontosMataMata(p, resultado, jogo) : undefined
                    const confronto = jogo ? calcularAcertosConfronto(p, jogo) : null
                    return (
                      <tr key={`${p.nome_participante}-${p.jogo_numero}`} className="hover:bg-stone-800/40 transition-colors">
                        <td className="py-2 pr-2 text-stone-500 font-mono">
                          #{p.jogo_numero}
                        </td>
                        <td className="py-2 pr-2 text-stone-300 whitespace-nowrap max-w-24 truncate" title={p.nome_participante}>
                          {p.nome_participante.split(' ')[0]}
                        </td>
                        <td className="py-2 pr-2">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <TeamWithFlag name={p.pais_a} />
                              {jogo?.pais_a === p.pais_a ? (
                                <span className="text-green-400 text-[10px] font-bold">✓</span>
                              ) : jogo?.pais_a && jogo.pais_a !== p.pais_a ? (
                                <span className="text-red-400 text-[10px] font-bold">✗</span>
                              ) : null}
                            </div>
                            <span className="text-stone-600 text-[10px]">vs</span>
                            <div className="flex items-center gap-1">
                              <TeamWithFlag name={p.pais_b} />
                              {jogo?.pais_b === p.pais_b ? (
                                <span className="text-green-400 text-[10px] font-bold">✓</span>
                              ) : jogo?.pais_b && jogo.pais_b !== p.pais_b ? (
                                <span className="text-red-400 text-[10px] font-bold">✗</span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-center">
                          <span className="font-mono font-bold text-white">
                            {p.gol_a} × {p.gol_b}
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-center">
                          {resultado ? (
                            <span className="font-mono font-bold text-emerald-400">
                              {resultado.gol_a} × {resultado.gol_b}
                            </span>
                          ) : (
                            <span className="text-stone-600">—</span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          <ScoreBadge pontos={pontos} size="sm" descricao={descricao} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
