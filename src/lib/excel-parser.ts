import * as XLSX from 'xlsx'
import type { Jogo, Palpite, ParsedSheet } from '@/types'

function excelSerialToISO(serial: number): string {
  const ms = (serial - 25569) * 86400 * 1000
  return new Date(ms).toISOString()
}

export function parseParticipantName(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets['Dados_participante']
  if (!sheet) return ''

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][]
  for (const row of rows) {
    if (!row) continue
    for (let i = 0; i < row.length - 1; i++) {
      const cell = String(row[i] ?? '').trim().toLowerCase()
      if (cell === 'nome:' && row[i + 1]) {
        return String(row[i + 1]).trim()
      }
    }
  }
  return ''
}

export function parseJogosFromExcel(buffer: ArrayBuffer): Omit<Jogo, 'id' | 'created_at'>[] {
  const workbook = XLSX.read(buffer, { type: 'array' })

  // Prefer exact sheet name, fallback to partial match
  const palpitesSheetName =
    workbook.SheetNames.find((n) => n === 'Meus_Palpites') ??
    workbook.SheetNames.find((n) => n.toLowerCase().includes('palpite'))

  // Step 1: get grupo per jogo_numero from Meus_Palpites
  const grupoMap = new Map<number, string | null>()
  if (palpitesSheetName) {
    const ws = workbook.Sheets[palpitesSheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]
    const headerIdx = rows.findIndex((r) => r && r.some((c: any) => String(c ?? '').toUpperCase().includes('JOGO')))
    if (headerIdx >= 0) {
      for (const row of rows.slice(headerIdx + 1)) {
        if (!row) continue
        const jogoNum = row[1]
        const fase = row[3]
        const grupo = row[10]
        if (!jogoNum || fase !== 'Grupos') continue
        const num = Number(jogoNum)
        if (!grupoMap.has(num)) grupoMap.set(num, grupo ? String(grupo) : null)
      }
    }
  }

  // Step 2: parse schedule from Resultado_Oficial (has DATA + LOCAL + teams)
  const jogos: Omit<Jogo, 'id' | 'created_at'>[] = []
  const resultadoSheet = workbook.Sheets['Resultado_Oficial']

  if (resultadoSheet) {
    const rows = XLSX.utils.sheet_to_json(resultadoSheet, { header: 1, defval: null }) as any[][]
    const seen = new Set<number>()

    for (const row of rows.slice(1)) {
      if (!row) continue
      // [DATA, LOCAL, inscricao, JOGO_NUM, nome, FASE, PAIS_A, GOL_A, GOL_B, PAIS_B, ...]
      const dateSerial = row[0]
      const local = row[1]
      const jogoNum = row[3]
      const fase = row[5]
      const paisA = row[6]
      const paisB = row[9]

      if (!jogoNum || !fase || !paisA || !paisB) continue
      if (fase !== 'Grupos') continue

      const num = Number(jogoNum)
      if (seen.has(num)) continue
      seen.add(num)

      jogos.push({
        jogo_numero: num,
        fase: String(fase),
        grupo: grupoMap.get(num) ?? null,
        pais_a: String(paisA),
        pais_b: String(paisB),
        data_hora: dateSerial && typeof dateSerial === 'number' ? excelSerialToISO(dateSerial) : null,
        estadio: local ? String(local) : null,
      })
    }
  } else if (palpitesSheetName) {
    // Fallback: derive from Meus_Palpites (no date/venue info)
    const ws = workbook.Sheets[palpitesSheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]
    const headerIdx = rows.findIndex((r) => r && r.some((c: any) => String(c ?? '').toUpperCase().includes('JOGO')))
    const seen = new Set<number>()

    if (headerIdx >= 0) {
      for (const row of rows.slice(headerIdx + 1)) {
        if (!row) continue
        const jogoNum = row[1]
        const fase = row[3]
        const paisA = row[4]
        const paisB = row[7]
        if (!jogoNum || !fase || !paisA || !paisB) continue
        if (fase !== 'Grupos') continue
        const num = Number(jogoNum)
        if (seen.has(num)) continue
        seen.add(num)
        jogos.push({
          jogo_numero: num,
          fase: String(fase),
          grupo: grupoMap.get(num) ?? null,
          pais_a: String(paisA),
          pais_b: String(paisB),
          data_hora: null,
          estadio: null,
        })
      }
    }
  }

  return jogos.sort((a, b) => a.jogo_numero - b.jogo_numero)
}

export function parseExcelFile(buffer: ArrayBuffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: 'array' })

  // Prefer exact match over partial to avoid "Menu_Meus_Palpites" being selected first
  const sheetName =
    workbook.SheetNames.find((n) => n === 'Meus_Palpites') ??
    workbook.SheetNames.find((n) => n.toLowerCase().includes('palpite'))

  if (!sheetName) {
    throw new Error('Aba de palpites não encontrada. Certifique-se de usar o arquivo correto.')
  }

  const sheet = workbook.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

  const headerRowIdx = rows.findIndex(
    (row) => row && row.some((cell) => String(cell ?? '').includes('JOGO'))
  )

  if (headerRowIdx === -1) {
    throw new Error('Estrutura do arquivo não reconhecida.')
  }

  const dataRows = rows.slice(headerRowIdx + 1)
  const palpites: Palpite[] = []

  for (const row of dataRows) {
    if (!row || row.length < 8) continue
    const [inscricao, jogoNum, nome, fase, paisA, golA, golB, paisB, penA, penB, grupo, critica] = row

    if (!jogoNum || !nome || !fase || !paisA || golA === null || golB === null || !paisB) continue
    if (typeof golA !== 'number' || typeof golB !== 'number') continue

    palpites.push({
      numero_inscricao: inscricao ? String(inscricao) : null,
      jogo_numero: Number(jogoNum),
      nome_participante: String(nome),
      fase: String(fase),
      pais_a: String(paisA),
      gol_a: Number(golA),
      gol_b: Number(golB),
      pais_b: String(paisB),
      penalti_a: penA !== null && penA !== undefined ? Number(penA) : null,
      penalti_b: penB !== null && penB !== undefined ? Number(penB) : null,
      grupo: grupo ? String(grupo) : null,
      critica: critica ? String(critica) : null,
    })
  }

  const participante =
    parseParticipantName(buffer) || (palpites[0]?.nome_participante ?? 'Participante')

  return { participante, palpites }
}

export const FASES_ORDER: Record<string, number> = {
  Grupos: 1,
  Rodada_32: 2,
  Oitavas: 3,
  Quartas: 4,
  Semi: 5,
  Disputa_Terceiro: 6,
  Final: 7,
}

export function getFaseLabel(fase: string): string {
  const labels: Record<string, string> = {
    Grupos: 'Fase de Grupos',
    Rodada_32: 'Rodada de 32',
    Oitavas: 'Oitavas de Final',
    Quartas: 'Quartas de Final',
    Semi: 'Semifinal',
    Disputa_Terceiro: '3º Lugar',
    Final: 'Final',
  }
  return labels[fase] ?? fase
}
