import { NextRequest, NextResponse } from 'next/server'
import type { Palpite, Jogo } from '@/types'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-password')
    if (authHeader !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { participante, palpites, jogos } = body as {
      participante: string
      palpites: Palpite[]
      jogos: Omit<Jogo, 'id' | 'created_at'>[]
    }

    if (!palpites?.length) {
      return NextResponse.json({ error: 'Nenhum palpite encontrado' }, { status: 400 })
    }

    const nomeParticipante = palpites[0].nome_participante

    // Replace only this participant's palpites (accumulate, not overwrite all)
    const { error: deleteError } = await supabaseAdmin
      .from('palpites')
      .delete()
      .eq('nome_participante', nomeParticipante)

    if (deleteError) throw deleteError

    const { error: insertError } = await supabaseAdmin.from('palpites').insert(palpites)
    if (insertError) throw insertError

    // Seed jogos table on first upload (group stage only)
    if (jogos?.length > 0) {
      const { count } = await supabaseAdmin
        .from('jogos')
        .select('*', { count: 'exact', head: true })

      if ((count ?? 0) === 0) {
        const { error: jogosError } = await supabaseAdmin.from('jogos').insert(jogos)
        if (jogosError) console.error('Erro ao semear jogos:', jogosError)
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
