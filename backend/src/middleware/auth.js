import jwt from "jsonwebtoken";

function extractToken(req) {
  if (req.cookies?.token && typeof req.cookies.token === "string") {
    return req.cookies.token;
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  return null;
}

export function authRequired(req, res, next) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET não configurado no ambiente");
    return res.status(500).json({ error: "Erro interno no servidor" });
  }

  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload?.sub) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }

    req.user = { id: String(payload.sub) };
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
