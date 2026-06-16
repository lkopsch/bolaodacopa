import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabase
    .from('jogos')
    .select('*')
    .order('jogo_numero')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-password')
  const bearer = request.headers.get('authorization')
  const cookieToken = request.cookies.get('token')?.value ?? null
  if (!isAdminRequest(authHeader, bearer, cookieToken)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { jogo_numero, grupo, data_hora, estadio } = body

  if (!jogo_numero) {
    return NextResponse.json({ error: 'jogo_numero é obrigatório' }, { status: 400 })
  }

  const updates: Record<string, any> = {}
  if (grupo !== undefined) updates.grupo = grupo || null
  if (data_hora !== undefined) updates.data_hora = data_hora || null
  if (estadio !== undefined) updates.estadio = estadio || null
  if (body.pais_a !== undefined) updates.pais_a = body.pais_a || null
  if (body.pais_b !== undefined) updates.pais_b = body.pais_b || null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('jogos')
    .update(updates)
    .eq('jogo_numero', jogo_numero)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
