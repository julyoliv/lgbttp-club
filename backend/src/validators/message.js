function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateMessage(body) {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      errors: [{ field: "body", message: "Corpo da requisição inválido" }],
    };
  }

  const errors = [];
  const data = {};

  if (typeof body.body !== "string") {
    errors.push({ field: "body", message: "O recado deve ser um texto" });
  } else {
    const trimmed = body.body.trim();
    if (trimmed.length < 1) {
      errors.push({ field: "body", message: "O recado não pode estar vazio" });
    } else if (trimmed.length > 500) {
      errors.push({
        field: "body",
        message: "O recado deve ter no máximo 500 caracteres",
      });
    } else {
      data.body = trimmed;
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, data };
}
