'use client'

import { useState, useEffect, useCallback } from 'react'
import { LogOut, Lock, Radio, Plus, Minus, CheckCircle, AlertCircle, Trophy } from 'lucide-react'
import { TeamWithFlag } from '@/lib/countryFlags'
import clsx from 'clsx'

export default function LiveControlPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [liveGames, setLiveGames] = useState<any[]>([])
  const [endingLive, setEndingLive] = useState<number | null>(null)
  const [cancellingLive, setCancellingLive] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [loading, setLoading] = useState(false)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/live')
      const data = await res.json()
      setLiveGames(data.live ?? [])
    } catch {}
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setAuthed(true)
    setAuthError('')
  }

  useEffect(() => {
    if (!authed) return
    setLoading(true)
    fetchLive().finally(() => setLoading(false))
    const interval = setInterval(fetchLive, 8000)
    return () => clearInterval(interval)
  }, [authed, fetchLive])

  const atualizarLive = useCallback((jogo_numero: number, gol_a: number, gol_b: number) => {
    // Optimistic: atualiza a UI na hora
    setLiveGames((prev) =>
      prev.map((g) =>
        g.jogo_numero === jogo_numero
          ? { ...g, gol_a: Math.max(0, gol_a), gol_b: Math.max(0, gol_b) }
          : g
      )
    )
    // Sincroniza em background
    fetch('/api/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ jogo_numero, gol_a: Math.max(0, gol_a), gol_b: Math.max(0, gol_b) }),
    }).catch(() => {})
  }, [password])

  const finalizarLive = useCallback(async (jogo_numero: number) => {
    setEndingLive(jogo_numero)
    try {
      await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ jogo_numero, action: 'end' }),
      })
      setLiveGames((prev) => prev.filter((g) => g.jogo_numero !== jogo_numero))
      showToast(`Jogo ${jogo_numero} finalizado!`, true)
    } catch {
      showToast('Erro ao finalizar', false)
    }
    setEndingLive(null)
  }, [password])

  const cancelarLive = useCallback(async (jogo_numero: number) => {
    if (!confirm(`Cancelar o jogo ${jogo_numero}? O placar NÃO será salvo.`)) return
    setCancellingLive(jogo_numero)
    try {
      await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ jogo_numero, action: 'cancel' }),
      })
      setLiveGames((prev) => prev.filter((g) => g.jogo_numero !== jogo_numero))
      showToast(`Jogo ${jogo_numero} cancelado`, true)
    } catch {
      showToast('Erro ao cancelar', false)
    }
    setCancellingLive(null)
  }, [password])

  // ─── Login ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0c0c0e] p-4">
        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">
              <Radio size={48} className="inline-block text-red-400 animate-pulse" />
            </div>
            <h1 className="text-xl font-black text-white">Controle ao Vivo</h1>
            <p className="text-stone-500 text-sm mt-1">Bolão Copa do Mundo</p>
            {liveGames.length > 0 && (
              <p className="text-red-400 text-xs mt-2 font-bold">
                {liveGames.length} jogo(s) ao vivo agora
              </p>
            )}
          </div>
          <form onSubmit={handleLogin} className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div>
              <label className="block text-sm text-stone-400 mb-2">Senha de Admin</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white text-base focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              {authError && <p className="text-red-400 text-xs mt-1">{authError}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-base"
            >
              <Lock size={16} />
              Entrar
            </button>
          </form>
          <div className="text-center mt-6">
            <a href="/" className="text-stone-600 hover:text-stone-400 text-sm transition-colors">← Página inicial</a>
            <span className="text-stone-700 mx-2">·</span>
            <a href="/admin" className="text-stone-600 hover:text-stone-400 text-sm transition-colors">Admin completo</a>
          </div>
        </div>
      </div>
    )
  }

  // ─── Dashboard ────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-[#0c0c0e] flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.ok
            ? 'bg-emerald-900 border border-emerald-700 text-emerald-300'
            : 'bg-red-900 border border-red-700 text-red-300'
        )}>
          {toast.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-900/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Radio size={16} className="text-red-400 shrink-0" />
            <h1 className="font-bold text-white text-sm sm:text-base truncate">Controle ao Vivo</h1>
          </div>
          <div className="flex items-center gap-3">
            {liveGames.length > 0 && (
              <span className="text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-2 py-0.5 rounded">
                {liveGames.length} AO VIVO
              </span>
            )}
            <button
              onClick={() => { setAuthed(false); setPassword('') }}
              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-white transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-5">
        {loading && liveGames.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <div className="text-3xl animate-bounce mb-3">⚽</div>
            <p className="text-sm">Carregando jogos ao vivo...</p>
          </div>
        ) : liveGames.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <div className="text-4xl mb-4">📡</div>
            <p className="font-medium text-stone-400">Nenhum jogo ao vivo no momento</p>
            <p className="text-sm mt-2">Os jogos aparecem automaticamente aqui durante a partida.</p>
            <button
              onClick={fetchLive}
              className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm underline"
            >
              Atualizar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-500">
                {liveGames.length} jogo(s) em andamento
              </p>
              <button
                onClick={fetchLive}
                className="text-xs text-stone-600 hover:text-white transition-colors"
              >
                ↻ Atualizar
              </button>
            </div>

            {liveGames.map((g: any) => (
              <div
                key={g.jogo_numero}
                className="bg-stone-900 border border-red-800/40 rounded-2xl p-5 space-y-5"
              >
                {/* Match info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-stone-500 bg-stone-800 px-2 py-0.5 rounded shrink-0">
                      #{g.jogo_numero}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800/50 px-1.5 py-0.5 rounded">
                      <Radio size={6} className="animate-ping" />
                      {g.minuto}&apos;
                    </span>
                  </div>
                  {g.fase !== 'Grupos' && (
                    <span className="text-xs text-stone-500">{g.fase}</span>
                  )}
                </div>

                {/* Teams + Score Controls */}
                <div className="flex items-center justify-between gap-2">
                  {/* Team A */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <p className="font-bold text-white text-sm sm:text-base truncate text-center"><TeamWithFlag name={g.pais_a} /></p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => atualizarLive(g.jogo_numero, g.gol_a - 1, g.gol_b)}
                        disabled={g.gol_a <= 0}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-all disabled:opacity-30 active:scale-95"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white w-10 text-center tabular-nums">
                        {g.gol_a}
                      </span>
                      <button
                        onClick={() => atualizarLive(g.jogo_numero, g.gol_a + 1, g.gol_b)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-all active:scale-95"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <span className="text-stone-600 font-bold text-lg shrink-0">×</span>

                  {/* Team B */}
                  <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <p className="font-bold text-white text-sm sm:text-base truncate text-center"><TeamWithFlag name={g.pais_b} /></p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => atualizarLive(g.jogo_numero, g.gol_a, g.gol_b - 1)}
                        disabled={g.gol_b <= 0}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-all disabled:opacity-30 active:scale-95"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-2xl sm:text-3xl font-black font-mono text-white w-10 text-center tabular-nums">
                        {g.gol_b}
                      </span>
                      <button
                        onClick={() => atualizarLive(g.jogo_numero, g.gol_a, g.gol_b + 1)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-all active:scale-95"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => finalizarLive(g.jogo_numero)}
                    disabled={endingLive === g.jogo_numero}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    {endingLive === g.jogo_numero ? (
                      <span className="animate-pulse">Finalizando...</span>
                    ) : (
                      <>🏁 Finalizar</>
                    )}
                  </button>
                  <button
                    onClick={() => cancelarLive(g.jogo_numero)}
                    disabled={cancellingLive === g.jogo_numero}
                    className="flex items-center justify-center gap-1.5 text-sm px-4 py-3 rounded-xl bg-red-900/50 hover:bg-red-800/50 text-red-400 hover:text-red-300 border border-red-800/50 transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    {cancellingLive === g.jogo_numero ? '...' : '✕'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-4 text-center text-xs text-stone-600">
        <a href="/admin" className="hover:text-stone-400 transition-colors">Admin completo</a>
        <span className="mx-2">·</span>
        <a href="/" className="hover:text-stone-400 transition-colors">Página inicial</a>
      </footer>
    </div>
  )
}
