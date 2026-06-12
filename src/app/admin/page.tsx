'use client'

import { useState, useEffect, useCallback } from 'react'
import { Upload, Save, Trash2, LogOut, CheckCircle, AlertCircle, Lock } from 'lucide-react'
import type { Palpite, Resultado } from '@/types'
import { getFaseLabel, FASES_ORDER } from '@/lib/excel-parser'
import clsx from 'clsx'

type AdminTab = 'resultados' | 'upload'

interface JogoInfo {
  jogo_numero: number
  fase: string
  pais_a: string
  pais_b: string
  grupo: string | null
  resultado?: Resultado
}

export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [tab, setTab] = useState<AdminTab>('resultados')

  // Resultados state
  const [jogos, setJogos] = useState<JogoInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Result edit state: jogo_numero -> form values
  const [edits, setEdits] = useState<Record<number, { gol_a: string; gol_b: string; penalti_a: string; penalti_b: string }>>({})

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchJogos = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, rRes] = await Promise.all([
        fetch('/api/palpites'),
        fetch('/api/results'),
      ])
      const pData = await pRes.json()
      const resultados: Resultado[] = await rRes.json()

      const resultadoMap = new Map(resultados.map((r) => [r.jogo_numero, r]))

      // Build unique jogo list from palpites
      const jogoMap = new Map<number, JogoInfo>()
      for (const p of pData.palpites as Palpite[]) {
        if (!jogoMap.has(p.jogo_numero)) {
          jogoMap.set(p.jogo_numero, {
            jogo_numero: p.jogo_numero,
            fase: p.fase,
            pais_a: p.pais_a,
            pais_b: p.pais_b,
            grupo: p.grupo,
            resultado: resultadoMap.get(p.jogo_numero),
          })
        }
      }

      const jogoList = Array.from(jogoMap.values()).sort((a, b) => a.jogo_numero - b.jogo_numero)
      setJogos(jogoList)

      // Initialize edits from existing results
      const initEdits: typeof edits = {}
      for (const j of jogoList) {
        const r = j.resultado
        initEdits[j.jogo_numero] = {
          gol_a: r ? String(r.gol_a) : '',
          gol_b: r ? String(r.gol_b) : '',
          penalti_a: r?.penalti_a !== null && r?.penalti_a !== undefined ? String(r.penalti_a) : '',
          penalti_b: r?.penalti_b !== null && r?.penalti_b !== undefined ? String(r.penalti_b) : '',
        }
      }
      setEdits(initEdits)
    } catch (e: any) {
      showToast('Erro ao carregar dados', false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) fetchJogos()
  }, [authed, fetchJogos])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // We'll verify against the server on first protected action
    // For UX, just store the password and try
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
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-admin-password': password },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) { setAuthed(false); setAuthError('Senha incorreta'); return }
        throw new Error(data.error)
      }
      setUploadResult(data.message)
      await fetchJogos()
    } catch (e: any) {
      setUploadError(e.message ?? 'Erro ao processar arquivo')
    } finally {
      setUploading(false)
    }
  }

  // Group jogos by fase
  const jogosByFase = jogos.reduce((acc, j) => {
    if (!acc[j.fase]) acc[j.fase] = []
    acc[j.fase].push(j)
    return acc
  }, {} as Record<string, JogoInfo[]>)

  const fasesOrdenadas = Object.keys(jogosByFase).sort(
    (a, b) => (FASES_ORDER[a] ?? 99) - (FASES_ORDER[b] ?? 99)
  )

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

  return (
    <div className="min-h-screen bg-[#0c0c0e]">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
          toast.ok ? 'bg-emerald-900 border border-emerald-700 text-emerald-300' : 'bg-red-900 border border-red-700 text-red-300'
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
          {(['resultados', 'upload'] as AdminTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                tab === t ? 'bg-emerald-600 text-white' : 'text-stone-400 hover:text-white'
              )}
            >
              {t === 'resultados' ? '⚽ Resultados' : '📁 Upload Planilha'}
            </button>
          ))}
        </div>

        {tab === 'upload' && (
          <div className="max-w-lg">
            <h2 className="text-lg font-bold mb-4 text-white">Upload da Planilha de Palpites</h2>
            <p className="text-stone-400 text-sm mb-6">
              Faça upload do arquivo <code className="bg-stone-800 px-1.5 py-0.5 rounded text-emerald-400">.xlsm</code> do bolão.
              Isso vai <strong className="text-white">substituir todos os palpites</strong> existentes.
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
        )}

        {tab === 'resultados' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Cadastrar Resultados</h2>
                <p className="text-stone-500 text-sm mt-0.5">
                  {jogos.filter((j) => j.resultado).length} de {jogos.length} jogos com resultado
                </p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-stone-500">
                <div className="text-3xl animate-bounce mb-3">⚽</div>
                <p>Carregando jogos...</p>
              </div>
            ) : jogos.length === 0 ? (
              <div className="text-center py-16 text-stone-500">
                <p className="text-3xl mb-3">📋</p>
                <p>Nenhum palpite carregado.</p>
                <button
                  onClick={() => setTab('upload')}
                  className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm underline"
                >
                  Fazer upload da planilha
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {fasesOrdenadas.map((fase) => (
                  <div key={fase}>
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wider">
                        {getFaseLabel(fase)}
                      </h3>
                      <div className="flex-1 h-px bg-stone-800" />
                      <span className="text-xs text-stone-600">
                        {jogosByFase[fase].filter((j) => j.resultado).length}/{jogosByFase[fase].length} concluídos
                      </span>
                    </div>

                    <div className="space-y-2">
                      {jogosByFase[fase].map((jogo) => {
                        const edit = edits[jogo.jogo_numero] ?? { gol_a: '', gol_b: '', penalti_a: '', penalti_b: '' }
                        const temResultado = !!jogo.resultado
                        const isSaving = saving === jogo.jogo_numero

                        return (
                          <div
                            key={jogo.jogo_numero}
                            className={clsx(
                              'flex items-center gap-4 bg-stone-900 border rounded-xl px-4 py-3 flex-wrap',
                              temResultado ? 'border-emerald-500/20' : 'border-stone-800'
                            )}
                          >
                            {/* Jogo info */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs font-mono text-stone-500 bg-stone-800 px-2 py-0.5 rounded shrink-0">
                                #{jogo.jogo_numero}
                              </span>
                              <span className="font-semibold text-white text-sm truncate">
                                {jogo.pais_a}
                              </span>
                              <span className="text-stone-600 text-xs shrink-0">vs</span>
                              <span className="font-semibold text-white text-sm truncate">
                                {jogo.pais_b}
                              </span>
                              {jogo.grupo && (
                                <span className="text-xs text-stone-600 shrink-0">Gr.{jogo.grupo}</span>
                              )}
                            </div>

                            {/* Score inputs */}
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="number"
                                min={0}
                                max={99}
                                placeholder="0"
                                value={edit.gol_a}
                                onChange={(e) =>
                                  setEdits((prev) => ({
                                    ...prev,
                                    [jogo.jogo_numero]: { ...edit, gol_a: e.target.value },
                                  }))
                                }
                                className="w-14 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-center font-mono font-bold text-white focus:outline-none focus:border-emerald-500 text-sm"
                              />
                              <span className="text-stone-600 font-bold">×</span>
                              <input
                                type="number"
                                min={0}
                                max={99}
                                placeholder="0"
                                value={edit.gol_b}
                                onChange={(e) =>
                                  setEdits((prev) => ({
                                    ...prev,
                                    [jogo.jogo_numero]: { ...edit, gol_b: e.target.value },
                                  }))
                                }
                                className="w-14 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-center font-mono font-bold text-white focus:outline-none focus:border-emerald-500 text-sm"
                              />

                              {/* Penalties (shown for knockout phases) */}
                              {['Rodada_32', 'Oitavas', 'Quartas', 'Semi', 'Disputa_Terceiro', 'Final'].includes(jogo.fase) && (
                                <>
                                  <span className="text-stone-600 text-xs">Pên:</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    placeholder="—"
                                    value={edit.penalti_a}
                                    onChange={(e) =>
                                      setEdits((prev) => ({
                                        ...prev,
                                        [jogo.jogo_numero]: { ...edit, penalti_a: e.target.value },
                                      }))
                                    }
                                    className="w-12 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-center font-mono text-white focus:outline-none focus:border-emerald-500 text-sm"
                                  />
                                  <span className="text-stone-600 font-bold text-xs">×</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    placeholder="—"
                                    value={edit.penalti_b}
                                    onChange={(e) =>
                                      setEdits((prev) => ({
                                        ...prev,
                                        [jogo.jogo_numero]: { ...edit, penalti_b: e.target.value },
                                      }))
                                    }
                                    className="w-12 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-center font-mono text-white focus:outline-none focus:border-emerald-500 text-sm"
                                  />
                                </>
                              )}

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
                                <button
                                  onClick={() => deleteResultado(jogo.jogo_numero)}
                                  className="p-1.5 rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                  title="Remover resultado"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}

                              {temResultado && (
                                <span className="text-emerald-400 text-xs">✓</span>
                              )}
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
      </div>
    </div>
  )
}
