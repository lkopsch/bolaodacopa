import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { getGrupoDoJogo } from '@/lib/grupos'

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
  if (authHeader !== process.env.ADMIN_PASSWORD) {
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
