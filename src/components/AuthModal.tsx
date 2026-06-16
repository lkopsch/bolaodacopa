'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import clsx from 'clsx'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [nickname, setNickname] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'register' && senha !== confirmSenha) {
      setError('Senhas não conferem.')
      return
    }

    setLoading(true)
    const err = mode === 'login'
      ? await login(email, senha)
      : await register(email, nomeCompleto, nickname, senha)
    setLoading(false)

    if (err) {
      setError(err)
    } else {
      onClose()
      setEmail('')
      setNomeCompleto('')
      setNickname('')
      setSenha('')
      setConfirmSenha('')
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">
            {mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </h2>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-stone-400 block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-emerald-600 transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-emerald-600 transition-colors"
                  placeholder="Seu Nome"
                />
              </div>
              <div>
                <label className="text-xs text-stone-400 block mb-1">Nickname</label>
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-emerald-600 transition-colors"
                  placeholder="apelido"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-stone-400 block mb-1">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-emerald-600 transition-colors"
              placeholder="mínimo 6 caracteres"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-xs text-stone-400 block mb-1">Confirmar Senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmSenha}
                onChange={(e) => setConfirmSenha(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-emerald-600 transition-colors"
                placeholder="repita a senha"
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={clsx(
              'w-full py-2 rounded-lg text-sm font-semibold transition-all',
              loading ? 'bg-stone-700 text-stone-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'
            )}
          >
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-stone-500">
          {mode === 'login' ? (
            <>Não tem conta? <button onClick={switchMode} className="text-emerald-400 hover:underline">Criar Conta</button></>
          ) : (
            <>Já tem conta? <button onClick={switchMode} className="text-emerald-400 hover:underline">Fazer Login</button></>
          )}
        </p>
      </div>
    </div>
  )
}
