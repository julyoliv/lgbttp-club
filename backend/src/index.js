import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { pool } from "./db.js";

import authRoutes from "./routes/auth.js";
import clubsRoutes from "./routes/clubs.js";
import meetingsRoutes from "./routes/meetings.js";
import attendancesRoutes from "./routes/attendances.js";
import suggestionsRoutes from "./routes/suggestions.js";
import reviewsRoutes from "./routes/reviews.js";
import messagesRoutes from "./routes/messages.js";
import clubIntegrationsRoutes from "./routes/clubIntegrations.js";

const app = express();

app.use(helmet());
app.use(cookieParser());

// Permite localhost em dev, e a URL da Vercel/Netlify em produção
const allowedOrigins = [
  "http://192.168.15.50:5173",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
});
app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);

// --- ROTAS DA API ---
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Erro no health check:", err.message);
    res.status(500).json({ status: "db_down" });
  }
});

app.use("/auth", authRoutes);
app.use("/clubs", clubsRoutes);
app.use("/clubs/:clubId/meetings", meetingsRoutes);
app.use("/clubs/:clubId/meetings/:meetingId/attendances", attendancesRoutes);
app.use("/clubs/:clubId/suggestions", suggestionsRoutes);
app.use("/clubs/:clubId/meetings/:meetingId/reviews", reviewsRoutes);
app.use("/clubs/:clubId/messages", messagesRoutes);
app.use("/", clubIntegrationsRoutes);

// --- TRATAMENTO DE ERROS (inclui erro de JSON malformado no body) ---
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res
      .status(400)
      .json({ error: "JSON inválido no corpo da requisição" });
  }
  console.error(err.stack);
  return res.status(500).json({ error: "Erro interno no servidor" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
