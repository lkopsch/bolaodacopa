import { NextRequest, NextResponse } from 'next/server'
import { parseExcelFile, parseJogosFromExcel } from '@/lib/excel-parser'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
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
    const { participante, palpites } = parseExcelFile(buffer)

    if (palpites.length === 0) {
      return NextResponse.json({ error: 'Nenhum palpite encontrado na planilha' }, { status: 400 })
    }

    // Replace only this participant's palpites (accumulate, not overwrite all)
    const nomeParticipante = palpites[0].nome_participante

    const { error: deleteError } = await supabaseAdmin
      .from('palpites')
      .delete()
      .eq('nome_participante', nomeParticipante)

    if (deleteError) throw deleteError

    const { error: insertError } = await supabaseAdmin.from('palpites').insert(palpites)
    if (insertError) throw insertError

    // Seed jogos table on first upload (group stage only)
    const { count } = await supabaseAdmin
      .from('jogos')
      .select('*', { count: 'exact', head: true })

    if ((count ?? 0) === 0) {
      const jogos = parseJogosFromExcel(buffer)
      if (jogos.length > 0) {
        const { error: jogosError } = await supabaseAdmin.from('jogos').insert(jogos)
        if (jogosError) {
          console.error('Erro ao semear jogos:', jogosError)
          // Non-fatal: palpites were already saved
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${palpites.length} palpites importados para ${participante}`,
      participante,
      total: palpites.length,
    })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message ?? 'Erro ao processar arquivo' }, { status: 500 })
  }
}
