import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, nome_completo, nickname, senha } = await req.json()

    if (!email || !nome_completo || !nickname || !senha) {
      return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 })
    }

    if (senha.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres.' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .or(`email.eq.${email},nickname.eq.${nickname}`)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Email ou nickname já cadastrado.' }, { status: 409 })
    }

    const senha_hash = hashPassword(senha)

    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .insert({ email, nome_completo, nickname, senha_hash })
      .select()
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Erro ao criar conta.' }, { status: 500 })
    }

    const token = signToken({ id: user.id, email: user.email, is_admin: user.is_admin })

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, nome_completo: user.nome_completo, nickname: user.nickname, is_admin: user.is_admin },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
