'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface User {
  id: number
  email: string
  nome_completo: string
  nickname: string
  is_admin: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, senha: string) => Promise<string | null>
  register: (email: string, nome_completo: string, nickname: string, senha: string) => Promise<string | null>
  logout: () => void
}

const TOKEN_KEY = 'bolao_token'

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) {
      fetch('/api/auth/me', { headers: { authorization: `Bearer ${stored}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user)
            setToken(stored)
          } else {
            localStorage.removeItem(TOKEN_KEY)
          }
        })
        .catch(() => localStorage.removeItem(TOKEN_KEY))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, senha: string): Promise<string | null> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })
    const data = await res.json()
    if (!res.ok) return data.error ?? 'Erro ao fazer login.'
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    setToken(data.token)
    return null
  }, [])

  const register = useCallback(async (email: string, nome_completo: string, nickname: string, senha: string): Promise<string | null> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nome_completo, nickname, senha }),
    })
    const data = await res.json()
    if (!res.ok) return data.error ?? 'Erro ao criar conta.'
    localStorage.setItem(TOKEN_KEY, data.token)
    setUser(data.user)
    setToken(data.token)
    return null
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
