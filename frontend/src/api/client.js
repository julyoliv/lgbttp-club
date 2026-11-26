const RAW_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

function buildUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${normalizedPath}`;
}

async function request(path, options = {}) {
  const res = await fetch(buildUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const firstValidationMsg =
      Array.isArray(data.errors) && data.errors[0]?.message
        ? data.errors[0].message
        : null;
    const error = new Error(
      data.error || firstValidationMsg || "Erro na requisição",
    );
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (path, options = {}) => request(path, { ...options, method: "GET" }),
  post: (path, body, options = {}) =>
    request(path, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),
  patch: (path, body, options = {}) =>
    request(path, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  delete: (path, options = {}) =>
    request(path, { ...options, method: "DELETE" }),
};

export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  me: (options) => api.get("/auth/me", options),
};

export const clubsApi = {
  list: (options) => api.get("/clubs", options),
  get: (clubId, options) => api.get(`/clubs/${clubId}`, options),
  create: (data) => api.post("/clubs", data),
  join: (invite_code) => api.post("/clubs/join", { invite_code }),
  updatePhase: (clubId, data) => api.patch(`/clubs/${clubId}/phase`, data),
  delete: (clubId) => api.delete(`/clubs/${clubId}`),
};

export const messagesApi = {
  list: (clubId, options) => api.get(`/clubs/${clubId}/messages`, options),
  create: (clubId, body) => api.post(`/clubs/${clubId}/messages`, { body }),
  update: (clubId, messageId, body) =>
    api.patch(`/clubs/${clubId}/messages/${messageId}`, { body }),
  delete: (clubId, messageId) =>
    api.delete(`/clubs/${clubId}/messages/${messageId}`),
};

export const meetingsApi = {
  list: (clubId, options) => api.get(`/clubs/${clubId}/meetings`, options),
  create: (clubId, data) => api.post(`/clubs/${clubId}/meetings`, data),
};

export const attendancesApi = {
  list: (clubId, meetingId, options) =>
    api.get(`/clubs/${clubId}/meetings/${meetingId}/attendances`, options),
  update: (clubId, meetingId, status) =>
    api.post(`/clubs/${clubId}/meetings/${meetingId}/attendances`, { status }),
};

export const reviewsApi = {
  list: (clubId, meetingId, options) =>
    api.get(`/clubs/${clubId}/meetings/${meetingId}/reviews`, options),
  create: (clubId, meetingId, data) =>
    api.post(`/clubs/${clubId}/meetings/${meetingId}/reviews`, data),
  delete: (clubId, meetingId, reviewId) =>
    api.delete(`/clubs/${clubId}/meetings/${meetingId}/reviews/${reviewId}`),
};

export const suggestionsApi = {
  list: (clubId, options) => api.get(`/clubs/${clubId}/suggestions`, options),
  create: (clubId, data) => api.post(`/clubs/${clubId}/suggestions`, data),
  vote: (clubId, suggestionId) =>
    api.post(`/clubs/${clubId}/suggestions/${suggestionId}/vote`),
  choose: (clubId, suggestionId, status) =>
    api.patch(`/clubs/${clubId}/suggestions/${suggestionId}/choose`, {
      status,
    }),
  reset: (clubId) => api.delete(`/clubs/${clubId}/suggestions/reset`),
};

export const integrationsApi = {
  search: (clubId, q, page = 1, options = {}) => {
    const params = new URLSearchParams({ q, page: String(page) });
    return api.get(
      `/clubs/${clubId}/integrations/search?${params.toString()}`,
      options,
    );
  },
};
