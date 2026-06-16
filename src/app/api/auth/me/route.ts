import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ user: null })
    }

    const payload = verifyToken(auth.slice(7))
    if (!payload || !payload.id) {
      return NextResponse.json({ user: null })
    }

    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, email, nome_completo, nickname, is_admin')
      .eq('id', payload.id)
      .single()

    if (error || !user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ user: null })
  }
}
