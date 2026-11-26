const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateRegister(body) {
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
      message: "Nome deve ter ao menos 2 caracteres",
    });
  } else {
    data.name = body.name.trim();
  }

  const normalizedEmail =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    errors.push({ field: "email", message: "Email inválido" });
  } else {
    data.email = normalizedEmail;
  }

  if (typeof body.password !== "string" || body.password.length < 8) {
    errors.push({
      field: "password",
      message: "Senha deve ter ao menos 8 caracteres",
    });
  } else {
    data.password = body.password;
  }

  return errors.length ? { ok: false, errors } : { ok: true, data };
}

export function validateLogin(body) {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      errors: [{ field: "body", message: "Corpo da requisição inválido" }],
    };
  }

  const errors = [];
  const data = {};

  const normalizedEmail =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    errors.push({ field: "email", message: "Email inválido" });
  } else {
    data.email = normalizedEmail;
  }

  if (typeof body.password !== "string" || body.password.length === 0) {
    errors.push({ field: "password", message: "Senha é obrigatória" });
  } else {
    data.password = body.password;
  }

  return errors.length ? { ok: false, errors } : { ok: true, data };
}
