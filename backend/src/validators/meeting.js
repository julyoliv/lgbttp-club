function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateCreateMeeting(body) {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      errors: [{ field: "body", message: "Corpo da requisição inválido" }],
    };
  }

  const errors = [];
  const data = {};

  if (typeof body.title !== "string" || body.title.trim().length < 1) {
    errors.push({ field: "title", message: "Título é obrigatório" });
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

  if (
    body.theme !== undefined &&
    body.theme !== null &&
    typeof body.theme !== "string"
  ) {
    errors.push({ field: "theme", message: "Tema deve ser um texto" });
  } else {
    const trimmedTheme =
      typeof body.theme === "string" ? body.theme.trim() : "";
    data.theme = trimmedTheme.length > 0 ? trimmedTheme : null;
  }

  if (
    body.cover_url !== undefined &&
    body.cover_url !== null &&
    typeof body.cover_url !== "string"
  ) {
    errors.push({
      field: "cover_url",
      message: "Capa deve ser um texto ou URL",
    });
  } else {
    const trimmedCover =
      typeof body.cover_url === "string" ? body.cover_url.trim() : "";
    data.cover_url = trimmedCover.length > 0 ? trimmedCover : null;
  }

  if (
    typeof body.scheduled_at !== "string" ||
    Number.isNaN(Date.parse(body.scheduled_at))
  ) {
    errors.push({
      field: "scheduled_at",
      message: "Data do encontro é obrigatória e deve ser válida",
    });
  } else {
    data.scheduled_at = body.scheduled_at.trim();
  }

  if (
    body.description !== undefined &&
    body.description !== null &&
    typeof body.description !== "string"
  ) {
    errors.push({
      field: "description",
      message: "Descrição deve ser um texto",
    });
  } else {
    const trimmedDesc =
      typeof body.description === "string" ? body.description.trim() : "";
    data.description = trimmedDesc.length > 0 ? trimmedDesc : null;
  }

  return errors.length ? { ok: false, errors } : { ok: true, data };
}
