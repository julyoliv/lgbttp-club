import { Router } from "express";
import { pool } from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { clubMemberRequired } from "../middleware/clubAuth.js";
import {
  searchMoviesTmdb,
  searchBooksGoogle,
} from "../services/catalogSearch.js";

const router = Router({ mergeParams: true });

router.use(authRequired);

router.get(
  "/clubs/:clubId/integrations/search",
  clubMemberRequired,
  async (req, res) => {
    try {
      const { clubId } = req.params;
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

      if (q.length < 2) {
        return res.status(400).json({
          error: "Informe ao menos 2 caracteres para buscar.",
        });
      }

      const clubResult = await pool.query(
        "SELECT id, type FROM clubs WHERE id = $1",
        [clubId],
      );

      if (clubResult.rowCount === 0) {
        return res.status(404).json({
          error: "Clube não encontrado.",
        });
      }

      const clubType = clubResult.rows[0].type;

      if (clubType === "movie") {
        const results = await searchMoviesTmdb(q, page);
        return res.json({
          source: "tmdb",
          clubType: "movie",
          results,
        });
      }

      if (clubType === "book") {
        const results = await searchBooksGoogle(q, 8);
        return res.json({
          source: "google_books",
          clubType: "book",
          results,
        });
      }

      return res.status(400).json({
        error: `Tipo de clube não suportado: ${clubType}`,
      });
    } catch (err) {
      if (err.code === "22P02") {
        return res.status(400).json({ error: "ID de clube inválido" });
      }
      console.error("[integrations/search]", err);
      return res.status(502).json({
        error: "Não foi possível consultar o catálogo externo no momento.",
      });
    }
  },
);

export default router;
