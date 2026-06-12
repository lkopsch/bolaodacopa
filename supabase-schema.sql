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

-- Admin sessions (simple password-based, no user accounts needed)
-- We use a single admin password stored in env vars, no table needed.

-- Enable RLS
ALTER TABLE palpites ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;

-- Allow public read on palpites and resultados
CREATE POLICY "Public read palpites" ON palpites FOR SELECT USING (true);
CREATE POLICY "Public read resultados" ON resultados FOR SELECT USING (true);

-- Only service role can write (API routes use service key)
CREATE POLICY "Service write palpites" ON palpites FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write resultados" ON resultados FOR ALL USING (auth.role() = 'service_role');

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_palpites_jogo ON palpites(jogo_numero);
CREATE INDEX IF NOT EXISTS idx_palpites_nome ON palpites(nome_participante);
CREATE INDEX IF NOT EXISTS idx_resultados_jogo ON resultados(jogo_numero);
