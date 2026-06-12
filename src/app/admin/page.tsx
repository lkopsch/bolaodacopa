'use client'

import { useState, useEffect, useCallback } from 'react'
import { Upload, Save, Trash2, LogOut, CheckCircle, AlertCircle, Lock, Users, Calendar, RefreshCw, Pencil, X, Plus, Minus, Radio } from 'lucide-react'
import type { Jogo, Resultado } from '@/types'
import clsx from 'clsx'

type AdminTab = 'jogos' | 'participantes'

interface JogoComResultado extends Jogo {
  resultado?: Resultado
}

type EditState = Record<number, { gol_a: string; gol_b: string; penalti_a: string; penalti_b: string }>

function formatDataHora(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [tab, setTab] = useState<AdminTab>('jogos')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Jogos tab state
  const [jogos, setJogos] = useState<JogoComResultado[]>([])
  const [loadingJogos, setLoadingJogos] = useState(false)
  const [edits, setEdits] = useState<EditState>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [fixingGrupos, setFixingGrupos] = useState(false)
  const [editGameNum, setEditGameNum] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ grupo: '', data_hora: '', estadio: '' })
  const [savingGame, setSavingGame] = useState(false)
  const [liveGames, setLiveGames] = useState<any[]>([])
  const [endingLive, setEndingLive] = useState<number | null>(null)

  // Participantes tab state
  const [participantes, setParticipantes] = useState<string[]>([])
  const [loadingParticipantes, setLoadingParticipantes] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [deletingNome, setDeletingNome] = useState<string | null>(null)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchJogos = useCallback(async () => {
    setLoadingJogos(true)
    try {
      const [jogosRes, resultadosRes] = await Promise.all([
        fetch('/api/jogos'),
        fetch('/api/results'),
      ])
      const jogosData: Jogo[] = await jogosRes.json()
      const resultadosData: Resultado[] = await resultadosRes.json()

      const resultadoMap = new Map(resultadosData.map((r) => [r.jogo_numero, r]))

      const merged: JogoComResultado[] = jogosData.map((j) => ({
        ...j,
        resultado: resultadoMap.get(j.jogo_numero),
      }))

      setJogos(merged)

      const initEdits: EditState = {}
      for (const j of merged) {
        const r = j.resultado
        initEdits[j.jogo_numero] = {
          gol_a: r ? String(r.gol_a) : '',
          gol_b: r ? String(r.gol_b) : '',
          penalti_a: r?.penalti_a != null ? String(r.penalti_a) : '',
          penalti_b: r?.penalti_b != null ? String(r.penalti_b) : '',
        }
      }
      setEdits(initEdits)
    } catch {
      showToast('Erro ao carregar jogos', false)
    } finally {
      setLoadingJogos(false)
    }
  }, [])

  const fetchParticipantes = useCallback(async () => {
    setLoadingParticipantes(true)
    try {
      const res = await fetch('/api/participantes')
      const data = await res.json()
      setParticipantes(Array.isArray(data) ? data : [])
    } catch {
      showToast('Erro ao carregar participantes', false)
    } finally {
      setLoadingParticipantes(false)
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchJogos()
    fetchParticipantes()
  }, [authed, fetchJogos, fetchParticipantes])

  // Live polling
  useEffect(() => {
    if (!authed) return
    const poll = async () => {
      try {
        const res = await fetch('/api/live')
        const data = await res.json()
        if (data.live) setLiveGames(data.live)
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 10000)
    return () => clearInterval(interval)
  }, [authed])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setAuthed(true)
    setAuthError('')
  }

  const saveResultado = async (jogoNumero: number) => {
    const edit = edits[jogoNumero]
    if (!edit || edit.gol_a === '' || edit.gol_b === '') {
      showToast('Preencha o placar do jogo', false)
      return
    }
    setSaving(jogoNumero)
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({
          jogo_numero: jogoNumero,
          gol_a: Number(edit.gol_a),
          gol_b: Number(edit.gol_b),
          penalti_a: edit.penalti_a !== '' ? Number(edit.penalti_a) : null,
          penalti_b: edit.penalti_b !== '' ? Number(edit.penalti_b) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) { setAuthed(false); setAuthError('Senha incorreta'); return }
        throw new Error(data.error)
      }
      showToast(`Jogo ${jogoNumero} salvo!`, true)
      await fetchJogos()
    } catch (e: any) {
      showToast(e.message ?? 'Erro ao salvar', false)
    } finally {
      setSaving(null)
    }
  }

  const deleteResultado = async (jogoNumero: number) => {
    if (!confirm(`Remover resultado do jogo ${jogoNumero}?`)) return
    try {
      const res = await fetch(`/api/results?jogo_numero=${jogoNumero}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      })
      if (!res.ok) throw new Error('Erro ao remover')
      showToast(`Resultado do jogo ${jogoNumero} removido`, true)
      await fetchJogos()
    } catch (e: any) {
      showToast(e.message, false)
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadResult(null)
    setUploadError(null)
    try {
      // Parse client-side so we only send JSON (~20KB) instead of the full .xlsm file
      const buffer = await file.arrayBuffer()
      const { parseExcelFile, parseJogosFromExcel } = await import('@/lib/excel-parser')
      const { participante, palpites } = parseExcelFile(buffer)
      const jogos = parseJogosFromExcel(buffer)

      if (palpites.length === 0) {
        throw new Error('Nenhum palpite encontrado na planilha')
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ participante, palpites, jogos }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) { setAuthed(false); setAuthError('Senha incorreta'); return }
        throw new Error(data.error)
      }
      setUploadResult(data.message)
      await Promise.all([fetchParticipantes(), fetchJogos()])
    } catch (e: any) {
      setUploadError(e.message ?? 'Erro ao processar arquivo')
    } finally {
      setUploading(false)
    }
  }

  const deleteParticipante = async (nome: string) => {
    if (!confirm(`Remover todos os palpites de "${nome}"?`)) return
    setDeletingNome(nome)
    try {
      const res = await fetch(`/api/participantes?nome=${encodeURIComponent(nome)}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      })
      if (!res.ok) throw new Error('Erro ao remover participante')
      showToast(`Palpites de ${nome} removidos`, true)
      await fetchParticipantes()
    } catch (e: any) {
      showToast(e.message, false)
    } finally {
      setDeletingNome(null)
    }
  }

  // Group jogos by grupo
  const jogosByGrupo = jogos.reduce((acc, j) => {
    const key = j.grupo ?? 'Outros'
    if (!acc[key]) acc[key] = []
    acc[key].push(j)
    return acc
  }, {} as Record<string, JogoComResultado[]>)

  const gruposOrdenados = Object.keys(jogosByGrupo).sort((a, b) => a.localeCompare(b))
  const totalComResultado = jogos.filter((j) => j.resultado).length

  // ─── Login screen ────────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0c0e]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="text-xl font-black text-white">Área Administrativa</h1>
            <p className="text-stone-500 text-sm mt-1">Bolão Copa do Mundo</p>
          </div>
          <form onSubmit={handleLogin} className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-stone-400 mb-2">Senha de Admin</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              {authError && <p className="text-red-400 text-xs mt-1">{authError}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Lock size={16} />
              Entrar
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ─── Live scoring helpers ─────────────────────────────────────────────────────

  const atualizarLive = useCallback(async (jogo_numero: number, gol_a: number, gol_b: number) => {
    try {
      await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ jogo_numero, gol_a: Math.max(0, gol_a), gol_b: Math.max(0, gol_b) }),
      })
    } catch {}
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
      fetchJogos()
    } catch {}
    setEndingLive(null)
  }, [password, fetchJogos])

  // ─── Admin layout ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0c0c0e]">
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-stone-500 hover:text-white text-sm transition-colors">← Voltar</a>
            <span className="text-stone-700">|</span>
            <h1 className="font-bold text-white">Admin</h1>
          </div>
          <button
            onClick={() => { setAuthed(false); setPassword('') }}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-stone-900 border border-stone-800 rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setTab('jogos')}
            className={clsx(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === 'jogos' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
            )}
          >
            <Calendar size={14} />
            Jogos da Copa
          </button>
          <button
            onClick={() => setTab('participantes')}
            className={clsx(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === 'participantes' ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
            )}
          >
            <Users size={14} />
            Participantes
            {participantes.length > 0 && (
              <span className={clsx(
                'text-xs px-1.5 py-0.5 rounded-full',
                tab === 'participantes' ? 'bg-emerald-500 text-white' : 'bg-stone-700 text-stone-300'
              )}>
                {participantes.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Jogos tab ──────────────────────────────────────────────────────────── */}
        {tab === 'jogos' && (
          <div>
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">Fase de Grupos</h2>
                <p className="text-stone-500 text-sm mt-0.5">
                  {totalComResultado} de {jogos.length} jogos com resultado
                </p>
              </div>
              {jogos.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-40 bg-stone-800 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${jogos.length ? (totalComResultado / jogos.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-500">
                    {jogos.length ? Math.round((totalComResultado / jogos.length) * 100) : 0}%
                  </span>
                </div>
              )}
            </div>

            {jogos.length > 0 && (
              <div className="mb-6 flex items-center gap-3">
                <button
                  onClick={async () => {
                    setFixingGrupos(true)
                    try {
                      const res = await fetch('/api/setup-grupos', {
                        method: 'POST',
                        headers: { 'x-admin-password': password },
                      })
                      const data = await res.json()
                      showToast(data.message, res.ok)
                      if (res.ok) await fetchJogos()
                    } catch {
                      showToast('Erro ao corrigir grupos', false)
                    } finally {
                      setFixingGrupos(false)
                    }
                  }}
                  disabled={fixingGrupos}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-all disabled:opacity-50"
                >
                  <RefreshCw size={12} className={fixingGrupos ? 'animate-spin' : ''} />
                  {fixingGrupos ? 'Corrigindo...' : 'Corrigir grupos'}
                </button>
                <span className="text-xs text-stone-600">
                  Aplica a lista manual de 12 grupos nos jogos da fase de grupos
                </span>
              </div>
            )}

            {liveGames.length > 0 && (
              <div className="bg-stone-900 border border-red-800/50 rounded-xl p-5 space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-red-400">
                  <Radio size={14} className="animate-ping" />
                  AO VIVO ({liveGames.length})
                </h3>
                <div className="grid gap-3">
                  {liveGames.map((g: any) => (
                    <div key={g.jogo_numero} className="bg-stone-800/50 border border-stone-800 rounded-lg p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-stone-500 font-mono shrink-0">#{g.jogo_numero}</span>
                        <span className="text-sm font-medium text-white truncate">{g.pais_a}</span>
                        <span className="text-stone-600 text-xs">vs</span>
                        <span className="text-sm font-medium text-white truncate">{g.pais_b}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => atualizarLive(g.jogo_numero, g.gol_a - 1, g.gol_b)}
                            className="p-1 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 hover:text-white transition-all disabled:opacity-30"
                            disabled={g.gol_a <= 0}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-lg font-bold font-mono text-white w-6 text-center">{g.gol_a}</span>
                          <button
                            onClick={() => atualizarLive(g.jogo_numero, g.gol_a + 1, g.gol_b)}
                            className="p-1 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 hover:text-white transition-all"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <span className="text-stone-600">×</span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => atualizarLive(g.jogo_numero, g.gol_a, g.gol_b - 1)}
                            className="p-1 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 hover:text-white transition-all disabled:opacity-30"
                            disabled={g.gol_b <= 0}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-lg font-bold font-mono text-white w-6 text-center">{g.gol_b}</span>
                          <button
                            onClick={() => atualizarLive(g.jogo_numero, g.gol_a, g.gol_b + 1)}
                            className="p-1 rounded bg-stone-700 hover:bg-stone-600 text-stone-400 hover:text-white transition-all"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <button
                          onClick={() => finalizarLive(g.jogo_numero)}
                          disabled={endingLive === g.jogo_numero}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 border border-emerald-800/50 transition-all disabled:opacity-50"
                        >
                          {endingLive === g.jogo_numero ? '...' : 'Finalizar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingJogos ? (
              <div className="text-center py-16 text-stone-500">
                <div className="text-3xl animate-bounce mb-3">⚽</div>
                <p>Carregando jogos...</p>
              </div>
            ) : jogos.length === 0 ? (
              <div className="text-center py-16 text-stone-500">
                <p className="text-3xl mb-3">📋</p>
                <p className="font-medium text-stone-400">Nenhum jogo cadastrado.</p>
                <p className="text-sm mt-2">O calendário é importado automaticamente na primeira planilha enviada.</p>
                <button
                  onClick={() => setTab('participantes')}
                  className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm underline"
                >
                  Ir para Upload de Planilhas
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {gruposOrdenados.map((grupo) => (
                  <div key={grupo}>
                    {/* Group header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
                          GRUPO {grupo}
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-stone-800" />
                      <span className="text-xs text-stone-600">
                        {jogosByGrupo[grupo].filter((j) => j.resultado).length}/{jogosByGrupo[grupo].length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {jogosByGrupo[grupo].map((jogo) => {
                        const edit = edits[jogo.jogo_numero] ?? { gol_a: '', gol_b: '', penalti_a: '', penalti_b: '' }
                        const temResultado = !!jogo.resultado
                        const isSaving = saving === jogo.jogo_numero

                        return (
                          <div
                            key={jogo.jogo_numero}
                            className={clsx(
                              'flex items-center gap-3 bg-stone-900 border rounded-xl px-4 py-3 flex-wrap',
                              temResultado ? 'border-emerald-500/20' : 'border-stone-800'
                            )}
                          >
                            {/* Match number */}
                            <span className="text-xs font-mono text-stone-500 bg-stone-800 px-2 py-0.5 rounded shrink-0">
                              #{jogo.jogo_numero}
                            </span>

                            {/* Teams */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="font-semibold text-white text-sm truncate">{jogo.pais_a}</span>
                              <span className="text-stone-600 text-xs shrink-0">vs</span>
                              <span className="font-semibold text-white text-sm truncate">{jogo.pais_b}</span>
                            </div>

                            {/* Date + Venue */}
                            {(jogo.data_hora || jogo.estadio) && (
                              <div className="hidden md:flex flex-col text-right shrink-0">
                                {jogo.data_hora && (
                                  <span className="text-xs text-stone-400 font-mono">{formatDataHora(jogo.data_hora)}</span>
                                )}
                                {jogo.estadio && (
                                  <span className="text-xs text-stone-600 truncate max-w-40">{jogo.estadio}</span>
                                )}
                              </div>
                            )}

                            {/* Score inputs */}
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="number"
                                min={0}
                                max={99}
                                placeholder="0"
                                value={edit.gol_a}
                                onChange={(e) =>
                                  setEdits((prev) => ({ ...prev, [jogo.jogo_numero]: { ...edit, gol_a: e.target.value } }))
                                }
                                className="w-12 bg-stone-800 border border-stone-700 rounded-lg px-1 py-1.5 text-center font-mono font-bold text-white focus:outline-none focus:border-emerald-500 text-sm"
                              />
                              <span className="text-stone-600 font-bold text-xs">×</span>
                              <input
                                type="number"
                                min={0}
                                max={99}
                                placeholder="0"
                                value={edit.gol_b}
                                onChange={(e) =>
                                  setEdits((prev) => ({ ...prev, [jogo.jogo_numero]: { ...edit, gol_b: e.target.value } }))
                                }
                                className="w-12 bg-stone-800 border border-stone-700 rounded-lg px-1 py-1.5 text-center font-mono font-bold text-white focus:outline-none focus:border-emerald-500 text-sm"
                              />

                              <button
                                onClick={() => saveResultado(jogo.jogo_numero)}
                                disabled={isSaving}
                                className={clsx(
                                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                                  isSaving
                                    ? 'bg-stone-700 text-stone-500 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                )}
                              >
                                <Save size={12} />
                                {isSaving ? '...' : 'Salvar'}
                              </button>

                              {temResultado && (
                                <>
                                  <button
                                    onClick={() => deleteResultado(jogo.jogo_numero)}
                                    className="p-1.5 rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                    title="Remover resultado"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  <span className="text-emerald-400 text-xs">✓</span>
                                </>
                              )}

                              <button
                                onClick={() => {
                                  const dt = jogo.data_hora ? new Date(jogo.data_hora) : null
                                  setEditForm({
                                    grupo: jogo.grupo ?? '',
                                    data_hora: dt ? dt.toISOString().slice(0, 16) : '',
                                    estadio: jogo.estadio ?? '',
                                  })
                                  setEditGameNum(jogo.jogo_numero)
                                }}
                                className="p-1.5 rounded-lg text-stone-600 hover:text-emerald-400 hover:bg-emerald-950/30 transition-colors"
                                title="Editar jogo"
                              >
                                <Pencil size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Edit Game Modal ─────────────────────────────────────────────────────── */}
        {editGameNum !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white">Editar Jogo #{editGameNum}</h3>
                <button
                  onClick={() => setEditGameNum(null)}
                  className="p-1 rounded-lg text-stone-500 hover:text-white hover:bg-stone-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Grupo</label>
                  <select
                    value={editForm.grupo}
                    onChange={(e) => setEditForm((f) => ({ ...f, grupo: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Sem grupo</option>
                    {'ABCDEFGHIJKL'.split('').map((l) => (
                      <option key={l} value={l}>Grupo {l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Data e Hora</label>
                  <input
                    type="datetime-local"
                    value={editForm.data_hora}
                    onChange={(e) => setEditForm((f) => ({ ...f, data_hora: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1.5">Estádio</label>
                  <input
                    type="text"
                    value={editForm.estadio}
                    onChange={(e) => setEditForm((f) => ({ ...f, estadio: e.target.value }))}
                    placeholder="Ex: Estádio Nacional"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setEditGameNum(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-stone-800 text-stone-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setSavingGame(true)
                    try {
                      const dataHoraISO = editForm.data_hora
                        ? new Date(editForm.data_hora).toISOString()
                        : null
                      const res = await fetch('/api/jogos', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
                        body: JSON.stringify({
                          jogo_numero: editGameNum,
                          grupo: editForm.grupo || null,
                          data_hora: dataHoraISO,
                          estadio: editForm.estadio || null,
                        }),
                      })
                      const data = await res.json()
                      showToast(data.error ?? 'Jogo atualizado!', res.ok)
                      if (res.ok) {
                        setEditGameNum(null)
                        await fetchJogos()
                      }
                    } catch {
                      showToast('Erro ao salvar jogo', false)
                    } finally {
                      setSavingGame(false)
                    }
                  }}
                  disabled={savingGame}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={14} />
                  {savingGame ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Participantes tab ──────────────────────────────────────────────────── */}
        {tab === 'participantes' && (
          <div className="space-y-8">
            {/* Upload area */}
            <div className="max-w-lg">
              <h2 className="text-lg font-bold mb-1 text-white">Adicionar Planilha</h2>
              <p className="text-stone-400 text-sm mb-5">
                Envie a planilha <code className="bg-stone-800 px-1.5 py-0.5 rounded text-emerald-400">.xlsm</code> de
                cada participante. Os palpites são acumulados — cada upload substitui apenas os dados daquele participante.
                {participantes.length === 0 && (
                  <span className="block mt-1 text-amber-400/80">O calendário da fase de grupos será importado automaticamente na primeira planilha.</span>
                )}
              </p>

              <div
                className={clsx(
                  'border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer',
                  dragOver ? 'border-emerald-500 bg-emerald-950/20' : 'border-stone-700 hover:border-stone-600'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const file = e.dataTransfer.files[0]
                  if (file) handleUpload(file)
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xlsm,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload(file)
                    e.target.value = ''
                  }}
                />
                <Upload size={32} className="mx-auto mb-3 text-stone-500" />
                <p className="text-white font-medium">Arraste o arquivo aqui</p>
                <p className="text-stone-500 text-sm mt-1">ou clique para selecionar</p>
                <p className="text-stone-600 text-xs mt-3">.xlsx / .xlsm / .xls</p>
              </div>

              {uploading && (
                <div className="mt-4 text-center text-stone-400 text-sm animate-pulse">
                  ⚽ Processando planilha...
                </div>
              )}
              {uploadResult && (
                <div className="mt-4 bg-emerald-950/50 border border-emerald-700 rounded-xl p-4 text-emerald-300 text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  {uploadResult}
                </div>
              )}
              {uploadError && (
                <div className="mt-4 bg-red-950/50 border border-red-700 rounded-xl p-4 text-red-300 text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {uploadError}
                </div>
              )}
            </div>

            {/* Participants list */}
            <div>
              <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                <Users size={18} className="text-stone-400" />
                Participantes cadastrados
                <span className="text-sm font-normal text-stone-500">({participantes.length})</span>
              </h2>

              {loadingParticipantes ? (
                <p className="text-stone-500 text-sm animate-pulse">Carregando...</p>
              ) : participantes.length === 0 ? (
                <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 text-center text-stone-500">
                  <p className="text-2xl mb-2">📭</p>
                  <p className="text-sm">Nenhum participante ainda. Faça o upload da primeira planilha.</p>
                </div>
              ) : (
                <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                  {participantes.map((nome, i) => (
                    <div
                      key={nome}
                      className={clsx(
                        'flex items-center justify-between px-4 py-3 gap-4',
                        i < participantes.length - 1 && 'border-b border-stone-800'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-xs font-bold text-stone-400 shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-white text-sm font-medium truncate">{nome}</span>
                      </div>
                      <button
                        onClick={() => deleteParticipante(nome)}
                        disabled={deletingNome === nome}
                        className={clsx(
                          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all shrink-0',
                          deletingNome === nome
                            ? 'text-stone-600 cursor-not-allowed'
                            : 'text-stone-500 hover:text-red-400 hover:bg-red-950/30'
                        )}
                      >
                        <Trash2 size={12} />
                        {deletingNome === nome ? '...' : 'Remover'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
