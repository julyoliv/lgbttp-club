function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateReview(body) {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      errors: [{ field: "body", message: "Corpo da requisição inválido" }],
    };
  }

  const errors = [];
  const data = {};

  if (
    typeof body.rating !== "number" ||
    !Number.isInteger(body.rating) ||
    body.rating < 1 ||
    body.rating > 5
  ) {
    errors.push({
      field: "rating",
      message: "A nota deve ser um número inteiro entre 1 e 5",
    });
  } else {
    data.rating = body.rating;
  }

  if (
    body.body !== undefined &&
    body.body !== null &&
    typeof body.body !== "string"
  ) {
    errors.push({ field: "body", message: "A resenha deve ser um texto" });
  } else {
    const trimmed = typeof body.body === "string" ? body.body.trim() : "";
    data.body = trimmed.length > 0 ? trimmed : null;
  }

  return errors.length ? { ok: false, errors } : { ok: true, data };
}
