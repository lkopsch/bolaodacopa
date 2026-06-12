import * as XLSX from 'xlsx'
import type { Palpite, ParsedSheet } from '@/types'

export function parseExcelFile(buffer: ArrayBuffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: 'array' })

  // Try to find the palpites sheet
  const sheetName = workbook.SheetNames.find(
    (n) => n === 'Meus_Palpites' || n.toLowerCase().includes('palpite')
  )

  if (!sheetName) {
    throw new Error('Aba de palpites não encontrada. Certifique-se de usar o arquivo correto.')
  }

  const sheet = workbook.Sheets[sheetName]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

  // Find header row
  const headerRowIdx = rows.findIndex(
    (row) => row && row.some((cell) => String(cell ?? '').includes('JOGO'))
  )

  if (headerRowIdx === -1) {
    throw new Error('Estrutura do arquivo não reconhecida.')
  }

  const dataRows = rows.slice(headerRowIdx + 1)
  const palpites: Palpite[] = []
  const participantesSet = new Set<string>()

  for (const row of dataRows) {
    if (!row || row.length < 8) continue
    // Columns: INSCRICAO, JOGO_NUM, NOME, FASE, PAIS_A, GOL_A, GOL_B, PAIS_B, PEN_A, PEN_B, GRUPO, CRITICA
    const [inscricao, jogoNum, nome, fase, paisA, golA, golB, paisB, penA, penB, grupo, critica] = row

    if (!jogoNum || !nome || !fase || !paisA || golA === null || golB === null || !paisB) continue
    if (typeof golA !== 'number' || typeof golB !== 'number') continue

    participantesSet.add(String(nome))

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

  return {
    participantes: Array.from(participantesSet),
    palpites,
  }
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
