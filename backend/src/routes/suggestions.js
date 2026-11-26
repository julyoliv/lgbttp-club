import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import {
  clubMemberRequired,
  clubOwnerRequired,
} from "../middleware/clubAuth.js";
import { validateCreateSuggestion } from "../validators/suggestion.js";

const router = Router({ mergeParams: true });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.use(authRequired);

// --- CRIAR SUGESTÃO ---
router.post("/", clubMemberRequired, async (req, res) => {
  const { clubId } = req.params;
  const userId = req.user.id;
  const validation = validateCreateSuggestion(req.body);

  if (!validation.ok) {
    return res.status(400).json({ errors: validation.errors });
  }

  const {
    title,
    author,
    reason,
    cover_url,
    external_source,
    external_id,
    release_year,
  } = validation.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const clubResult = await client.query(
      "SELECT suggestion_phase, max_suggestions_per_user FROM clubs WHERE id = $1 FOR UPDATE",
      [clubId],
    );

    if (clubResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Clube não encontrado" });
    }

    const club = clubResult.rows[0];
    if (club.suggestion_phase !== "suggesting") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "O clube não está recebendo sugestões no momento." });
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM suggestions
       WHERE club_id = $1 AND suggested_by = $2 AND status = 'open'`,
      [clubId, userId],
    );

    if (countResult.rows[0].total >= club.max_suggestions_per_user) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Você já atingiu o limite de ${club.max_suggestions_per_user} sugestão(ões) neste ciclo.`,
      });
    }

    const result = await client.query(
      `INSERT INTO suggestions (
         club_id, title, author, reason, suggested_by, cover_url,
         external_source, external_id, release_year
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, club_id, title, author, reason, cover_url,
                 external_source, external_id, release_year,
                 suggested_by, status, created_at`,
      [
        clubId,
        title,
        author,
        reason,
        userId,
        cover_url,
        external_source,
        external_id,
        release_year,
      ],
    );

    await client.query("COMMIT");
    return res.status(201).json({ suggestion: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "22P02") {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    console.error("ERRO AO CRIAR SUGESTÃO:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  } finally {
    client.release();
  }
});

// --- LISTAR SUGESTÕES ---
router.get("/", clubMemberRequired, async (req, res) => {
  const { clubId } = req.params;
  const userId = req.user.id;

  try {
    const clubResult = await pool.query(
      "SELECT role FROM memberships WHERE club_id = $1 AND user_id = $2",
      [clubId, userId],
    );
    const isOwner = clubResult.rows[0]?.role === "owner";

    const result = await pool.query(
      `SELECT
         s.id, s.title, s.author, s.reason, s.cover_url, s.status,
         s.external_source, s.external_id, s.release_year,
         s.created_at, s.suggested_by,
         CASE
           WHEN s.suggested_by = $2 THEN 'Você'
           WHEN $3::boolean THEN u.name
           ELSE 'Membro do clube'
         END AS suggested_by_name,
         COUNT(v.user_id)::int AS votes_count,
         COALESCE(bool_or(v.user_id = $2), false) AS voted_by_me
       FROM suggestions s
       LEFT JOIN users u ON u.id = s.suggested_by
       LEFT JOIN votes v ON v.suggestion_id = s.id
       WHERE s.club_id = $1
       GROUP BY s.id, u.name
       ORDER BY
         CASE WHEN s.status = 'open' THEN 0 ELSE 1 END,
         votes_count DESC,
         s.created_at ASC`,
      [clubId, userId, isOwner],
    );

    return res.json({ suggestions: result.rows });
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "ID de clube inválido" });
    }
    console.error("ERRO AO LISTAR SUGESTÕES:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- VOTAR / REMOVER VOTO ---
router.post("/:suggestionId/vote", clubMemberRequired, async (req, res) => {
  const { clubId, suggestionId } = req.params;
  const userId = req.user.id;

  if (!UUID_RE.test(suggestionId)) {
    return res.status(400).json({ error: "ID de sugestão inválido" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const suggestionResult = await client.query(
      "SELECT id, status FROM suggestions WHERE id = $1 AND club_id = $2",
      [suggestionId, clubId],
    );

    if (suggestionResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Sugestão não encontrada" });
    }

    const existingVote = await client.query(
      "SELECT 1 FROM votes WHERE suggestion_id = $1 AND user_id = $2",
      [suggestionId, userId],
    );

    if (existingVote.rowCount > 0) {
      await client.query(
        "DELETE FROM votes WHERE suggestion_id = $1 AND user_id = $2",
        [suggestionId, userId],
      );
      await client.query("COMMIT");
      return res.json({ message: "Voto removido", voted: false });
    }

    if (suggestionResult.rows[0].status !== "open") {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Não é possível votar nesta sugestão." });
    }

    const clubResult = await client.query(
      "SELECT suggestion_phase, max_votes_per_user FROM clubs WHERE id = $1 FOR UPDATE",
      [clubId],
    );

    if (clubResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Clube não encontrado" });
    }

    const club = clubResult.rows[0];
    if (club.suggestion_phase !== "voting") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "A votação não está aberta." });
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM votes v
       JOIN suggestions s ON s.id = v.suggestion_id
       WHERE s.club_id = $1 AND v.user_id = $2`,
      [clubId, userId],
    );

    if (countResult.rows[0].total >= club.max_votes_per_user) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `Você só pode votar em até ${club.max_votes_per_user} obras.`,
      });
    }

    await client.query(
      "INSERT INTO votes (suggestion_id, user_id) VALUES ($1, $2)",
      [suggestionId, userId],
    );

    await client.query("COMMIT");
    return res.status(201).json({ message: "Voto registrado", voted: true });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "22P02") {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    if (err.code === "23503") {
      return res.status(404).json({ error: "Sugestão não encontrada" });
    }
    console.error("ERRO AO VOTAR NA SUGESTÃO:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  } finally {
    client.release();
  }
});

// --- ESCOLHER / REJEITAR SUGESTÃO ---
router.patch("/:suggestionId/choose", clubOwnerRequired, async (req, res) => {
  const { clubId, suggestionId } = req.params;
  const { status } = req.body || {};

  if (!UUID_RE.test(suggestionId)) {
    return res.status(400).json({ error: "ID de sugestão inválido" });
  }

  if (!["chosen", "rejected", "created"].includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }

  try {
    const updateResult = await pool.query(
      `UPDATE suggestions
       SET status = $1
       WHERE id = $2 AND club_id = $3
       RETURNING id, title, status`,
      [status, suggestionId, clubId],
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: "Sugestão não encontrada" });
    }

    return res.json({
      message: "Status atualizado",
      suggestion: updateResult.rows[0],
    });
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    console.error("ERRO AO ATUALIZAR STATUS DA SUGESTÃO:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- REINICIAR CICLO ---
router.delete("/reset", clubOwnerRequired, async (req, res) => {
  const { clubId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM suggestions WHERE club_id = $1", [clubId]);
    await client.query(
      "UPDATE clubs SET suggestion_phase = 'suggesting', current_theme = NULL WHERE id = $1",
      [clubId],
    );
    await client.query("COMMIT");
    return res.json({ message: "Sugestões limpas e novo ciclo iniciado!" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO AO REINICIAR SUGESTÕES:", err);
    return res.status(500).json({ error: "Erro ao reiniciar sugestões" });
  } finally {
    client.release();
  }
});

export default router;
