import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { validateCreateClub } from "../validators/club.js";
import { generateInviteCode } from "../utils/inviteCode.js";
import { clubOwnerRequired } from "../middleware/clubAuth.js";

const router = Router();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_PHASES = ["idle", "suggesting", "voting"];

router.use(authRequired);

router.post("/", async (req, res) => {
  const validation = validateCreateClub(req.body);
  if (!validation.ok) {
    return res.status(400).json({ errors: validation.errors });
  }

  const { name, type } = validation.data;
  const ownerId = req.user.id;
  const inviteCode = generateInviteCode();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const clubResult = await client.query(
      `INSERT INTO clubs (name, type, owner_id, invite_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, type, owner_id, invite_code, created_at, suggestion_phase, current_theme, max_votes_per_user, max_suggestions_per_user`,
      [name, type, ownerId, inviteCode],
    );
    const newClub = clubResult.rows[0];

    await client.query(
      `INSERT INTO memberships (user_id, club_id, role)
       VALUES ($1, $2, 'owner')`,
      [ownerId, newClub.id],
    );

    await client.query("COMMIT");

    return res.status(201).json({ club: newClub });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao criar clube:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  } finally {
    client.release();
  }
});

router.post("/join", async (req, res) => {
  const inviteCode =
    typeof req.body?.invite_code === "string"
      ? req.body.invite_code.trim().toUpperCase()
      : "";
  const userId = req.user.id;

  if (!inviteCode) {
    return res.status(400).json({ error: "Código de convite é obrigatório" });
  }

  try {
    const clubResult = await pool.query(
      "SELECT id, name FROM clubs WHERE invite_code = $1",
      [inviteCode],
    );

    if (clubResult.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Clube não encontrado com este código" });
    }

    const club = clubResult.rows[0];

    const insertResult = await pool.query(
      `INSERT INTO memberships (user_id, club_id, role)
       VALUES ($1, $2, 'member')
       ON CONFLICT (user_id, club_id) DO NOTHING
       RETURNING user_id`,
      [userId, club.id],
    );

    if (insertResult.rowCount === 0) {
      return res.status(409).json({ error: "Você já é membro deste clube" });
    }

    return res.status(200).json({
      message: `Você entrou no clube "${club.name}" com sucesso!`,
      clubId: club.id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- LISTAR MEUS CLUBES ---
router.get("/", async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.type, c.owner_id, c.invite_code, c.created_at,
              c.suggestion_phase, c.current_theme, c.max_votes_per_user, c.max_suggestions_per_user,
              m.role
       FROM clubs c
       JOIN memberships m ON m.club_id = c.id
       WHERE m.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId],
    );

    return res.json({ clubs: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- DETALHES DE UM CLUBE ---
router.get("/:clubId", async (req, res) => {
  const { clubId } = req.params;
  const userId = req.user.id;

  if (!UUID_RE.test(clubId)) {
    return res.status(400).json({ error: "ID de clube inválido" });
  }

  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.type, c.owner_id,
              CASE WHEN m.role = 'owner' THEN c.invite_code ELSE NULL END AS invite_code,
              c.created_at, c.suggestion_phase, c.current_theme, c.max_votes_per_user, c.max_suggestions_per_user,
              m.role
       FROM clubs c
       JOIN memberships m ON m.club_id = c.id
       WHERE c.id = $1 AND m.user_id = $2`,
      [clubId, userId],
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Clube não encontrado ou você não é membro" });
    }

    return res.json({ club: result.rows[0] });
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "ID de clube inválido" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- ATUALIZAR FASE, TEMA E CONFIGURAÇÕES (Apenas Owner) ---
router.patch("/:clubId/phase", clubOwnerRequired, async (req, res) => {
  const { clubId } = req.params;
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const hasThemeKey = Object.prototype.hasOwnProperty.call(
    body,
    "current_theme",
  );

  const nextPhase = body.suggestion_phase ?? null;
  if (nextPhase !== null && !VALID_PHASES.includes(nextPhase)) {
    return res.status(400).json({ error: "Fase de sugestão inválida" });
  }

  const nextTheme = hasThemeKey
    ? typeof body.current_theme === "string"
      ? body.current_theme.trim() || null
      : null
    : undefined;

  const nextMaxVotes =
    body.max_votes_per_user !== undefined ? body.max_votes_per_user : null;
  const nextMaxSuggestions =
    body.max_suggestions_per_user !== undefined
      ? body.max_suggestions_per_user
      : null;

  if (
    (nextMaxVotes !== null &&
      (!Number.isInteger(nextMaxVotes) || nextMaxVotes < 0)) ||
    (nextMaxSuggestions !== null &&
      (!Number.isInteger(nextMaxSuggestions) || nextMaxSuggestions < 0))
  ) {
    return res
      .status(400)
      .json({
        error: "Limites devem ser números inteiros maiores ou iguais a 0",
      });
  }

  try {
    const result = await pool.query(
      `UPDATE clubs
       SET suggestion_phase = COALESCE($1, suggestion_phase),
           current_theme = CASE WHEN $2::boolean THEN $3 ELSE current_theme END,
           max_votes_per_user = COALESCE($4, max_votes_per_user),
           max_suggestions_per_user = COALESCE($5, max_suggestions_per_user)
       WHERE id = $6
       RETURNING id, name, type, owner_id, invite_code, created_at, suggestion_phase, current_theme, max_votes_per_user, max_suggestions_per_user`,
      [
        nextPhase,
        hasThemeKey,
        nextTheme ?? null,
        nextMaxVotes,
        nextMaxSuggestions,
        clubId,
      ],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Clube não encontrado" });
    }

    return res.json({ club: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- DELETAR CLUBE (Apenas Owner) ---
router.delete("/:clubId", clubOwnerRequired, async (req, res) => {
  const { clubId } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM clubs WHERE id = $1 RETURNING id",
      [clubId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Clube não encontrado" });
    }

    return res.status(204).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
