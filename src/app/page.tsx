'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Trophy, Radio } from 'lucide-react'
import type { Palpite, Resultado, ParticipanteRanking, Jogo } from '@/types'
import { FASES_ORDER } from '@/lib/excel-parser'
import { RankingTable } from '@/components/RankingTable'
import { PalpitesGrupos } from '@/components/PalpitesGrupos'
import { PalpitesMataMata } from '@/components/PalpitesMataMata'
import { CalendarView } from '@/components/CalendarView'
import { KnockoutBracket } from '@/components/KnockoutBracket'
import { TeamWithFlag, FlagOnly } from '@/lib/countryFlags'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/AuthModal'
import clsx from 'clsx'

type Tab = 'ranking' | 'jogos' | 'mata-mata' | 'palpites'

export default function Home() {
  const [tab, setTab] = useState<Tab>('ranking')
  const [palpites, setPalpites] = useState<Palpite[]>([])
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [ranking, setRanking] = useState<ParticipanteRanking[]>([])
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aoVivoIds, setAoVivoIds] = useState<number[]>([])
  const [liveGames, setLiveGames] = useState<any[]>([])

  const [searchParticipante, setSearchParticipante] = useState('')
  const [faseFiltro, setFaseFiltro] = useState<string>('todas')
  const [participanteFiltro, setParticipanteFiltro] = useState<string>('todos')
  const [positionChanges, setPositionChanges] = useState<Record<string, number>>({})
  const [innerPalpiteTab, setInnerPalpiteTab] = useState<'grupos' | 'matamata'>('grupos')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const baseRankingRef = useRef<ParticipanteRanking[]>([])
  const changesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      const [palpitesRes, jogosRes] = await Promise.all([
        fetch('/api/palpites').then((r) => r.json()),
        fetch('/api/jogos').then((r) => r.json()),
      ])
      if (palpitesRes.error) throw new Error(palpitesRes.error)
      setPalpites(palpitesRes.palpites)
      setResultados(palpitesRes.resultados)
      setJogos(jogosRes)
      setRanking(palpitesRes.ranking)
      setAoVivoIds(palpitesRes.ao_vivo ?? [])

      const aoVivoAtual = palpitesRes.ao_vivo ?? []

      if (isInitial) {
        baseRankingRef.current = palpitesRes.ranking_base ?? palpitesRes.ranking
      }

      // Compare live ranking against the base (non-live) ranking
      if (baseRankingRef.current.length > 0) {
        const changes: Record<string, number> = {}
        const basePos = new Map(baseRankingRef.current.map((r, i) => [r.nome, i]))
        for (let i = 0; i < palpitesRes.ranking.length; i++) {
          const nome = palpitesRes.ranking[i].nome
          const oldIdx = basePos.get(nome)
          if (oldIdx !== undefined && oldIdx !== i) {
            changes[nome] = oldIdx - i
          }
        }
        setPositionChanges(changes)
        if (changesTimerRef.current) clearTimeout(changesTimerRef.current)
        if (Object.keys(changes).length > 0 && aoVivoAtual.length === 0) {
          changesTimerRef.current = setTimeout(() => setPositionChanges({}), 5000)
        }
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
        setLiveGames(data.live ?? [])
        if (data.em_andamento > 0) {
          fetchData()
        }
      } catch {}
    }
    checkLive()
    const interval = setInterval(checkLive, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const participantes = useMemo(
    () => [...new Set(palpites.map((p) => p.nome_participante))].sort(),
    [palpites]
  )

  const palpitesFiltrados = useMemo(() => {
    return palpites.filter((p) => {
      if (participanteFiltro !== 'todos' && p.nome_participante !== participanteFiltro) return false
      if (faseFiltro !== 'todas' && p.fase !== faseFiltro) return false
      if (searchParticipante) {
        const q = searchParticipante.toLowerCase()
        if (
          !String(p.jogo_numero).includes(q) &&
          !p.nome_participante.toLowerCase().includes(q) &&
          !p.fase.toLowerCase().includes(q) &&
          !p.pais_a.toLowerCase().includes(q) &&
          !p.pais_b.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [palpites, participanteFiltro, faseFiltro, searchParticipante])

  const participantesFiltrados = useMemo(() => {
    if (participanteFiltro !== 'todos') return [participanteFiltro]
    const nomes = new Set(palpitesFiltrados.map((p) => p.nome_participante))
    return [...nomes].sort()
  }, [palpitesFiltrados, participanteFiltro])

  const fasesDisponiveis = useMemo(() => {
    const set = new Set(palpites.map((p) => p.fase))
    return Array.from(set).sort((a, b) => (FASES_ORDER[a] ?? 99) - (FASES_ORDER[b] ?? 99))
  }, [palpites])

  const { user, logout } = useAuth()

  const jogosConcluidos = resultados.length
  const totalJogos = palpites.length > 0 ? Math.max(...palpites.map((p) => p.jogo_numero)) : 0

  return (
    <div className="min-h-screen">
      <header className="grass-header border-b border-stone-800/50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl shrink-0">🏆</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-2xl font-black tracking-tight text-white">Bolão Copa do Mundo</h1>
                  {user ? (
                    <div className="flex items-center gap-1.5 sm:hidden">
                      <span className="text-xs text-stone-400 truncate max-w-20">{user.nickname}</span>
                      <button onClick={logout} className="text-xs text-stone-500 hover:text-red-400 transition-colors">sair</button>
                    </div>
                  ) : (
                    <button onClick={() => setAuthModalOpen(true)} className="sm:hidden text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-md font-semibold hover:bg-emerald-500 transition-colors">Entrar</button>
                  )}
                </div>
                <p className="text-stone-400 text-sm">Acompanhe palpites e pontuação em tempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="grid grid-cols-2 gap-2 flex-1 sm:flex sm:gap-3 sm:flex-1">
              {aoVivoIds.length > 0 && (
                <div className="bg-red-950/60 border border-red-800 rounded-xl px-2 py-2 text-center sm:shrink-0">
                  <p className="text-xl sm:text-2xl font-black text-red-400 font-mono flex items-center justify-center gap-1">
                    <Radio size={12} className="animate-ping" />
                    {aoVivoIds.length}
                  </p>
                  <p className="text-xs text-red-400/80">AO VIVO</p>
                </div>
              )}
              <div className="bg-stone-900/60 border border-stone-800 rounded-xl px-2 py-2 text-center sm:shrink-0">
                <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{jogosConcluidos}</p>
                <p className="text-xs text-stone-500">com resultado</p>
              </div>
              <div className="bg-stone-900/60 border border-stone-800 rounded-xl px-2 py-2 text-center sm:shrink-0">
                <p className="text-xl sm:text-2xl font-black text-white font-mono">{totalJogos}</p>
                <p className="text-xs text-stone-500">total jogos</p>
              </div>
              <div className="bg-stone-900/60 border border-stone-800 rounded-xl px-2 py-2 text-center sm:shrink-0">
                <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono">{participantes.length}</p>
                <p className="text-xs text-stone-500">participantes</p>
              </div>
            </div>
              {user ? (
                <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-stone-700">
                  <span className="text-sm text-stone-300">{user.nickname}</span>
                  <button onClick={logout} className="text-xs text-stone-500 hover:text-red-400 transition-colors">sair</button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center pl-4 border-l border-stone-700">
                  <button onClick={() => setAuthModalOpen(true)} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-500 transition-colors">Entrar / Criar Conta</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Desktop tabs */}
        <div className="hidden sm:flex gap-1 bg-stone-900 border border-stone-800 rounded-xl p-1 mb-6 w-fit">
          {(['ranking', 'jogos', 'mata-mata', 'palpites'] as Tab[]).map((t) => {
            const blocked = t === 'mata-mata'
            return (
            <button
              key={t}
              onClick={() => { if (!blocked) setTab(t); setMobileMenuOpen(false) }}
              className={clsx(
                'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                tab === t && 'bg-emerald-600 text-white shadow',
                blocked && 'opacity-40 cursor-not-allowed',
                !blocked && tab !== t && 'text-stone-400 hover:text-white'
              )}
            >
              {t === 'ranking' ? '🏅 Classificação' : t === 'jogos' ? '🏆 A Copa' : t === 'mata-mata' ? '⚔️ Mata Mata' : '📋 Palpites'}
            </button>
            )
          })}
        </div>

        {/* Mobile hamburger */}
        <div className="sm:hidden mb-6">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-between w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm font-semibold text-white"
          >
            <span>
              {tab === 'ranking' ? '🏅 Classificação' : tab === 'jogos' ? '🏆 A Copa' : tab === 'mata-mata' ? '⚔️ Mata Mata' : '📋 Palpites'}
            </span>
            <svg className={`w-5 h-5 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {mobileMenuOpen && (
            <div className="mt-1 bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
              {(['ranking', 'jogos', 'mata-mata', 'palpites'] as Tab[]).map((t) => {
                const blocked = t === 'mata-mata'
                return (
                  <button
                    key={t}
                    onClick={() => { if (!blocked) { setTab(t); setMobileMenuOpen(false) } }}
                    className={clsx(
                      'w-full text-left px-4 py-3 text-sm font-semibold transition-all border-b border-stone-800 last:border-b-0',
                      tab === t && 'bg-emerald-600/20 text-emerald-400',
                      blocked && 'opacity-40 cursor-not-allowed',
                      !blocked && tab !== t && 'text-stone-400 hover:text-white hover:bg-stone-800'
                    )}
                  >
                    {t === 'ranking' ? '🏅 Classificação' : t === 'jogos' ? '🏆 A Copa' : t === 'mata-mata' ? '⚔️ Mata Mata' : '📋 Palpites'}
                  </button>
                )
              })}
            </div>
          )}
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
                  {liveGames.length > 0 && (
                    <span className="text-xs font-normal text-red-400 ml-2 flex items-center gap-2 flex-wrap">
                      <Radio size={10} className="animate-ping" />
                      AO VIVO
                      {liveGames.map((g) => (
                        <span key={g.jogo_numero} className="font-mono bg-red-950/40 border border-red-800/50 px-2 py-0.5 rounded text-red-300 whitespace-nowrap inline-flex items-center gap-0.5 sm:gap-1">
                          <span className="hidden sm:inline"><TeamWithFlag name={g.pais_a} /></span>
                          <FlagOnly name={g.pais_a} />
                          <span className="sm:ml-0">{g.gol_a}×{g.gol_b}</span>
                          <FlagOnly name={g.pais_b} />
                        </span>
                      ))}
                    </span>
                  )}
                </h2>
                <RankingTable ranking={ranking} positionChanges={positionChanges} />
              </div>
            )}

            {tab === 'jogos' && (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                <CalendarView jogos={jogos} resultados={resultados} palpites={palpites} />
              </div>
            )}

            {tab === 'mata-mata' && (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                <KnockoutBracket jogos={jogos} resultados={resultados} />
              </div>
            )}

            {tab === 'palpites' && (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <svg className="w-3.5 h-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Pesquisar..."
                      value={searchParticipante}
                      onChange={(e) => setSearchParticipante(e.target.value)}
                      className="w-full bg-stone-800 border border-stone-700 rounded-lg py-1.5 pl-9 pr-3 text-xs text-stone-200 placeholder-stone-500 outline-none focus:border-emerald-600 transition-colors"
                    />
                  </div>

                  <select
                    value={participanteFiltro}
                    onChange={(e) => setParticipanteFiltro(e.target.value)}
                    className="bg-stone-800 border border-stone-700 rounded-lg py-1.5 px-3 text-xs text-stone-200 outline-none focus:border-emerald-600 transition-colors"
                  >
                    <option value="todos">Participantes</option>
                    {participantes.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  {innerPalpiteTab === 'matamata' && (
                    <select
                      value={faseFiltro}
                      onChange={(e) => setFaseFiltro(e.target.value)}
                      className="bg-stone-800 border border-stone-700 rounded-lg py-1.5 px-3 text-xs text-stone-200 outline-none focus:border-emerald-600 transition-colors"
                    >
                      <option value="todas">Fases</option>
                      {fasesDisponiveis.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-1 bg-stone-800 border border-stone-700 rounded-lg p-0.5 w-fit">
                  {(['grupos', 'matamata'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setInnerPalpiteTab(t); if (t === 'grupos') setFaseFiltro('todas') }}
                      className={clsx(
                        'px-4 py-1.5 rounded-md text-xs font-semibold transition-all',
                        innerPalpiteTab === t ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-white'
                      )}
                    >
                      {t === 'grupos' ? '🏟️ Grupos' : '⚔️ Mata-mata'}
                    </button>
                  ))}
                </div>

                {innerPalpiteTab === 'grupos' ? (
                  <PalpitesGrupos
                    palpites={palpitesFiltrados}
                    resultados={resultados}
                    jogos={jogos}
                    participantes={participantesFiltrados}
                  />
                ) : (
                  <PalpitesMataMata
                    palpites={palpitesFiltrados}
                    resultados={resultados}
                    jogos={jogos}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <footer className="border-t border-stone-800 mt-16 py-6 text-center text-xs text-stone-600">
        {user?.is_admin && (
          <a href="/admin" className="hover:text-stone-400 transition-colors mr-4">
            Área Admin
          </a>
        )}
        {!user?.is_admin && (
          <a href="/admin" className="hover:text-stone-400 transition-colors">
            Área Admin
          </a>
        )}
      </footer>
    </div>
  )
}
