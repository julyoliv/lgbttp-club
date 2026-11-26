import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { validateReview } from "../validators/review.js";

const router = Router({ mergeParams: true });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.use(authRequired);

async function authorizeMeetingAccess(meetingId, clubId, userId) {
  if (!UUID_RE.test(meetingId)) {
    return { status: 400, error: "ID de encontro inválido" };
  }
  if (clubId !== undefined && !UUID_RE.test(clubId)) {
    return { status: 400, error: "ID de clube inválido" };
  }

  const result = await pool.query(
    `SELECT mt.id, mt.club_id, m.role
     FROM meetings mt
     LEFT JOIN memberships m
       ON m.club_id = mt.club_id AND m.user_id = $2
     WHERE mt.id = $1`,
    [meetingId, userId],
  );

  if (result.rowCount === 0) {
    return { status: 404, error: "Encontro não encontrado" };
  }

  const row = result.rows[0];
  if (clubId !== undefined && row.club_id !== clubId) {
    return { status: 404, error: "Encontro não encontrado neste clube" };
  }

  if (!row.role) {
    return { status: 403, error: "Você não é membro deste clube" };
  }

  return { ok: true, meeting: row };
}

// --- CRIAR OU ATUALIZAR RESENHA (UPSERT) ---
router.post("/", async (req, res) => {
  const { meetingId, clubId } = req.params;
  const userId = req.user.id;
  const validation = validateReview(req.body);

  if (!validation.ok) {
    return res.status(400).json({ errors: validation.errors });
  }

  const { rating, body } = validation.data;

  try {
    const auth = await authorizeMeetingAccess(meetingId, clubId, userId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const result = await pool.query(
      `INSERT INTO reviews (meeting_id, user_id, rating, body)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (meeting_id, user_id)
       DO UPDATE SET
         rating = EXCLUDED.rating,
         body = EXCLUDED.body,
         updated_at = now()
       RETURNING id, meeting_id, user_id, rating, body, created_at, updated_at`,
      [meetingId, userId, rating, body],
    );

    return res.status(200).json({ review: result.rows[0] });
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    if (err.code === "23503") {
      return res.status(404).json({ error: "Encontro não encontrado" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- LISTAR RESENHAS DO ENCONTRO ---
router.get("/", async (req, res) => {
  const { meetingId, clubId } = req.params;
  const userId = req.user.id;

  try {
    const auth = await authorizeMeetingAccess(meetingId, clubId, userId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const result = await pool.query(
      `SELECT r.id, r.rating, r.body, r.created_at, r.updated_at, u.name AS user_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.meeting_id = $1
       ORDER BY r.created_at DESC`,
      [meetingId],
    );

    return res.json({ reviews: result.rows });
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- DELETAR PRÓPRIA RESENHA ---
router.delete("/:reviewId", async (req, res) => {
  const { meetingId, reviewId, clubId } = req.params;
  const userId = req.user.id;

  if (!UUID_RE.test(reviewId)) {
    return res.status(400).json({ error: "ID de resenha inválido" });
  }

  try {
    const auth = await authorizeMeetingAccess(meetingId, clubId, userId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const reviewResult = await pool.query(
      "SELECT user_id FROM reviews WHERE id = $1 AND meeting_id = $2",
      [reviewId, meetingId],
    );

    if (reviewResult.rowCount === 0) {
      return res.status(404).json({ error: "Resenha não encontrada" });
    }

    if (reviewResult.rows[0].user_id !== userId) {
      return res.status(403).json({
        error: "Você não tem permissão para deletar a resenha de outra pessoa",
      });
    }

    await pool.query("DELETE FROM reviews WHERE id = $1 AND meeting_id = $2", [
      reviewId,
      meetingId,
    ]);

    return res.status(200).json({ message: "Resenha deletada com sucesso" });
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
