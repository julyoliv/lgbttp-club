import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { validateRegister, validateLogin } from "../validators/auth.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function parseExpiresInMs(value) {
  if (!value) return SEVEN_DAYS_MS;
  if (/^\d+$/.test(String(value))) {
    return Number(value) * 1000;
  }
  const match = String(value)
    .trim()
    .match(/^(\d+)([smhd])$/i);
  if (!match) return SEVEN_DAYS_MS;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
}

function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "strict",
    maxAge: parseExpiresInMs(expiresIn),
  };
}

function signAuthToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não configurado no ambiente");
  }
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// --- REGISTRO ---
router.post("/register", async (req, res) => {
  const validation = validateRegister(req.body);
  if (!validation.ok) {
    return res.status(400).json({ errors: validation.errors });
  }

  const name = validation.data.name.trim();
  const email = validation.data.email.trim().toLowerCase();
  const { password } = validation.data;

  try {
    const userExists = await pool.query(
      "SELECT id FROM users WHERE lower(email) = $1",
      [email],
    );
    if (userExists.rowCount > 0) {
      return res.status(409).json({ error: "Este email já está cadastrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, passwordHash],
    );

    const newUser = result.rows[0];
    const token = signAuthToken(newUser.id);

    res.cookie("token", token, getCookieOptions());
    return res.status(201).json({ user: newUser });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Este email já está cadastrado" });
    }
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- LOGIN ---
router.post("/login", async (req, res) => {
  const validation = validateLogin(req.body);
  if (!validation.ok) {
    return res.status(400).json({ errors: validation.errors });
  }

  const email = validation.data.email.trim().toLowerCase();
  const { password } = validation.data;

  try {
    const result = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE lower(email) = $1",
      [email],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    const token = signAuthToken(user.id);
    const { password_hash, ...userWithoutPassword } = user;

    res.cookie("token", token, getCookieOptions());
    return res.json({ user: userWithoutPassword });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// --- LOGOUT ---
router.post("/logout", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "strict",
  });
  return res.status(204).end();
});

// --- ME (usuário logado) ---
router.get("/me", authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [req.user.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

export default router;
