'use client'

import { useState, useMemo } from 'react'
import type { Palpite, Resultado, Jogo } from '@/types'
import { calcularPontos, calcularPontosMataMata, descreverPontos, descreverPontosMataMata, calcularAcertosConfronto } from '@/types'
import { TeamWithFlag } from '@/lib/countryFlags'
import { getFaseLabel } from '@/lib/excel-parser'
import clsx from 'clsx'

interface HistoricoViewProps {
  palpites: Palpite[]
  resultados: Resultado[]
  jogos: Jogo[]
}

type GameInfo = {
  jogo_numero: number
  fase: string
  pais_a: string
  pais_b: string
  palpite: Palpite
  resultado?: Resultado
  pontos: number | null
  descricao: string[] | undefined
  runningTotal: number
}

export function HistoricoView({ palpites, resultados, jogos }: HistoricoViewProps) {
  const [selected, setSelected] = useState<string>('')

  const resultadoMap = useMemo(
    () => new Map(resultados.map((r) => [r.jogo_numero, r])),
    [resultados]
  )

  const jogoMap = useMemo(
    () => new Map(jogos.map((j) => [j.jogo_numero, j])),
    [jogos]
  )

  const participantes = useMemo(
    () => [...new Set(palpites.map((p) => p.nome_participante))].sort(),
    [palpites]
  )

  const games = useMemo(() => {
    if (!selected) return []
    const items: GameInfo[] = []
    let runningTotal = 0

    const filtered = palpites
      .filter((p) => p.nome_participante === selected)
      .sort((a, b) => a.jogo_numero - b.jogo_numero)

    for (const p of filtered) {
      const jogo = jogoMap.get(p.jogo_numero)
      if (!jogo) continue

      const resultado = resultadoMap.get(p.jogo_numero)
      const isKnockout = jogo.fase !== 'Grupos'
      let pontos: number | null = null
      let descricao: string[] | undefined = undefined

      if (resultado) {
        if (isKnockout) {
          pontos = calcularPontosMataMata(p, resultado, jogo)
          descricao = descreverPontosMataMata(p, resultado, jogo)
        } else {
          pontos = calcularPontos(p, resultado)
          descricao = descreverPontos(p, resultado)
        }
      } else if (isKnockout) {
        const acertos = calcularAcertosConfronto(p, jogo)
        if (acertos > 0) {
          pontos = acertos * 5
          const times: string[] = []
          if (jogo.pais_a && p.pais_a === jogo.pais_a) times.push(p.pais_a)
          if (jogo.pais_b && p.pais_b === jogo.pais_b) times.push(p.pais_b)
          descricao = times.map((t) => `5pt ${t}`)
        }
      }

      if (pontos !== null) runningTotal += pontos

      items.push({
        jogo_numero: p.jogo_numero,
        fase: jogo.fase,
        pais_a: jogo.pais_a,
        pais_b: jogo.pais_b,
        palpite: p,
        resultado,
        pontos,
        descricao,
        runningTotal,
      })
    }

    return items
  }, [palpites, selected, jogoMap, resultadoMap])

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-stone-400 shrink-0">Participante:</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="bg-stone-800 border border-stone-700 rounded-lg py-1.5 px-3 text-sm text-stone-200 outline-none focus:border-emerald-600 transition-colors"
        >
          <option value="">Selecione...</option>
          {participantes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {!selected && (
        <div className="text-center py-12 text-stone-500">
          <p className="text-3xl mb-2">📜</p>
          <p>Selecione um participante para ver o histórico.</p>
        </div>
      )}

      {selected && games.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          <p>Nenhum palpite encontrado para este participante.</p>
        </div>
      )}

      {selected && games.length > 0 && (
        <div className="space-y-1">
          {games.map((g) => {
            const labelParts: string[] = []
            if (g.descricao) {
              const d = g.descricao.join(', ')
              if (g.pontos === 0) labelParts.push('errou')
              else labelParts.push(d)
            }

            return (
              <div
                key={g.jogo_numero}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-stone-800/40 transition-colors group"
              >
                <span className="text-xs font-mono text-stone-500 shrink-0 w-8">
                  #{g.jogo_numero}
                </span>

                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="truncate text-sm text-stone-300">
                    <TeamWithFlag name={g.pais_a} />
                  </span>
                  <span className="text-stone-600 shrink-0 text-xs">vs</span>
                  <span className="truncate text-sm text-stone-300">
                    <TeamWithFlag name={g.pais_b} />
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-sm font-mono">
                  <span className={clsx(
                    g.resultado ? 'text-emerald-400' : 'text-stone-600'
                  )}>
                    {g.palpite.gol_a}×{g.palpite.gol_b}
                  </span>
                  <span className="text-stone-600 text-[10px]">→</span>
                  <span className={clsx(
                    g.resultado ? 'text-white font-bold' : 'text-stone-600'
                  )}>
                    {g.resultado
                      ? `${g.resultado.gol_a}×${g.resultado.gol_b}`
                      : '?×?'}
                  </span>
                </div>

                {g.pontos !== null ? (
                  <span
                    className={clsx(
                      'shrink-0 text-right cursor-help font-mono text-xs font-bold',
                      g.pontos >= 10 && 'text-amber-300',
                      g.pontos >= 5 && g.pontos < 10 && 'text-emerald-300',
                      g.pontos === 1 && 'text-sky-400',
                      g.pontos === 0 && 'text-stone-500',
                    )}
                    title={labelParts.length > 0 ? labelParts.join('\n') : undefined}
                  >
                    {g.pontos >= 10 && '⚽ '}
                    {g.pontos >= 5 && g.pontos < 10 && '✓ '}
                    {g.pontos === 1 && '❶ '}
                    {g.pontos}pts
                  </span>
                ) : (
                  <span className="shrink-0 text-right text-[10px] text-stone-600">
                    aguardando
                  </span>
                )}

                <span className="shrink-0 text-[10px] text-stone-500 font-mono whitespace-nowrap">
                  {`// Total: ${g.runningTotal}pts`}
                </span>

                <span className="shrink-0 text-[10px] text-stone-600 italic hidden sm:inline">
                  {getFaseLabel(g.fase)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
