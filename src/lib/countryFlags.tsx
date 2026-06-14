'use client'

const COUNTRY_FLAGS: Record<string, string> = {
  'México': 'mx',
  'África do Sul': 'za',
  'Coreia do Sul': 'kr',
  'República Tcheca': 'cz',
  'Canadá': 'ca',
  'Bósnia': 'ba',
  'Catar': 'qa',
  'Suíça': 'ch',
  'Brasil': 'br',
  'Marrocos': 'ma',
  'Haiti': 'ht',
  'Escócia': 'gb-sct',
  'Estados Unidos': 'us',
  'Paraguai': 'py',
  'Austrália': 'au',
  'Turquia': 'tr',
  'Alemanha': 'de',
  'Curaçau': 'cw',
  'Costa do Marfim': 'ci',
  'Equador': 'ec',
  'Holanda': 'nl',
  'Japão': 'jp',
  'Suécia': 'se',
  'Tunísia': 'tn',
  'Bélgica': 'be',
  'Egito': 'eg',
  'Irã': 'ir',
  'Nova Zelândia': 'nz',
  'Espanha': 'es',
  'Cabo Verde': 'cv',
  'Arábia Saudita': 'sa',
  'Uruguai': 'uy',
  'França': 'fr',
  'Senegal': 'sn',
  'Iraque': 'iq',
  'Noruega': 'no',
  'Argentina': 'ar',
  'Argélia': 'dz',
  'Áustria': 'at',
  'Jordânia': 'jo',
  'Portugal': 'pt',
  'República Democrática do Congo': 'cd',
  'Uzbequistão': 'uz',
  'Colômbia': 'co',
  'Inglaterra': 'gb-eng',
  'Croácia': 'hr',
  'Gana': 'gh',
  'Panamá': 'pa',
}

export function getFlagClass(time: string | null | undefined): string {
  if (!time) return ''
  const code = COUNTRY_FLAGS[time]
  if (!code) return ''
  return `fi fi-${code}`
}

export function TeamWithFlag({ name, className = '' }: { name: string | null | undefined; className?: string }) {
  if (!name) return <span className="text-stone-600">─</span>
  const flagClass = getFlagClass(name)
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {flagClass && <span className={`${flagClass} rounded-sm shrink-0`} style={{ width: 18, height: 12, verticalAlign: 'middle' }} />}
      <span>{name}</span>
    </span>
  )
}
