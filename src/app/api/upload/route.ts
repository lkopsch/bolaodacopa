import { NextRequest, NextResponse } from 'next/server'
import { parseExcelFile } from '@/lib/excel-parser'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const authHeader = request.headers.get('x-admin-password')
    if (authHeader !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xlsm', 'xls'].includes(ext ?? '')) {
      return NextResponse.json({ error: 'Formato inválido. Use .xlsx, .xlsm ou .xls' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const { palpites, participantes } = parseExcelFile(buffer)

    if (palpites.length === 0) {
      return NextResponse.json({ error: 'Nenhum palpite encontrado na planilha' }, { status: 400 })
    }

    // Clear existing palpites and insert new ones
    const { error: deleteError } = await supabaseAdmin.from('palpites').delete().neq('id', 0)
    if (deleteError) throw deleteError

    const { error: insertError } = await supabaseAdmin.from('palpites').insert(palpites)
    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      message: `${palpites.length} palpites importados de ${participantes.length} participante(s)`,
      participantes,
      total: palpites.length,
    })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message ?? 'Erro ao processar arquivo' }, { status: 500 })
  }
}
