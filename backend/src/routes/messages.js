import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import {
  clubMemberRequired,
  clubOwnerRequired,
} from "../middleware/clubAuth.js";
import { validateMessage } from "../validators/message.js";

const router = Router({ mergeParams: true });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.use(authRequired);

// --- CRIAR RECADO (Apenas Owner) ---
router.post("/", clubOwnerRequired, async (req, res) => {
  const { clubId } = req.params;
  const userId = req.user.id;
  const validation = validateMessage(req.body);

  if (!validation.ok) {
    return res.status(400).json({ errors: validation.errors });
  }

  const { body } = validation.data;

  try {
    const result = await pool.query(
      `INSERT INTO club_messages (club_id, author_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, club_id, author_id, body, created_at, updated_at`,
      [clubId, userId, body],
    );

    const newMessage = result.rows[0];

    const userResult = await pool.query(
      "SELECT name FROM users WHERE id = $1",
      [userId],
    );
    newMessage.author_name = userResult.rows[0]?.name ?? null;

    return res.status(201).json({ message: newMessage });
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- LISTAR RECADOS (Qualquer membro) ---
router.get("/", clubMemberRequired, async (req, res) => {
  const { clubId } = req.params;

  try {
    const result = await pool.query(
      `SELECT m.id, m.body, m.created_at, m.updated_at, u.name AS author_name
       FROM club_messages m
       JOIN users u ON u.id = m.author_id
       WHERE m.club_id = $1
       ORDER BY m.created_at DESC`,
      [clubId],
    );

    return res.json({ messages: result.rows });
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "ID de clube inválido" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- ATUALIZAR RECADO (Apenas Owner) ---
router.patch("/:messageId", clubOwnerRequired, async (req, res) => {
  const { clubId, messageId } = req.params;
  const validation = validateMessage(req.body);

  if (!validation.ok) {
    return res.status(400).json({ errors: validation.errors });
  }

  if (!UUID_RE.test(messageId)) {
    return res.status(400).json({ error: "ID de recado inválido" });
  }

  const { body } = validation.data;

  try {
    const result = await pool.query(
      `UPDATE club_messages
       SET body = $1, updated_at = now()
       WHERE id = $2 AND club_id = $3
       RETURNING id, club_id, author_id, body, created_at, updated_at`,
      [body, messageId, clubId],
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Recado não encontrado neste clube" });
    }

    return res.json({ message: result.rows[0] });
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- DELETAR RECADO (Apenas Owner) ---
router.delete("/:messageId", clubOwnerRequired, async (req, res) => {
  const { clubId, messageId } = req.params;

  if (!UUID_RE.test(messageId)) {
    return res.status(400).json({ error: "ID de recado inválido" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM club_messages WHERE id = $1 AND club_id = $2 RETURNING id",
      [messageId, clubId],
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Recado não encontrado neste clube" });
    }

    return res.status(200).json({ message: "Recado deletado com sucesso" });
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
