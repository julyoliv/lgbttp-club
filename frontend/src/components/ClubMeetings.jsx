import { useState, useEffect } from "react";
import { meetingsApi, integrationsApi } from "../api/client";
import MeetingCard from "./MeetingCard";
import { Plus, Calendar, Upload, X, Search, Tag } from "lucide-react";
import { MeetingsListSkeleton } from "./LoadingSkeletons";

export default function ClubMeetings({
  club,
  isOwner,
  currentUser,
  prefill = null,
  onClearPrefill,
}) {
  const clubId = club?.id;
  const isBook = club?.type === "book";

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [theme, setTheme] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);

  useEffect(() => {
    const item = Array.isArray(prefill) ? prefill[0] : prefill;
    if (!item) return;

    setTitle(item.title || "");
    setAuthor(item.author || "");
    setCoverUrl(item.cover_url || "");
    if (item.theme) setTheme(item.theme);
    setShowCreateForm(true);
  }, [prefill]);

  async function fetchMeetings(signal) {
    if (!clubId) return;
    try {
      setLoading(true);
      const data = await meetingsApi.list(clubId, { signal });
      setMeetings(data.meetings || []);
    } catch (err) {
      if (err?.name !== "AbortError") {
        setError(err.message || "Erro ao carregar encontros");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchMeetings(controller.signal);
    return () => controller.abort();
  }, [clubId]);

  useEffect(() => {
    if (!showResults || !clubId) return;

    const query = title.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setSearchingCatalog(true);
        const data = await integrationsApi.search(clubId, query, 1, {
          signal: controller.signal,
        });
        setSearchResults(data.results || []);
      } catch (err) {
        if (err?.name !== "AbortError") {
          setSearchResults([]);
        }
      } finally {
        setSearchingCatalog(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [title, showResults, clubId]);

  function handleSelectCatalogItem(item) {
    setTitle(item.title || title);
    setAuthor(item.author || author);
    if (item.coverUrl || item.cover_url) {
      setCoverUrl(item.coverUrl || item.cover_url);
    }
    setShowResults(false);
    setSearchResults([]);
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 450;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        setCoverUrl(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function resetForm() {
    setTitle("");
    setAuthor("");
    setTheme("");
    setCoverUrl("");
    setScheduledAt("");
    setDescription("");
    setShowResults(false);
    setSearchResults([]);
  }

  async function handleCreateMeeting(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const isoDate = new Date(scheduledAt).toISOString();

      await meetingsApi.create(clubId, {
        title: title.trim(),
        author: author.trim() || null,
        theme: theme.trim() || null,
        cover_url: coverUrl || null,
        scheduled_at: isoDate,
        description: description.trim() || null,
      });

      resetForm();
      setShowCreateForm(false);
      onClearPrefill?.();
      fetchMeetings();
    } catch (err) {
      setError(err.message || "Erro ao criar encontro");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancelCreate() {
    setShowCreateForm(false);
    resetForm();
    onClearPrefill?.();
  }

  if (loading) {
    return <MeetingsListSkeleton count={2} />;
  }

  // 1. Ordena do encontro mais novo para o mais antigo
  const sortedMeetings = [...meetings].sort(
    (a, b) =>
      new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
  );

  // 2. Agrupa obras do mesmo encontro (mesma data/hora e mesmo tema)
  const groupedMeetings = sortedMeetings.reduce((groups, meeting) => {
    const normalizedTheme = (meeting.theme || "").trim().toLowerCase();
    const dateKey = new Date(meeting.scheduled_at).toISOString().slice(0, 16);
    const groupKey = `${dateKey}__${normalizedTheme}`;

    const existingGroup = groups.find((g) => g.key === groupKey);
    if (existingGroup) {
      existingGroup.items.push(meeting);
      if (
        meeting.description &&
        !existingGroup.descriptions.includes(meeting.description.trim())
      ) {
        existingGroup.descriptions.push(meeting.description.trim());
      }
    } else {
      groups.push({
        key: groupKey,
        theme: (meeting.theme || "").trim(),
        scheduled_at: meeting.scheduled_at,
        descriptions: meeting.description ? [meeting.description.trim()] : [],
        items: [meeting],
      });
    }
    return groups;
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Encontros</h2>
        {isOwner && (
          <button
            type="button"
            onClick={() =>
              showCreateForm ? handleCancelCreate() : setShowCreateForm(true)
            }
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm font-medium flex items-center gap-2 transition-colors"
          >
            {showCreateForm ? (
              "Cancelar"
            ) : (
              <>
                <Plus size={16} /> Novo Encontro
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
          {error}
        </p>
      )}

      {showCreateForm && isOwner && (
        <form
          onSubmit={handleCreateMeeting}
          className="bg-white p-5 rounded-xl border border-gray-200 mb-6 space-y-4 shadow-sm"
        >
          {prefill && (
            <div className="bg-green-50 text-green-800 text-xs p-2.5 rounded-lg border border-green-200">
              Obra importada das sugestões. Escolha a data para confirmar.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-start bg-gray-50 p-3.5 rounded-lg border border-gray-100">
            <div className="shrink-0 mx-auto sm:mx-0">
              {coverUrl ? (
                <div className="relative w-24 h-36 rounded-md overflow-hidden border border-gray-200 shadow-sm">
                  <img
                    src={coverUrl}
                    alt={title || "Capa"}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverUrl("")}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black"
                    title="Remover capa"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="w-24 h-36 flex flex-col items-center justify-center border border-dashed border-gray-300 rounded-md bg-white text-gray-500 hover:bg-gray-100 cursor-pointer text-xs text-center p-2 transition-colors">
                  <Upload size={18} className="mb-1 text-gray-400" />
                  <span>Adicionar capa</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>

            <div className="flex-1 space-y-2.5 w-full relative">
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={isBook ? "Título do Livro" : "Título do Filme"}
                  value={title}
                  onFocus={() => setShowResults(true)}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setShowResults(true);
                  }}
                  className="w-full p-2 pr-8 border border-gray-300 rounded-lg text-sm bg-white"
                />
                <Search
                  size={14}
                  className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none"
                />
              </div>

              {showResults &&
                (searchingCatalog || searchResults.length > 0) && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {searchingCatalog ? (
                      <p className="p-3 text-xs text-gray-500">
                        Buscando no catálogo...
                      </p>
                    ) : (
                      searchResults.map((item) => {
                        const thumb = item.coverUrl || item.cover_url;
                        const year = item.year || item.release_year;
                        return (
                          <button
                            key={`${item.source || item.external_source}-${item.externalId || item.external_id}`}
                            type="button"
                            onClick={() => handleSelectCatalogItem(item)}
                            className="w-full text-left p-2 hover:bg-gray-50 flex items-center gap-2.5 border-b border-gray-100 last:border-b-0"
                          >
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={item.title}
                                className="w-8 h-12 object-cover rounded shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-12 bg-gray-100 rounded shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {item.title} {year ? `(${year})` : ""}
                              </p>
                              {item.author && (
                                <p className="text-[11px] text-gray-500 truncate">
                                  {item.author}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

              <input
                type="text"
                placeholder={isBook ? "Autor(a)" : "Diretor(a)"}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
              />

              <input
                type="text"
                placeholder="Tema do ciclo (opcional)"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-2 bg-white">
              <Calendar size={18} className="text-gray-400" />
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full text-sm focus:outline-none"
              />
            </div>

            <textarea
              rows={2}
              placeholder="Descrição, local ou pauta (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 text-sm font-medium"
            >
              {submitting ? "Salvando..." : "Salvar Encontro"}
            </button>
          </div>
        </form>
      )}

      {groupedMeetings.length === 0 ? (
        <p className="text-gray-500 text-sm bg-gray-50 p-6 rounded-xl text-center border border-gray-200">
          Nenhum encontro agendado ainda.
        </p>
      ) : (
        <div className="space-y-6">
          {groupedMeetings.map((group) => {
            const isPast = new Date(group.scheduled_at) < new Date();
            const groupDateFormatted = new Date(
              group.scheduled_at,
            ).toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <section
                key={group.key}
                className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200/80">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg flex items-center gap-2">
                      <Tag size={16} className="text-gray-500 shrink-0" />
                      <span>
                        {group.theme ? `Tema: ${group.theme}` : "Encontro"}
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 capitalize mt-0.5">
                      {groupDateFormatted}
                    </p>
                  </div>

                  <span className="self-start sm:self-center text-[11px] bg-white text-gray-700 px-3 py-1 rounded-full font-medium border border-gray-200">
                    {isPast ? "Passado" : "Em breve"}
                  </span>
                </div>

                {group.descriptions.length > 0 && (
                  <div className="bg-white text-gray-700 text-sm p-3 sm:p-3.5 rounded-lg border border-gray-200/80 whitespace-pre-wrap">
                    {group.descriptions.join("\n\n")}
                  </div>
                )}

                <div>
                  {group.items.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      clubId={clubId}
                      clubType={club?.type}
                      currentUserId={currentUser?.id}
                      hideDate
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
