-- Adiciona o motivo da sugestão
ALTER TABLE suggestions ADD COLUMN reason text;

-- Adiciona o controle de fase do clube
-- 'idle' (sem votação), 'suggesting' (recebendo sugestões), 'voting' (recebendo votos)
ALTER TABLE clubs ADD COLUMN suggestion_phase text NOT NULL DEFAULT 'idle' CHECK (suggestion_phase IN ('idle', 'suggesting', 'voting'));

-- Adiciona as configurações dinâmicas no clube (quantos votos e quantas sugestões por pessoa)
ALTER TABLE clubs ADD COLUMN max_votes_per_user integer NOT NULL DEFAULT 3;
ALTER TABLE clubs ADD COLUMN max_suggestions_per_user integer NOT NULL DEFAULT 1;