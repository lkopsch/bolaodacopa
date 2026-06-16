import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get('token')?.value
    if (!cookieToken) {
      return NextResponse.json({ user: null })
    }

    const payload = verifyToken(cookieToken)
    if (!payload || !payload.id) {
      const res = NextResponse.json({ user: null })
      res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 })
      return res
    }

    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, nome_completo, nickname, is_admin')
      .eq('id', payload.id)
      .single()

    if (error || !user) {
      const res = NextResponse.json({ user: null })
      res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 })
      return res
    }

    return NextResponse.json({ user })
  } catch {
    const res = NextResponse.json({ user: null })
    res.cookies.set('token', '', { httpOnly: true, path: '/', maxAge: 0 })
    return res
  }
}
