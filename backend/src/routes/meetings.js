import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import {
  clubMemberRequired,
  clubOwnerRequired,
} from "../middleware/clubAuth.js";
import { validateCreateMeeting } from "../validators/meeting.js";

const router = Router({ mergeParams: true });
router.use(authRequired);

router.post("/", clubOwnerRequired, async (req, res) => {
  const { clubId } = req.params;
  const validation = validateCreateMeeting(req.body);
  if (!validation.ok) {
    return res.status(400).json({ errors: validation.errors });
  }

  const { title, author, description, scheduled_at, theme, cover_url } =
    validation.data;
  const suggestionId =
    typeof req.body?.suggestion_id === "string" && req.body.suggestion_id.trim()
      ? req.body.suggestion_id.trim()
      : null;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO meetings (club_id, title, author, description, scheduled_at, theme, cover_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, club_id, title, author, description, scheduled_at, theme, cover_url, created_at`,
      [clubId, title, author, description, scheduled_at, theme, cover_url],
    );

    if (suggestionId) {
      await client.query(
        `UPDATE suggestions
         SET status = 'created'
         WHERE id = $1 AND club_id = $2 AND status = 'chosen'`,
        [suggestionId, clubId],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({ meeting: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "22P02") {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  } finally {
    client.release();
  }
});

router.get("/", clubMemberRequired, async (req, res) => {
  const { clubId } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, title, author, description, scheduled_at, theme, cover_url, created_at
       FROM meetings
       WHERE club_id = $1
       ORDER BY scheduled_at ASC`,
      [clubId],
    );

    return res.json({ meetings: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
