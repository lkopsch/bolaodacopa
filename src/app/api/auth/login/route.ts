import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json()

    if (!email || !senha) {
      return NextResponse.json({ error: 'Preencha email e senha.' }, { status: 400 })
    }

    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Email ou senha inválidos.' }, { status: 401 })
    }

    if (!verifyPassword(senha, user.senha_hash)) {
      return NextResponse.json({ error: 'Email ou senha inválidos.' }, { status: 401 })
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
