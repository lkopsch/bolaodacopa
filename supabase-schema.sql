-- Run this in your Supabase SQL editor

-- Palpites table: stores all guesses read from Excel
CREATE TABLE IF NOT EXISTS palpites (
  id BIGSERIAL PRIMARY KEY,
  numero_inscricao TEXT,
  jogo_numero INT NOT NULL,
  nome_participante TEXT NOT NULL,
  fase TEXT NOT NULL,
  pais_a TEXT NOT NULL,
  gol_a INT NOT NULL,
  gol_b INT NOT NULL,
  pais_b TEXT NOT NULL,
  penalti_a INT,
  penalti_b INT,
  grupo TEXT,
  critica TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resultados table: stores official match results set by admin
CREATE TABLE IF NOT EXISTS resultados (
  id BIGSERIAL PRIMARY KEY,
  jogo_numero INT NOT NULL UNIQUE,
  gol_a INT NOT NULL,
  gol_b INT NOT NULL,
  penalti_a INT,
  penalti_b INT,
  registrado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Jogos table: stores the match schedule (seeded from first Excel upload)
CREATE TABLE IF NOT EXISTS jogos (
  id BIGSERIAL PRIMARY KEY,
  jogo_numero INT NOT NULL UNIQUE,
  fase TEXT NOT NULL,
  grupo TEXT,
  pais_a TEXT NOT NULL,
  pais_b TEXT NOT NULL,
  data_hora TIMESTAMPTZ,
  estadio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE palpites ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE jogos ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Public read palpites" ON palpites FOR SELECT USING (true);
CREATE POLICY "Public read resultados" ON resultados FOR SELECT USING (true);
CREATE POLICY "Public read jogos" ON jogos FOR SELECT USING (true);

-- Only service role can write
CREATE POLICY "Service write palpites" ON palpites FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write resultados" ON resultados FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write jogos" ON jogos FOR ALL USING (auth.role() = 'service_role');

-- Ao Vivo table: tracks live match scores
CREATE TABLE IF NOT EXISTS jogos_ao_vivo (
  jogo_numero INT NOT NULL UNIQUE,
  gol_a INT NOT NULL DEFAULT 0,
  gol_b INT NOT NULL DEFAULT 0,
  minuto INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ao_vivo',
  iniciado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jogos_ao_vivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ao_vivo" ON jogos_ao_vivo FOR SELECT USING (true);
CREATE POLICY "Service write ao_vivo" ON jogos_ao_vivo FOR ALL USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_palpites_jogo ON palpites(jogo_numero);
CREATE INDEX IF NOT EXISTS idx_palpites_nome ON palpites(nome_participante);
CREATE INDEX IF NOT EXISTS idx_resultados_jogo ON resultados(jogo_numero);
CREATE INDEX IF NOT EXISTS idx_jogos_numero ON jogos(jogo_numero);
