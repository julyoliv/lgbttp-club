function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateCreateClub(body) {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      errors: [{ field: "body", message: "Corpo da requisição inválido" }],
    };
  }

  const errors = [];
  const data = {};

  if (typeof body.name !== "string" || body.name.trim().length < 2) {
    errors.push({
      field: "name",
      message: "Nome do clube deve ter ao menos 2 caracteres",
    });
  } else {
    data.name = body.name.trim();
  }

  if (!["book", "movie"].includes(body.type)) {
    errors.push({
      field: "type",
      message: 'Tipo deve ser "book" ou "movie"',
    });
  } else {
    data.type = body.type;
  }

  return errors.length ? { ok: false, errors } : { ok: true, data };
}
