'use client'

import { useMemo, useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Radio } from 'lucide-react'
import type { Jogo, Resultado } from '@/types'
import { getFaseLabel, FASES_ORDER } from '@/lib/excel-parser'
import { GRUPOS } from '@/lib/grupos'
import clsx from 'clsx'

const PLAYOFF_GAMES: Record<string, number> = {
  Rodada_32: 16,
  Oitavas: 8,
  Quartas: 4,
  Semi: 2,
  Disputa_Terceiro: 1,
  Final: 1,
}

function formatDateTime(iso: string | null): { date: string; time: string } | null {
  if (!iso) return null
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

export function CalendarView({ jogos, resultados }: { jogos: Jogo[]; resultados: Resultado[] }) {
  const [liveScores, setLiveScores] = useState<Map<number, { gol_a: number; gol_b: number; minuto: number }>>(new Map())
  const [liveGameNumeros, setLiveGameNumeros] = useState<Set<number>>(new Set())

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/live')
        const data = await res.json()
        if (data.live) {
          const map = new Map<number, { gol_a: number; gol_b: number; minuto: number }>()
          const set = new Set<number>()
          for (const g of data.live) {
            set.add(g.jogo_numero)
            map.set(g.jogo_numero, { gol_a: g.gol_a, gol_b: g.gol_b, minuto: g.minuto })
          }
          setLiveScores(map)
          setLiveGameNumeros(set)
        }
      } catch {
        // ignore polling errors
      }
    }
    poll()
    const interval = setInterval(poll, 10000)
    return () => clearInterval(interval)
  }, [])

  const resultadoMap = useMemo(
    () => new Map(resultados.map((r) => [r.jogo_numero, r])),
    [resultados]
  )

  const dbJogoMap = useMemo(
    () => new Map(jogos.map((j) => [j.jogo_numero, j])),
    [jogos]
  )

  const maxDbJogo = jogos.length > 0 ? Math.max(...jogos.map((j) => j.jogo_numero)) : 0

  const phases = useMemo(() => {
    const allPhases = new Map<string, { jogo_numero: number; fase: string }[]>()

    const dbByFase = new Map<string, Jogo[]>()
    for (const j of jogos) {
      if (!dbByFase.has(j.fase)) dbByFase.set(j.fase, [])
      dbByFase.get(j.fase)!.push(j)
    }

    for (const [fase, games] of dbByFase) {
      allPhases.set(fase, games)
    }

    let nextNum = Math.max(maxDbJogo + 1, 73)
    for (const [fase, count] of Object.entries(PLAYOFF_GAMES)) {
      if (allPhases.has(fase)) continue
      const placeholders: { jogo_numero: number; fase: string }[] = []
      for (let i = 0; i < count; i++) {
        placeholders.push({ jogo_numero: nextNum + i, fase })
      }
      nextNum += count
      allPhases.set(fase, placeholders)
    }

    return Array.from(allPhases.entries()).sort(
      (a, b) => (FASES_ORDER[a[0]] ?? 99) - (FASES_ORDER[b[0]] ?? 99)
    )
  }, [jogos, maxDbJogo])

  const groupGamesSorted = useMemo(() => {
    return jogos
      .filter((j) => j.fase === 'Grupos')
      .sort((a, b) => {
        if (!a.data_hora) return 1
        if (!b.data_hora) return -1
        return new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
      })
  }, [jogos])

  function dateKey(iso: string): string {
    const d = new Date(iso)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const gamesByDate = useMemo(() => {
    const map = new Map<string, { label: string; games: Jogo[] }>()
    for (const j of groupGamesSorted) {
      const key = j.data_hora ? dateKey(j.data_hora) : 'sem-data'
      if (!map.has(key)) {
        const d = j.data_hora ? new Date(j.data_hora) : null
        const label = d
          ? d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
          : 'Sem data'
        map.set(key, { label, games: [] })
      }
      map.get(key)!.games.push(j)
    }
    return Array.from(map.entries())
      .filter(([k]) => k !== 'sem-data')
      .sort(([a], [b]) => a.localeCompare(b))
      .concat(Array.from(map.entries()).filter(([k]) => k === 'sem-data'))
  }, [groupGamesSorted])

  const nextGameNum = useMemo(() => {
    const now = new Date()
    for (const j of groupGamesSorted) {
      if (!j.data_hora) continue
      if (new Date(j.data_hora) > now && !resultadoMap.has(j.jogo_numero)) {
        return j.jogo_numero
      }
    }
    return null
  }, [groupGamesSorted, resultadoMap])

  const gruposList = useMemo(
    () => Object.entries(GRUPOS).sort((a, b) => a[0].localeCompare(b[0])),
    []
  )

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
          <Calendar className="text-emerald-400" size={20} />
          Grupos da Copa
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {gruposList.map(([letra, times]) => (
            <div
              key={letra}
              className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-4"
            >
              <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-lg inline-block mb-3">
                GRUPO {letra}
              </span>
              <ul className="space-y-1.5">
                {times.map((time) => (
                  <li key={time} className="text-sm text-white font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
                    {time}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-stone-800" />

      {phases.map(([fase, games]) => {
        if (fase === 'Grupos') {
          return (
            <div key={fase}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-white">Fase de Grupos</h2>
                <div className="flex-1 h-px bg-stone-800" />
                <span className="text-xs text-stone-500">{games.length} jogos</span>
              </div>

              {gamesByDate.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <p className="text-3xl mb-2">📅</p>
                  <p className="text-sm">Nenhum jogo cadastrado. Faça o upload da primeira planilha.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {gamesByDate.map(([, { label, games: dayGames }]) => (
                    <div key={label}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-bold text-stone-300 uppercase tracking-wider">
                          {label}
                        </span>
                        <div className="flex-1 h-px bg-stone-800" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dayGames.map((jogo) => {
                          const dt = formatDateTime(jogo.data_hora)
                          const resultado = resultadoMap.get(jogo.jogo_numero)
                          const live = liveScores.get(jogo.jogo_numero)
                          return (
                            <GameCard
                              key={jogo.jogo_numero}
                              jogo_numero={jogo.jogo_numero}
                              fase={jogo.fase}
                              grupo={jogo.grupo}
                              pais_a={jogo.pais_a}
                              pais_b={jogo.pais_b}
                              dt={dt}
                              estadio={jogo.estadio}
                              resultado={live ? undefined : resultado}
                              isNext={jogo.jogo_numero === nextGameNum}
                              liveScore={live ?? null}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }

        const resolvedGames = games.map((g) => ({
          ...g,
          db: dbJogoMap.get(g.jogo_numero),
        }))

        return (
          <div key={fase}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-white">{getFaseLabel(fase)}</h2>
              <div className="flex-1 h-px bg-stone-800" />
              <span className="text-xs text-stone-500">{games.length} jogos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {resolvedGames.map((g) => {
                const resultado = resultadoMap.get(g.jogo_numero)
                const dt = g.db ? formatDateTime(g.db.data_hora) : null
                const live = liveScores.get(g.jogo_numero)
                return (
                  <GameCard
                    key={g.jogo_numero}
                    jogo_numero={g.jogo_numero}
                    fase={g.fase}
                    pais_a={g.db?.pais_a ?? null}
                    pais_b={g.db?.pais_b ?? null}
                    dt={dt}
                    estadio={g.db?.estadio ?? null}
                    resultado={live ? undefined : resultado}
                    placeholder={!g.db}
                    liveScore={live ?? null}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GameCard({
  jogo_numero,
  fase,
  grupo,
  pais_a,
  pais_b,
  dt,
  estadio,
  resultado,
  placeholder,
  isNext,
  liveScore,
}: {
  jogo_numero: number
  fase: string
  grupo?: string | null
  pais_a: string | null
  pais_b: string | null
  dt: { date: string; time: string } | null
  estadio: string | null
  resultado: Resultado | undefined
  placeholder?: boolean
  isNext?: boolean
  liveScore?: { gol_a: number; gol_b: number; minuto: number } | null
}) {
  const isLive = !!liveScore

  return (
    <div
      className={clsx(
        'bg-stone-900 border rounded-xl p-4 transition-all',
        resultado && !isLive ? 'border-emerald-500/20' : 'border-stone-800',
        isLive && 'border-red-500/40 ring-1 ring-red-500/20',
        isNext && !resultado && !isLive && 'border-amber-500/40 ring-1 ring-amber-500/20'
      )}
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs font-mono text-stone-500 bg-stone-800 px-2 py-0.5 rounded">
          #{jogo_numero}
        </span>
        {grupo && (
          <span className="text-xs text-stone-600">Grupo {grupo}</span>
        )}
        {isLive && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-1.5 py-0.5 rounded animate-pulse">
            <Radio size={8} className="animate-ping" />
            AO VIVO
          </span>
        )}
        {isNext && !resultado && !isLive && (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded">
            PRÓXIMO
          </span>
        )}
      </div>

      {placeholder || !pais_a || !pais_b ? (
        <div className="text-center py-3">
          <span className="text-stone-600 text-sm">A definir</span>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-semibold text-white text-sm truncate">{pais_a}</span>
            <span className="text-stone-600 text-xs shrink-0">vs</span>
            <span className="font-semibold text-white text-sm truncate">{pais_b}</span>
          </div>

          <div className="flex flex-col gap-1 text-xs text-stone-500">
            {dt && !isLive && (
              <div className="flex items-center gap-1.5">
                <Calendar size={10} />
                <span>{dt.date}</span>
                <Clock size={10} className="ml-1" />
                <span>{dt.time}</span>
              </div>
            )}
            {estadio && !isLive && (
              <div className="flex items-center gap-1.5">
                <MapPin size={10} />
                <span className="truncate">{estadio}</span>
              </div>
            )}
            {isLive && (
              <div className="flex items-center gap-1.5 text-red-400">
                <Radio size={10} />
                <span>{liveScore!.minuto}&apos;</span>
              </div>
            )}
          </div>
        </div>
      )}

      {(resultado && !isLive) && (
        <div className="mt-3 pt-3 border-t border-stone-800 text-center">
          <span className="text-emerald-400 font-mono font-bold text-lg">
            {resultado.gol_a} × {resultado.gol_b}
          </span>
          {(resultado.penalti_a != null) && (
            <span className="text-stone-500 text-xs ml-2">
              (pên: {resultado.penalti_a} × {resultado.penalti_b})
            </span>
          )}
        </div>
      )}

      {isLive && (
        <div className="mt-3 pt-3 border-t border-red-800 text-center">
          <span className="text-red-400 font-mono font-bold text-2xl animate-pulse">
            {liveScore!.gol_a} × {liveScore!.gol_b}
          </span>
        </div>
      )}
    </div>
  )
}
