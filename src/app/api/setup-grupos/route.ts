import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { GRUPOS, getGrupoDoJogo } from '@/lib/grupos'
import type { Jogo } from '@/types'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-password')
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: jogos, error: jogosError } = await supabaseAdmin
    .from('jogos')
    .select('*')
    .eq('fase', 'Grupos')

  if (jogosError) {
    return NextResponse.json({ error: jogosError.message }, { status: 500 })
  }

  let updated = 0
  let skipped = 0
  const erros: string[] = []

  for (const jogo of jogos as Jogo[]) {
    const grupo = getGrupoDoJogo(jogo)
    if (!grupo) {
      skipped++
      continue
    }
    if (jogo.grupo === grupo) {
      skipped++
      continue
    }
    const { error: upError } = await supabaseAdmin
      .from('jogos')
      .update({ grupo })
      .eq('jogo_numero', jogo.jogo_numero)
    if (upError) erros.push(`Jogo ${jogo.jogo_numero}: ${upError.message}`)
    else updated++
  }

  return NextResponse.json({
    message: `${updated} jogos atualizados, ${skipped} pulados`,
    totalGrupos: Object.keys(GRUPOS).length,
    timesCadastrados: Object.values(GRUPOS).flat().length,
    updated,
    skipped,
    erros: erros.length > 0 ? erros : undefined,
  })
}
