'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Trophy, Search, ChevronDown, Calendar } from 'lucide-react'
import type { Palpite, Resultado, ParticipanteRanking, Jogo } from '@/types'
import { getFaseLabel, FASES_ORDER } from '@/lib/excel-parser'
import { RankingTable } from '@/components/RankingTable'
import { MatchCard } from '@/components/MatchCard'
import { CalendarView } from '@/components/CalendarView'
import clsx from 'clsx'

type Tab = 'ranking' | 'palpites' | 'jogos'

export default function Home() {
  const [tab, setTab] = useState<Tab>('ranking')
  const [palpites, setPalpites] = useState<Palpite[]>([])
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [ranking, setRanking] = useState<ParticipanteRanking[]>([])
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchParticipante, setSearchParticipante] = useState('')
  const [faseFiltro, setFaseFiltro] = useState<string>('todas')
  const [participanteFiltro, setParticipanteFiltro] = useState<string>('todos')
  const [positionChanges, setPositionChanges] = useState<Record<string, number>>({})
  const prevRankingRef = useRef<ParticipanteRanking[]>([])

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      const [palpitesRes, jogosRes] = await Promise.all([
        fetch('/api/palpites').then((r) => r.json()),
        fetch('/api/jogos').then((r) => r.json()),
      ])
      if (palpitesRes.error) throw new Error(palpitesRes.error)
      const oldRanking = isInitial ? [] : prevRankingRef.current
      setPalpites(palpitesRes.palpites)
      setResultados(palpitesRes.resultados)
      setJogos(jogosRes)
      setRanking(palpitesRes.ranking)
      prevRankingRef.current = palpitesRes.ranking
      if (!isInitial && oldRanking.length > 0) {
        const changes: Record<string, number> = {}
        const oldPos = new Map(oldRanking.map((r, i) => [r.nome, i]))
        for (let i = 0; i < palpitesRes.ranking.length; i++) {
          const nome = palpitesRes.ranking[i].nome
          const oldIdx = oldPos.get(nome)
          if (oldIdx !== undefined && oldIdx !== i) {
            changes[nome] = oldIdx - i
          }
        }
        setPositionChanges(changes)
        setTimeout(() => setPositionChanges({}), 5000)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  // Live polling for ranking updates
  useEffect(() => {
    const checkLive = async () => {
      try {
        const res = await fetch('/api/live')
        const data = await res.json()
        if (data.em_andamento > 0) {
          fetchData()
        }
      } catch {}
    }
    const interval = setInterval(checkLive, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const resultadoMap = useMemo(
    () => new Map(resultados.map((r) => [r.jogo_numero, r])),
    [resultados]
  )

  const participantes = useMemo(
    () => [...new Set(palpites.map((p) => p.nome_participante))].sort(),
    [palpites]
  )

  const fases = useMemo(
    () =>
      [...new Set(palpites.map((p) => p.fase))].sort(
        (a, b) => (FASES_ORDER[a] ?? 99) - (FASES_ORDER[b] ?? 99)
      ),
    [palpites]
  )

  const palpitesFiltrados = useMemo(() => {
    return palpites.filter((p) => {
      if (participanteFiltro !== 'todos' && p.nome_participante !== participanteFiltro) return false
      if (faseFiltro !== 'todas' && p.fase !== faseFiltro) return false
      if (searchParticipante) {
        const q = searchParticipante.toLowerCase()
        if (
          !p.nome_participante.toLowerCase().includes(q) &&
          !p.pais_a.toLowerCase().includes(q) &&
          !p.pais_b.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [palpites, participanteFiltro, faseFiltro, searchParticipante])

  const palpitesByFase = useMemo(() => {
    const grouped = new Map<string, Palpite[]>()
    for (const p of palpitesFiltrados) {
      if (!grouped.has(p.fase)) grouped.set(p.fase, [])
      grouped.get(p.fase)!.push(p)
    }
    return grouped
  }, [palpitesFiltrados])

  const jogosConcluidos = resultados.length
  const totalJogos = palpites.length > 0 ? Math.max(...palpites.map((p) => p.jogo_numero)) : 0

  return (
    <div className="min-h-screen">
      <header className="grass-header border-b border-stone-800/50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">🏆</span>
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Bolão Copa do Mundo
                </h1>
              </div>
              <p className="text-stone-400 text-sm ml-12">
                Acompanhe palpites e pontuação em tempo real
              </p>
            </div>
            <div className="flex gap-3 text-center">
              <div className="bg-stone-900/60 border border-stone-800 rounded-xl px-4 py-2">
                <p className="text-2xl font-black text-emerald-400 font-mono">{jogosConcluidos}</p>
                <p className="text-xs text-stone-500">com resultado</p>
              </div>
              <div className="bg-stone-900/60 border border-stone-800 rounded-xl px-4 py-2">
                <p className="text-2xl font-black text-white font-mono">{totalJogos}</p>
                <p className="text-xs text-stone-500">total jogos</p>
              </div>
              <div className="bg-stone-900/60 border border-stone-800 rounded-xl px-4 py-2">
                <p className="text-2xl font-black text-amber-400 font-mono">{participantes.length}</p>
                <p className="text-xs text-stone-500">participantes</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-1 bg-stone-900 border border-stone-800 rounded-xl p-1 mb-6 w-fit">
          {(['ranking', 'palpites', 'jogos'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                tab === t ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-white'
              )}
            >
              {t === 'ranking' ? '🏅 Ranking' : t === 'palpites' ? '📋 Palpites' : '🏆 A Copa'}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-20 text-stone-500">
            <div className="text-4xl mb-4 animate-bounce">⚽</div>
            <p>Carregando dados...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-400 font-medium">{error}</p>
            <p className="text-stone-500 text-sm mt-2">Verifique a configuração do Supabase.</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {tab === 'ranking' && (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Trophy className="text-amber-400" size={20} />
                  Classificação Geral
                </h2>
                <RankingTable ranking={ranking} positionChanges={positionChanges} />
              </div>
            )}

            {tab === 'jogos' && (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                <CalendarView jogos={jogos} resultados={resultados} />
              </div>
            )}

            {tab === 'palpites' && (
              <div>
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="relative flex-1 min-w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                    <input
                      type="text"
                      placeholder="Buscar participante ou seleção..."
                      value={searchParticipante}
                      onChange={(e) => setSearchParticipante(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={participanteFiltro}
                      onChange={(e) => setParticipanteFiltro(e.target.value)}
                      className="appearance-none bg-stone-900 border border-stone-700 rounded-lg px-4 py-2 pr-8 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="todos">Todos participantes</option>
                      {participantes.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select
                      value={faseFiltro}
                      onChange={(e) => setFaseFiltro(e.target.value)}
                      className="appearance-none bg-stone-900 border border-stone-700 rounded-lg px-4 py-2 pr-8 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="todas">Todas as fases</option>
                      {fases.map((f) => (
                        <option key={f} value={f}>{getFaseLabel(f)}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                  </div>
                  <span className="self-center text-xs text-stone-500">{palpitesFiltrados.length} palpite(s)</span>
                </div>

                {palpitesFiltrados.length === 0 ? (
                  <div className="text-center py-16 text-stone-500">
                    <p className="text-3xl mb-3">🔍</p>
                    <p>Nenhum palpite encontrado com os filtros aplicados.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Array.from(palpitesByFase.entries()).map(([fase, jogos]) => (
                      <div key={fase}>
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wider">
                            {getFaseLabel(fase)}
                          </h3>
                          <div className="flex-1 h-px bg-stone-800" />
                          <span className="text-xs text-stone-600">{jogos.length} jogos</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {jogos.map((p) => (
                            <MatchCard
                              key={`${p.nome_participante}-${p.jogo_numero}`}
                              palpite={p}
                              resultado={resultadoMap.get(p.jogo_numero)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <footer className="border-t border-stone-800 mt-16 py-6 text-center text-xs text-stone-600">
        <a href="/admin" className="hover:text-stone-400 transition-colors">
          Área Admin
        </a>
      </footer>
    </div>
  )
}
