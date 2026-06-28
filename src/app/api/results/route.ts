import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/auth'
import { advanceWinner } from '@/lib/knockout-resolve'

export async function GET() {
  const { data, error } = await supabase
    .from('resultados')
    .select('*')
    .order('jogo_numero')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-admin-password')
    const bearer = request.headers.get('authorization')
    const cookieToken = request.cookies.get('token')?.value ?? null
    if (!isAdminRequest(authHeader, bearer, cookieToken)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { jogo_numero, gol_a, gol_b, penalti_a, penalti_b } = body

    if (jogo_numero === undefined || gol_a === undefined || gol_b === undefined) {
      return NextResponse.json({ error: 'Campos obrigatórios: jogo_numero, gol_a, gol_b' }, { status: 400 })
    }

    const jogoNum = Number(jogo_numero)
    const golA = Number(gol_a)
    const golB = Number(gol_b)
    const penA = penalti_a !== undefined && penalti_a !== '' ? Number(penalti_a) : null
    const penB = penalti_b !== undefined && penalti_b !== '' ? Number(penalti_b) : null

    const { data, error } = await supabaseAdmin
      .from('resultados')
      .upsert(
        {
          jogo_numero: jogoNum,
          gol_a: golA,
          gol_b: golB,
          penalti_a: penA,
          penalti_b: penB,
          registrado_em: new Date().toISOString(),
        },
        { onConflict: 'jogo_numero' }
      )
      .select()
      .single()

    if (error) throw error

    // Advance winner to next round
    await advanceWinner(jogoNum, golA, golB, penA, penB)

    return NextResponse.json({ success: true, resultado: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro ao salvar resultado' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-password')
  const bearer = request.headers.get('authorization')
  const cookieToken = request.cookies.get('token')?.value ?? null
  if (!isAdminRequest(authHeader, bearer, cookieToken)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const jogoNumero = searchParams.get('jogo_numero')
  if (!jogoNumero) return NextResponse.json({ error: 'jogo_numero obrigatório' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('resultados')
    .delete()
    .eq('jogo_numero', Number(jogoNumero))

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
