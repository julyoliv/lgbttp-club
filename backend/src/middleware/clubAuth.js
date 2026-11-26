import { pool } from "../db.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

export async function clubMemberRequired(req, res, next) {
  const { clubId } = req.params;
  const userId = req.user.id;

  if (!isValidUuid(clubId)) {
    return res.status(400).json({ error: "ID de clube inválido" });
  }

  try {
    const result = await pool.query(
      "SELECT role FROM memberships WHERE user_id = $1 AND club_id = $2",
      [userId, clubId],
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: "Você não é membro deste clube" });
    }

    req.clubMembership = { role: result.rows[0].role };
    return next();
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "ID de clube inválido" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}

export async function clubOwnerRequired(req, res, next) {
  const { clubId } = req.params;
  const userId = req.user.id;

  if (!isValidUuid(clubId)) {
    return res.status(400).json({ error: "ID de clube inválido" });
  }

  try {
    const result = await pool.query(
      "SELECT role FROM memberships WHERE user_id = $1 AND club_id = $2",
      [userId, clubId],
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: "Você não é membro deste clube" });
    }

    if (result.rows[0].role !== "owner") {
      return res
        .status(403)
        .json({ error: "Apenas o dono do clube pode fazer isso" });
    }

    req.clubMembership = { role: result.rows[0].role };
    return next();
  } catch (err) {
    if (err.code === "22P02") {
      return res.status(400).json({ error: "ID de clube inválido" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
