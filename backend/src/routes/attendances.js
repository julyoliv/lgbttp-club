import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";

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

// --- CONFIRMAR / ALTERAR PRESENÇA ---
router.post("/", async (req, res) => {
  const { meetingId, clubId } = req.params;
  const userId = req.user.id;
  const status = req.body?.status;

  if (!["going", "not_going"].includes(status)) {
    return res
      .status(400)
      .json({ error: 'Status deve ser "going" ou "not_going"' });
  }

  try {
    const auth = await authorizeMeetingAccess(meetingId, clubId, userId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const result = await pool.query(
      `INSERT INTO attendances (meeting_id, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (meeting_id, user_id)
       DO UPDATE SET status = EXCLUDED.status
       RETURNING meeting_id, user_id, status`,
      [meetingId, userId, status],
    );

    return res.status(200).json({
      message: "Presença confirmada com sucesso",
      attendance: result.rows[0],
    });
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

// --- VER QUEM VAI AO ENCONTRO ---
router.get("/", async (req, res) => {
  const { meetingId, clubId } = req.params;
  const userId = req.user.id;

  try {
    const auth = await authorizeMeetingAccess(meetingId, clubId, userId);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const result = await pool.query(
      `SELECT a.user_id, u.name, a.status
       FROM attendances a
       JOIN users u ON u.id = a.user_id
       WHERE a.meeting_id = $1`,
      [meetingId],
    );

    return res.json({ attendances: result.rows });
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
