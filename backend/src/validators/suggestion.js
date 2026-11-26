const MAX_BASE64_LENGTH = 2_800_000; // ~2 MB em string Base64
const DATA_IMAGE_RE =
  /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;
const ALLOWED_SOURCES = ["tmdb", "google_books", "open_library", "manual"];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidCover(value) {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  const trimmed = value.trim();

  if (trimmed.startsWith("data:image/")) {
    return trimmed.length <= MAX_BASE64_LENGTH && DATA_IMAGE_RE.test(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateCreateSuggestion(body) {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      errors: [{ field: "body", message: "Corpo da requisição inválido" }],
    };
  }

  const errors = [];
  const data = {};

  if (typeof body.title !== "string" || body.title.trim().length < 2) {
    errors.push({
      field: "title",
      message: "Título deve ter ao menos 2 caracteres",
    });
  } else {
    data.title = body.title.trim();
  }

  if (
    body.author !== undefined &&
    body.author !== null &&
    typeof body.author !== "string"
  ) {
    errors.push({ field: "author", message: "Autor deve ser um texto" });
  } else {
    const trimmedAuthor =
      typeof body.author === "string" ? body.author.trim() : "";
    data.author = trimmedAuthor.length > 0 ? trimmedAuthor : null;
  }

  if (typeof body.reason !== "string" || body.reason.trim().length < 5) {
    errors.push({
      field: "reason",
      message: "O motivo da indicação deve ter ao menos 5 caracteres",
    });
  } else if (body.reason.trim().length > 1000) {
    errors.push({
      field: "reason",
      message: "O motivo da indicação deve ter no máximo 1000 caracteres",
    });
  } else {
    data.reason = body.reason.trim();
  }

  if (!isValidCover(body.cover_url)) {
    errors.push({
      field: "cover_url",
      message:
        "Informe uma capa válida (imagem enviada ou URL http/https dentro do tamanho permitido)",
    });
  } else {
    data.cover_url = body.cover_url.trim();
  }

  if (body.external_source !== undefined && body.external_source !== null) {
    if (!ALLOWED_SOURCES.includes(body.external_source)) {
      errors.push({
        field: "external_source",
        message: "Origem externa inválida",
      });
    } else {
      data.external_source = body.external_source;
    }
  } else {
    data.external_source = "manual";
  }

  if (body.external_id !== undefined && body.external_id !== null) {
    if (
      typeof body.external_id !== "string" ||
      body.external_id.trim().length === 0
    ) {
      errors.push({
        field: "external_id",
        message: "Identificador externo inválido",
      });
    } else {
      data.external_id = body.external_id.trim();
    }
  } else {
    data.external_id = null;
  }

  if (body.release_year !== undefined && body.release_year !== null) {
    const yearNum = Number(body.release_year);
    if (!Number.isInteger(yearNum) || yearNum < 1000 || yearNum > 2100) {
      errors.push({
        field: "release_year",
        message: "Ano de lançamento inválido",
      });
    } else {
      data.release_year = yearNum;
    }
  } else {
    data.release_year = null;
  }

  return errors.length ? { ok: false, errors } : { ok: true, data };
}
