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
  origem_a INT,
  origem_b INT,
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
  penalti_a INT,
  penalti_b INT,
  minuto INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ao_vivo',
  iniciado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Add penalti columns if table already exists (migration)
ALTER TABLE jogos_ao_vivo ADD COLUMN IF NOT EXISTS penalti_a INT;
ALTER TABLE jogos_ao_vivo ADD COLUMN IF NOT EXISTS penalti_b INT;

ALTER TABLE jogos_ao_vivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ao_vivo" ON jogos_ao_vivo FOR SELECT USING (true);
CREATE POLICY "Service write ao_vivo" ON jogos_ao_vivo FOR ALL USING (auth.role() = 'service_role');

-- Usuarios table: stores user accounts for the app
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  nickname TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read usuarios" ON usuarios FOR SELECT USING (true);
CREATE POLICY "Service write usuarios" ON usuarios FOR ALL USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_palpites_jogo ON palpites(jogo_numero);
CREATE INDEX IF NOT EXISTS idx_palpites_nome ON palpites(nome_participante);
CREATE INDEX IF NOT EXISTS idx_resultados_jogo ON resultados(jogo_numero);
CREATE INDEX IF NOT EXISTS idx_jogos_numero ON jogos(jogo_numero);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_nickname ON usuarios(nickname);
