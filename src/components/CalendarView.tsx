'use client'

import { useMemo, useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Radio, X, Eye } from 'lucide-react'
import type { Jogo, Resultado, Palpite } from '@/types'
import { calcularPontos, calcularPontosMataMata, calcularAcertosConfronto } from '@/types'
import { ScoreBadge } from './ScoreBadge'
import { TeamWithFlag } from '@/lib/countryFlags'
import { getFaseLabel, FASES_ORDER } from '@/lib/excel-parser'
import { GRUPOS } from '@/lib/grupos'
import { GrupoStanding, MelhoresTerceiros } from './GrupoStanding'
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

export function CalendarView({ jogos, resultados, palpites = [] }: { jogos: Jogo[]; resultados: Resultado[]; palpites?: Palpite[] }) {
  const [liveScores, setLiveScores] = useState<Map<number, { gol_a: number; gol_b: number; minuto: number }>>(new Map())
  const [liveGameNumeros, setLiveGameNumeros] = useState<Set<number>>(new Set())
  const [selectedGame, setSelectedGame] = useState<number | null>(null)
  const [showAllFase, setShowAllFase] = useState(false)

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

  const gamesByFaseWithData = useMemo(() => {
    const map = new Map<string, Jogo[]>()
    for (const j of jogos) {
      if (!j.data_hora) continue
      if (!map.has(j.fase)) map.set(j.fase, [])
      map.get(j.fase)!.push(j)
    }
    return map
  }, [jogos])

  const groupGamesSorted = useMemo(() => {
    return (gamesByFaseWithData.get('Grupos') ?? [])
      .sort((a, b) => new Date(a.data_hora!).getTime() - new Date(b.data_hora!).getTime())
  }, [gamesByFaseWithData])

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
      const jDate = new Date(j.data_hora)
      if (isNaN(jDate.getTime())) continue
      if (jDate > now && !resultadoMap.has(j.jogo_numero)) {
        return j.jogo_numero
      }
    }
    return null
  }, [groupGamesSorted, resultadoMap])

  const filteredGamesByDate = useMemo(() => {
    if (showAllFase) return gamesByDate

    if (nextGameNum === null) return gamesByDate

    return gamesByDate
      .map(([key, val]) => {
        const activeGames = val.games.filter((g) => {
          if (liveGameNumeros.has(g.jogo_numero)) return true
          return g.jogo_numero === nextGameNum
        })
        return [key, { ...val, games: activeGames }] as [string, { label: string; games: Jogo[] }]
      })
      .filter(([, val]) => val.games.length > 0)
  }, [gamesByDate, nextGameNum, liveGameNumeros, showAllFase])

  const totalFinished = groupGamesSorted.length - filteredGamesByDate.reduce((acc, [, v]) => acc + v.games.length, 0)

  const liveTeams = useMemo(() => {
    const teams = new Set<string>()
    for (const j of jogos) {
      if (liveGameNumeros.has(j.jogo_numero)) {
        if (j.pais_a) teams.add(j.pais_a)
        if (j.pais_b) teams.add(j.pais_b)
      }
    }
    return teams
  }, [jogos, liveGameNumeros])

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
          <Calendar className="text-emerald-400" size={20} />
          Grupos da Copa
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.keys(GRUPOS).sort().map((letra) => (
            <GrupoStanding
              key={letra}
              grupo={letra}
              jogos={jogos}
              resultados={resultados}
              liveTimes={liveTeams}
            />
          ))}
        </div>
        <MelhoresTerceiros jogos={jogos} resultados={resultados} liveTimes={liveTeams} />
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
                  {showAllFase ? (
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-stone-500">
                        Mostrando todos os {groupGamesSorted.length} jogos
                      </p>
                      <button
                        onClick={() => setShowAllFase(false)}
                        className="text-xs text-stone-500 hover:text-white transition-colors font-medium"
                      >
                        Ocultar encerrados
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-stone-500">
                        Mostrando {filteredGamesByDate.reduce((acc, [, v]) => acc + v.games.length, 0)} jogos
                        {totalFinished > 0 && ` (${totalFinished} antes)`}
                      </p>
                      <button
                        onClick={() => setShowAllFase(true)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                      >
                        Mostrar todos
                      </button>
                    </div>
                  )}
                  {(showAllFase ? gamesByDate : filteredGamesByDate).map(([, { label, games: dayGames }]) => (
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
                              onShowPalpites={() => setSelectedGame(jogo.jogo_numero)}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
      {/* ── Palpites Modal ─────────────────────────────────────────────── */}
      {selectedGame !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setSelectedGame(null)}
        >
          <div
            className={clsx(
              'border rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[80vh] flex flex-col',
              liveScores.has(selectedGame) ? 'bg-stone-900 border-red-600/60 ring-1 ring-red-500/30' : 'bg-stone-900 border-stone-700'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white flex items-center gap-2 flex-wrap">
                {(() => {
                  const j = dbJogoMap.get(selectedGame)
                  return j ? <>Jogo #{selectedGame} — <TeamWithFlag name={j.pais_a} /> × <TeamWithFlag name={j.pais_b} /></> : `Jogo #${selectedGame}`
                })()}
                {liveScores.has(selectedGame) && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-1.5 py-0.5 rounded">
                    <Radio size={8} className="animate-ping" />
                    AO VIVO
                  </span>
                )}
              </h3>
              <button
                onClick={() => setSelectedGame(null)}
                className="p-1 rounded-lg text-stone-500 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {palpites.filter((p) => p.jogo_numero === selectedGame).length === 0 ? (
                <p className="text-stone-500 text-sm text-center py-8">Nenhum palpite para este jogo.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {palpites
                    .filter((p) => p.jogo_numero === selectedGame)
                    .sort((a, b) => a.nome_participante.localeCompare(b.nome_participante))
                    .map((p) => {
                    const resultado = resultadoMap.get(p.jogo_numero)
                    const jogo = dbJogoMap.get(p.jogo_numero)
                    const isKnockout = p.fase !== 'Grupos'
                    const pontos = resultado && isKnockout && jogo
                      ? calcularPontosMataMata(p, resultado, jogo)
                      : resultado
                        ? calcularPontos(p, resultado)
                        : null
                    const confronto = isKnockout && jogo ? calcularAcertosConfronto(p, jogo) : null
                    return (
                      <div
                        key={p.nome_participante}
                        className={clsx(
                          'flex items-center justify-between rounded-xl px-4 py-3 gap-3',
                          liveScores.has(selectedGame)
                            ? 'bg-stone-800 border border-red-800/30'
                            : 'bg-stone-800/50 border border-stone-700/50'
                        )}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-white truncate">
                            {p.nome_participante}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-0.5">
                              <TeamWithFlag name={p.pais_a} />
                              {isKnockout && jogo?.pais_a === p.pais_a ? (
                                <span className="text-green-400 font-bold">✓</span>
                              ) : isKnockout && jogo?.pais_a && jogo.pais_a !== p.pais_a ? (
                                <span className="text-red-400 font-bold">✗</span>
                              ) : null}
                            </span>
                            <span className="text-stone-600">vs</span>
                            <span className="flex items-center gap-0.5">
                              <TeamWithFlag name={p.pais_b} />
                              {isKnockout && jogo?.pais_b === p.pais_b ? (
                                <span className="text-green-400 font-bold">✓</span>
                              ) : isKnockout && jogo?.pais_b && jogo.pais_b !== p.pais_b ? (
                                <span className="text-red-400 font-bold">✗</span>
                              ) : null}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col items-center">
                            <span className="font-mono font-bold text-white text-sm">
                              {p.gol_a} × {p.gol_b}
                            </span>
                            {p.gol_a === p.gol_b && p.penalti_a != null && p.penalti_b != null && (
                              <span className="font-mono text-[10px] text-stone-500">
                                ({p.penalti_a} × {p.penalti_b})
                              </span>
                            )}
                          </div>
                          {pontos !== null && (
                            <ScoreBadge pontos={pontos} size="sm" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

        const resolvedGames = games.map((g) => ({
          ...g,
          db: dbJogoMap.get(g.jogo_numero),
        }))

        const dbGamesWithDate = resolvedGames
          .map(g => g.db)
          .filter((db): db is Jogo => !!db?.data_hora)
          .sort((a, b) => new Date(a.data_hora!).getTime() - new Date(b.data_hora!).getTime())

        if (dbGamesWithDate.length > 0) {
          const dateMap = new Map<string, { label: string; games: Jogo[] }>()
          for (const j of dbGamesWithDate) {
            const key = dateKey(j.data_hora!)
            if (!dateMap.has(key)) {
              const d = new Date(j.data_hora!)
              const label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
              dateMap.set(key, { label, games: [] })
            }
            dateMap.get(key)!.games.push(j)
          }
          const byDate = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b))

          return (
            <div key={fase}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-white">{getFaseLabel(fase)}</h2>
                <div className="flex-1 h-px bg-stone-800" />
                <span className="text-xs text-stone-500">{games.length} jogos</span>
              </div>
              <div className="space-y-6">
                {byDate.map(([, { label, games: dayGames }]) => (
                  <div key={label}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-stone-300 uppercase tracking-wider">{label}</span>
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
                            liveScore={live ?? null}
                            onShowPalpites={() => setSelectedGame(jogo.jogo_numero)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }

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
                    onShowPalpites={g.db ? () => setSelectedGame(g.jogo_numero) : undefined}
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
  onShowPalpites,
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
  onShowPalpites?: () => void
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

      {placeholder ? (
        <div className="text-center py-3">
          <span className="text-stone-600 text-sm">A definir</span>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-semibold text-white text-sm truncate">
              {pais_a ? <TeamWithFlag name={pais_a} /> : <span className="text-stone-500">—</span>}
            </span>
            <span className="text-stone-600 text-xs shrink-0">vs</span>
            <span className="font-semibold text-white text-sm truncate">
              {pais_b ? <TeamWithFlag name={pais_b} /> : <span className="text-stone-500">—</span>}
            </span>
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
            {!isLive && (
              <div className="flex items-center gap-1.5">
                <MapPin size={10} />
                {estadio ? (
                  <span className="truncate">{estadio}</span>
                ) : (
                  <span className="text-stone-600">A definir</span>
                )}
              </div>
            )}
            {isLive && (
              <div className="flex items-center gap-1.5 text-red-400">
                <Radio size={10} className="animate-pulse" />
                <span>AO VIVO</span>
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

      {onShowPalpites && (
        <button
          onClick={(e) => { e.stopPropagation(); onShowPalpites() }}
          className="mt-2 w-full flex items-center justify-center gap-1 text-[11px] font-medium text-stone-500 hover:text-emerald-400 bg-stone-800/50 hover:bg-stone-800 py-1.5 rounded-lg transition-all"
        >
          <Eye size={11} />
          Ver palpites
        </button>
      )}
    </div>
  )
}
