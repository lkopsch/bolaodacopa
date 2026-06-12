import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('palpites')
    .select('nome_participante')
    .order('nome_participante')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const nomes = [...new Set((data ?? []).map((r: { nome_participante: string }) => r.nome_participante))].sort()
  return NextResponse.json(nomes)
}

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-password')
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const nome = searchParams.get('nome')
  if (!nome) return NextResponse.json({ error: 'nome obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('palpites')
    .delete()
    .eq('nome_participante', nome)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
