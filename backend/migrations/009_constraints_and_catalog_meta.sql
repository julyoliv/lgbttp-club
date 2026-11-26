-- 1. Evita e-mails duplicados por diferença de capitalização
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
  ON users (lower(email));

-- 2. Garante limites não negativos nas configurações do clube
ALTER TABLE clubs
  ADD CONSTRAINT clubs_max_votes_non_negative
    CHECK (max_votes_per_user >= 0),
  ADD CONSTRAINT clubs_max_suggestions_non_negative
    CHECK (max_suggestions_per_user >= 0);

-- 3. Evita títulos em branco e motivos vazios/excessivos em sugestões e encontros
ALTER TABLE suggestions
  ADD CONSTRAINT suggestions_title_not_blank
    CHECK (char_length(btrim(title)) >= 2),
  ADD CONSTRAINT suggestions_reason_length
    CHECK (reason IS NULL OR char_length(btrim(reason)) BETWEEN 5 AND 1000);

ALTER TABLE meetings
  ADD CONSTRAINT meetings_title_not_blank
    CHECK (char_length(btrim(title)) >= 1);

-- 4. Metadados de catálogo externo (TMDb / Google Books / upload manual)
ALTER TABLE suggestions
  ADD COLUMN IF NOT EXISTS external_source text
    CHECK (external_source IN ('tmdb', 'google_books', 'open_library', 'manual')),
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS release_year smallint;

CREATE INDEX IF NOT EXISTS suggestions_club_external_idx
  ON suggestions (club_id, external_source, external_id)
  WHERE external_id IS NOT NULL;