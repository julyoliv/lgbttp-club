const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";
const GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1/volumes";

function extractYear(dateString) {
  if (!dateString || typeof dateString !== "string") return null;
  const match = dateString.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function normalizeHttps(url) {
  if (!url || typeof url !== "string") return null;
  return url.replace(/^http:\/\//i, "https://");
}

function buildSubtitle(author, year) {
  const parts = [author, year].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : null;
}

async function fetchTmdbDirector(movieId, apiKey) {
  try {
    const url = `${TMDB_BASE_URL}/movie/${movieId}/credits?language=pt-BR&api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;

    const data = await res.json();
    const crew = Array.isArray(data.crew) ? data.crew : [];
    const directors = [
      ...new Set(
        crew
          .filter((person) => person.job === "Director" && person.name)
          .map((person) => person.name),
      ),
    ];

    return directors.length > 0 ? directors.join(", ") : null;
  } catch {
    return null;
  }
}

export async function searchMoviesTmdb(query, page = 1) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY não configurada no servidor.");
  }

  const url = new URL(`${TMDB_BASE_URL}/search/movie`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("page", String(page));
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) {
    throw new Error(`Falha na TMDb (HTTP ${res.status})`);
  }

  const data = await res.json();
  const rawItems = Array.isArray(data.results) ? data.results.slice(0, 8) : [];

  return Promise.all(
    rawItems.map(async (movie) => {
      const year = extractYear(movie.release_date);
      const director = await fetchTmdbDirector(movie.id, apiKey);
      const author = director || "Diretor não informado";
      const coverUrl = movie.poster_path
        ? `${TMDB_IMG_BASE}${movie.poster_path}`
        : null;

      return {
        externalId: String(movie.id),
        source: "tmdb",
        title: movie.title || "Sem título",
        author,
        year,
        coverUrl,
        subtitle: buildSubtitle(director, year),
      };
    }),
  );
}

export async function searchBooksGoogle(query, maxResults = 8) {
  const url = new URL(GOOGLE_BOOKS_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("printType", "books");

  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) {
    throw new Error(`Falha na Google Books (HTTP ${res.status})`);
  }

  const data = await res.json();
  const rawItems = Array.isArray(data.items) ? data.items : [];

  return rawItems.map((item) => {
    const info = item.volumeInfo || {};
    const authorsList = Array.isArray(info.authors)
      ? info.authors.filter(Boolean)
      : [];
    const author =
      authorsList.length > 0 ? authorsList.join(", ") : "Autor não informado";
    const year = extractYear(info.publishedDate);
    const rawCover =
      info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
    const coverUrl = normalizeHttps(rawCover);

    return {
      externalId: String(item.id),
      source: "google_books",
      title: info.title || "Sem título",
      author,
      year,
      coverUrl,
      subtitle: buildSubtitle(authorsList.length > 0 ? author : null, year),
    };
  });
}
