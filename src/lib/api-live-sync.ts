import { supabaseAdmin } from '@/lib/supabase'

const WORLDCUP_API = 'https://worldcup26.ir'

const TEAM_NAME_MAP: Record<string, string> = {
  Mexico: 'México',
  'South Africa': 'África do Sul',
  'South Korea': 'Coreia do Sul',
  'Czech Republic': 'República Tcheca',
  Canada: 'Canadá',
  'Bosnia and Herzegovina': 'Bósnia',
  Qatar: 'Catar',
  Switzerland: 'Suíça',
  Brazil: 'Brasil',
  Morocco: 'Marrocos',
  Haiti: 'Haiti',
  Scotland: 'Escócia',
  'United States': 'Estados Unidos',
  Paraguay: 'Paraguai',
  Australia: 'Austrália',
  Turkey: 'Turquia',
  Germany: 'Alemanha',
  Curaçao: 'Curaçao',
  'Ivory Coast': 'Costa do Marfim',
  Ecuador: 'Equador',
  Netherlands: 'Holanda',
  Japan: 'Japão',
  Sweden: 'Suécia',
  Tunisia: 'Tunísia',
  Belgium: 'Bélgica',
  Egypt: 'Egito',
  Iran: 'Irã',
  'New Zealand': 'Nova Zelândia',
  Spain: 'Espanha',
  'Cape Verde': 'Cabo Verde',
  'Saudi Arabia': 'Arábia Saudita',
  Uruguay: 'Uruguai',
  France: 'França',
  Senegal: 'Senegal',
  Iraq: 'Iraque',
  Norway: 'Noruega',
  Argentina: 'Argentina',
  Algeria: 'Argélia',
  Austria: 'Áustria',
  Jordan: 'Jordânia',
  Portugal: 'Portugal',
  'Democratic Republic of the Congo': 'República Democrática do Congo',
  Uzbekistan: 'Uzbequistão',
  Colombia: 'Colômbia',
  England: 'Inglaterra',
  Croatia: 'Croácia',
  Ghana: 'Gana',
  Panama: 'Panamá',
}

function mapToPortuguese(nameEn: string): string {
  return TEAM_NAME_MAP[nameEn] ?? nameEn
}

interface ApiGame {
  id: string
  home_team_id: string
  away_team_id: string
  home_score: string
  away_score: string
  group: string
  finished: string
  time_elapsed: string
  local_date: string
  type: string
  home_team_name_en: string
  away_team_name_en: string
}

interface ApiResponse {
  games: ApiGame[]
}

let cache: { time: number; promise: Promise<{ synced: number; finalized: number; errors: string[] }> } | null = null
const CACHE_TTL = 30_000 // 30s

export async function syncLiveFromAPI(): Promise<{
  synced: number
  finalized: number
  errors: string[]
}> {
  // Deduplicate concurrent calls and respect TTL
  const now = Date.now()
  if (cache && (now - cache.time) < CACHE_TTL) {
    return cache.promise
  }

  const promise = doSync()
  cache = { time: now, promise }
  return promise
}

async function doSync(): Promise<{
  synced: number
  finalized: number
  errors: string[]
}> {
  const result = { synced: 0, finalized: 0, errors: [] as string[] }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
    const response = await fetch(`${WORLDCUP_API}/get/games`, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) {
      result.errors.push(`API returned ${response.status}`)
      return result
    }
    const data: ApiResponse = await response.json()
    if (!data?.games?.length) return result

    const live = data.games.filter(g => g.time_elapsed === 'live')
    const finished = data.games.filter(g => g.finished === 'TRUE')
    const upcoming = data.games.filter(g => g.time_elapsed === 'notstarted')
    console.log('[api-live-sync:summary]',
      `total=${data.games.length}`,
      `live=${live.length}`,
      `finished=${finished.length}`,
      `upcoming=${upcoming.length}`
    )
    if (live.length > 0) {
      console.log('[api-live-sync:ao-vivo]', JSON.stringify(live.map(g => ({
        id: g.id, home: g.home_team_name_en, away: g.away_team_name_en,
        score: `${g.home_score}×${g.away_score}`, elapsed: g.time_elapsed
      }))))
    }
    if (finished.length > 0) {
      console.log('[api-live-sync:finished]', JSON.stringify(finished.slice(0, 5).map(g => ({
        id: g.id, home: g.home_team_name_en, away: g.away_team_name_en,
        score: `${g.home_score}×${g.away_score}`
      }))))
    }

    const { data: jogos } = await supabaseAdmin
      .from('jogos')
      .select('jogo_numero, pais_a, pais_b')
    if (!jogos) return result

    const jogoMap = new Map<string, number>()
    for (const j of jogos) {
      jogoMap.set(`${j.pais_a}|${j.pais_b}`, j.jogo_numero)
      jogoMap.set(`${j.pais_b}|${j.pais_a}`, j.jogo_numero)
    }

    for (const game of data.games) {
      const homePt = mapToPortuguese(game.home_team_name_en)
      const awayPt = mapToPortuguese(game.away_team_name_en)
      const jogoNumero = jogoMap.get(`${homePt}|${awayPt}`)
      if (!jogoNumero) continue

      if (game.time_elapsed === 'live') {
        await supabaseAdmin.from('jogos_ao_vivo').upsert(
          {
            jogo_numero: jogoNumero,
            gol_a: parseInt(game.home_score) || 0,
            gol_b: parseInt(game.away_score) || 0,
            minuto: 0,
            status: 'ao_vivo',
          },
          { onConflict: 'jogo_numero' }
        )
        result.synced++
      }

      if (game.finished === 'TRUE' && game.time_elapsed === 'finished') {
        await supabaseAdmin.from('jogos_ao_vivo').delete().eq('jogo_numero', jogoNumero)
        await supabaseAdmin.from('resultados').upsert(
          {
            jogo_numero: jogoNumero,
            gol_a: parseInt(game.home_score) || 0,
            gol_b: parseInt(game.away_score) || 0,
            penalti_a: null,
            penalti_b: null,
          },
          { onConflict: 'jogo_numero' }
        )
        result.finalized++
      }
    }
  } catch (err) {
    const msg = (err as Error).message
    result.errors.push(msg)
    console.error('[api-live-sync:error]', msg, (err as Error).name)
  }

  return result
}
