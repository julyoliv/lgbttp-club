import { useCallback, useEffect, useState } from "react";
import { suggestionsApi, clubsApi, integrationsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  Target,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Star,
  Info,
  Film,
  BookOpen,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import { MeetingsListSkeleton } from "./LoadingSkeletons";
import CoverImage from "./CoverImage";

export default function ClubSuggestions({
  clubId,
  isOwner,
  club,
  onGoToMeeting,
}) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  // Busca no catálogo (TMDb / Google Books via backend)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Campos da sugestão
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [reason, setReason] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [externalSource, setExternalSource] = useState("manual");
  const [externalId, setExternalId] = useState(null);
  const [releaseYear, setReleaseYear] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [phase, setPhase] = useState(club?.suggestion_phase ?? "idle");
  const [theme, setTheme] = useState(club?.current_theme ?? "");
  const [maxVotes, setMaxVotes] = useState(club?.max_votes_per_user ?? 3);
  const [maxSugg, setMaxSugg] = useState(club?.max_suggestions_per_user ?? 1);

  useEffect(() => {
    if (club) {
      setPhase(club.suggestion_phase ?? "idle");
      setTheme(club.current_theme ?? "");
      setMaxVotes(club.max_votes_per_user ?? 3);
      setMaxSugg(club.max_suggestions_per_user ?? 1);
    }
  }, [club]);

  const loadSuggestions = useCallback(
    async ({ showSpinner = true, signal } = {}) => {
      if (showSpinner) setLoading(true);
      try {
        const { suggestions: fetched } = await suggestionsApi.list(clubId, {
          signal,
        });
        setSuggestions(fetched || []);
      } catch (err) {
        if (err?.name !== "AbortError") {
          setError(err.message || "Erro ao carregar");
        }
      } finally {
        if (showSpinner && !signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [clubId],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadSuggestions({ showSpinner: true, signal: controller.signal });
    return () => controller.abort();
  }, [loadSuggestions]);

  // --- BUSCA COM DEBOUNCE E ABORTCONTROLLER ---
  useEffect(() => {
    if (!showForm || phase !== "suggesting" || !showDropdown) {
      setSearching(false);
      return;
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timerId = setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const data = await integrationsApi.search(clubId, trimmed, 1, {
          signal: controller.signal,
        });
        setSearchResults(Array.isArray(data.results) ? data.results : []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setSearchError(err.message || "Erro ao buscar no catálogo");
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timerId);
      controller.abort();
    };
  }, [clubId, searchQuery, showForm, phase, showDropdown]);

  function handleSelectSearchResult(item) {
    const cleanAuthor =
      item.author && !item.author.toLowerCase().includes("não informado")
        ? item.author
        : "";

    setTitle(item.title || "");
    setAuthor(cleanAuthor);
    setExternalSource(item.source || "manual");
    setExternalId(item.externalId || null);
    setReleaseYear(item.year ?? null);

    if (item.coverUrl) {
      setCoverUrl(item.coverUrl);
      setImagePreview(item.coverUrl);
    } else {
      setCoverUrl("");
      setImagePreview(null);
    }

    setShowDropdown(false);
    setSearchError("");
  }

  function handleTitleChange(value) {
    setTitle(value);
    if (externalId) {
      setExternalSource("manual");
      setExternalId(null);
      setReleaseYear(null);
    }
  }

  function resetSuggestionForm() {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setShowDropdown(false);
    setTitle("");
    setAuthor("");
    setReason("");
    setCoverUrl("");
    setImagePreview(null);
    setExternalSource("manual");
    setExternalId(null);
    setReleaseYear(null);
  }

  // --- REDIMENSIONAMENTO DA IMAGEM ---
  const handleImageUpload = (e) => {
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

        const base64String = canvas.toDataURL("image/jpeg", 0.8);
        setImagePreview(base64String);
        setCoverUrl(base64String);
        setExternalSource("manual");
        setExternalId(null);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  async function handleUpdatePhase(newPhase) {
    setActionError("");
    try {
      await clubsApi.updatePhase(clubId, {
        suggestion_phase: newPhase,
        current_theme: theme,
        max_votes_per_user: Number(maxVotes),
        max_suggestions_per_user: Number(maxSugg),
      });
      setPhase(newPhase);
    } catch (err) {
      setActionError(err.message || "Erro ao atualizar configurações");
    }
  }

  async function handleResetCycle() {
    if (
      !window.confirm(
        "Isso vai apagar todas as sugestões atuais e o histórico. Tem certeza?",
      )
    )
      return;
    setActionError("");
    try {
      await suggestionsApi.reset(clubId);
      setPhase("suggesting");
      setTheme("");
      await loadSuggestions({ showSpinner: false });
    } catch (err) {
      setActionError(err.message || "Erro ao reiniciar ciclo");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!coverUrl) {
      setActionError("A capa da obra é obrigatória.");
      return;
    }
    setSubmitting(true);
    setActionError("");
    try {
      await suggestionsApi.create(clubId, {
        title,
        author,
        reason,
        cover_url: coverUrl,
        external_source: externalSource,
        external_id: externalId,
        release_year: releaseYear,
      });
      resetSuggestionForm();
      setShowForm(false);
      await loadSuggestions({ showSpinner: false });
    } catch (err) {
      setActionError(err.message || "Erro ao criar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(id) {
    setActionError("");
    const snapshot = suggestions;
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              voted_by_me: !s.voted_by_me,
              votes_count: s.voted_by_me
                ? Number(s.votes_count) - 1
                : Number(s.votes_count) + 1,
            }
          : s,
      ),
    );
    try {
      await suggestionsApi.vote(clubId, id);
    } catch (err) {
      setSuggestions(snapshot);
      setActionError(err.message || "Erro ao registrar voto");
    }
  }

  async function handleChoose(suggestionId, status) {
    const action = status === "chosen" ? "escolher" : "rejeitar";
    if (!window.confirm(`Tem certeza que deseja ${action} esta sugestão?`))
      return;
    setActionError("");
    try {
      await suggestionsApi.choose(clubId, suggestionId, status);
      await loadSuggestions({ showSpinner: false });
    } catch (err) {
      setActionError(err.message || "Erro ao atualizar sugestão");
    }
  }

  const handleCreateMeeting = () => {
    const works = chosenSuggestions.map((s) => ({
      title: s.title,
      author: s.author,
      suggestionId: s.id,
      cover_url: s.cover_url,
    }));
    onGoToMeeting(works);
  };

  if (loading) {
    return <MeetingsListSkeleton count={3} />;
  }

  const isBook = club?.type === "book";
  const activeSuggestions = suggestions.filter((s) => s.status === "open");
  const historySuggestions = suggestions.filter((s) => s.status !== "open");
  const chosenSuggestions = suggestions.filter((s) => s.status === "chosen");

  const numericMaxVotes = Number(maxVotes);
  const numericMaxSugg = Number(maxSugg);

  const myVotesCount = activeSuggestions.filter((s) => s.voted_by_me).length;
  const hasVotedAll = myVotesCount >= numericMaxVotes;
  const mySuggestionsCount = activeSuggestions.filter(
    (s) => s.suggested_by === user?.id || s.suggested_by_name === "Você",
  ).length;
  const canSuggestMore = mySuggestionsCount < numericMaxSugg;

  const getVotingStatus = () => {
    if (phase === "suggesting") return "Votação iniciará em breve";
    if (phase === "voting") return "Votação aberta";
    return "Votação encerrada";
  };

  const renderSuggestionCard = (s, isHistory = false) => {
    const isVoteDisabled = !s.voted_by_me && hasVotedAll;

    return (
      <div
        key={s.id}
        className={`bg-white p-4 sm:p-5 rounded-lg shadow-sm border-l-4 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center transition-all ${s.status === "chosen" ? "border-green-500 bg-green-50/30" : s.status === "rejected" || s.status === "created" ? "border-gray-200 opacity-60 bg-gray-50" : "border-gray-300"}`}
      >
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:flex-1">
          {/* IMAGEM CENTRALIZADA NO MOBILE E À ESQUERDA NO DESKTOP */}
          <div className="mx-auto sm:mx-0">
            <CoverImage
              src={s.cover_url}
              alt={s.title}
              clubType={club?.type}
              className="w-24 h-36"
            />
          </div>

          <div>
            <div className="flex items-start gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-gray-900 text-lg">
                {s.title}
                {s.release_year && (
                  <span className="font-normal text-sm text-gray-500 ml-1.5">
                    ({s.release_year})
                  </span>
                )}
              </h3>
              {s.status === "chosen" && (
                <span className="text-[11px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 uppercase tracking-wider border border-green-200">
                  <CheckCircle2 size={12} /> Escolhida
                </span>
              )}
              {s.status === "created" && (
                <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 uppercase tracking-wider border border-gray-200">
                  <Film size={12} /> Sessão Criada
                </span>
              )}
              {s.status === "rejected" && (
                <span className="text-[11px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Rejeitada
                </span>
              )}
            </div>

            {s.author && (
              <p className="text-sm font-medium text-gray-600 mb-2">
                {s.author}
              </p>
            )}

            {s.reason && (
              <div className="text-sm text-gray-700 bg-gray-100 p-3 rounded-md border border-gray-200 mb-2 flex gap-2 items-start">
                <Info size={16} className="text-gray-500 mt-0.5 shrink-0" />
                <p className="italic text-xs leading-relaxed">"{s.reason}"</p>
              </div>
            )}

            {s.suggested_by_name && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                Sugerido por:{" "}
                <span
                  className={`font-semibold ${s.suggested_by_name === "Você" ? "text-gray-900" : "text-gray-700"}`}
                >
                  {s.suggested_by_name}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
          {!isHistory && isOwner && s.status === "open" && (
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleChoose(s.id, "chosen")}
                className="flex-1 sm:flex-none text-xs px-3 py-2 sm:py-1.5 bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 font-medium"
              >
                Escolher
              </button>
              <button
                type="button"
                onClick={() => handleChoose(s.id, "rejected")}
                className="flex-1 sm:flex-none text-xs px-3 py-2 sm:py-1.5 bg-gray-50 text-gray-600 rounded border border-gray-200 hover:bg-gray-100 font-medium"
              >
                Rejeitar
              </button>
            </div>
          )}

          {!isHistory && s.status === "open" ? (
            phase === "voting" ? (
              <button
                type="button"
                onClick={() => handleVote(s.id)}
                disabled={isVoteDisabled}
                className={`w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 rounded-lg border shadow-sm transition-all ${
                  s.voted_by_me
                    ? "bg-gray-900 text-white border-gray-900"
                    : isVoteDisabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white hover:bg-gray-50 text-gray-700"
                }`}
              >
                <Star size={16} className={s.voted_by_me ? "fill-white" : ""} />
                {isOwner && (
                  <span className="font-bold text-sm">{s.votes_count}</span>
                )}
              </button>
            ) : (
              <div className="w-full sm:w-auto justify-center text-xs sm:text-sm font-semibold text-gray-500 bg-gray-50 sm:bg-white border border-gray-200 px-4 py-2 rounded-lg flex items-center gap-2">
                {isOwner ? (
                  <>{s.votes_count} voto(s)</>
                ) : (
                  <>
                    <Info size={16} className="text-gray-400 shrink-0" />
                    <span>{getVotingStatus()}</span>
                  </>
                )}
              </div>
            )
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div>
      {isOwner && (
        <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl mb-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Target size={18} /> Controle da Votação
          </h3>
          <div className="flex gap-2 mb-5 flex-wrap">
            <button
              type="button"
              onClick={() => handleUpdatePhase("idle")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${phase === "idle" ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
            >
              Fechado
            </button>
            <button
              type="button"
              onClick={() => handleUpdatePhase("suggesting")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${phase === "suggesting" ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
            >
              Receber Sugestões
            </button>
            <button
              type="button"
              onClick={() => handleUpdatePhase("voting")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${phase === "voting" ? "bg-gray-900 text-white border-gray-900" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
            >
              Aberto para Votação
            </button>
          </div>
          <div className="flex gap-4 text-sm text-gray-700 flex-wrap mb-5 items-end">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Tema do Ciclo
              </span>
              <input
                type="text"
                placeholder="Ex: Halloween..."
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-48 border border-gray-300 px-3 py-1.5 rounded-lg text-sm"
                onBlur={() => handleUpdatePhase(phase)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Máx. Sugestões
              </span>
              <input
                type="number"
                min="0"
                value={maxSugg}
                onChange={(e) => setMaxSugg(e.target.value)}
                className="w-20 border border-gray-300 px-3 py-1.5 rounded-lg text-sm"
                onBlur={() => handleUpdatePhase(phase)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Máx. Votos
              </span>
              <input
                type="number"
                min="0"
                value={maxVotes}
                onChange={(e) => setMaxVotes(e.target.value)}
                className="w-20 border border-gray-300 px-3 py-1.5 rounded-lg text-sm"
                onBlur={() => handleUpdatePhase(phase)}
              />
            </label>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleResetCycle}
              className="text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-1.5"
            >
              Iniciar Novo Ciclo (Limpar)
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-gray-900">Sugestões</h2>
          {theme ? (
            <div className="text-sm text-gray-800 font-medium mt-1.5 inline-flex items-start gap-2 bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200 max-w-full">
              <Target size={15} className="text-gray-500 mt-0.5 shrink-0" />
              <span className="leading-snug">Tema atual: {theme}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Tema livre</p>
          )}
        </div>

        {phase === "suggesting" && canSuggestMore && (
          <button
            type="button"
            onClick={() => {
              if (showForm) resetSuggestionForm();
              setShowForm((prev) => !prev);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm font-medium flex items-center justify-center gap-2 shrink-0"
          >
            {showForm ? (
              "Cancelar"
            ) : (
              <>
                <Plus size={16} /> Sugerir Obra
              </>
            )}
          </button>
        )}

        {phase === "suggesting" && !canSuggestMore && (
          <span className="w-full sm:w-auto text-xs sm:text-sm text-gray-600 italic bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 text-center sm:text-left shrink-0">
            Você já atingiu o limite de sugestões.
          </span>
        )}
      </div>

      {(error || actionError) && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg border border-red-100">
          {actionError || error}
        </p>
      )}

      {isOwner && chosenSuggestions.length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-green-100 p-2 rounded-full text-green-700 shrink-0">
              {isBook ? <BookOpen size={20} /> : <Film size={20} />}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-green-900">
                {isBook ? "Leitura Pronta!" : "Sessão Pronta!"}
              </p>
              <p className="text-sm text-green-700">
                {chosenSuggestions.length} {isBook ? "livro(s)" : "filme(s)"}{" "}
                escolhido(s).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateMeeting}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0 transition-colors"
          >
            Agendar {isBook ? "Leitura" : "Sessão"} <ArrowRight size={16} />
          </button>
        </div>
      )}

      {showForm && phase === "suggesting" && (
        <form
          onSubmit={handleCreate}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-4"
        >
          {/* BUSCA NO CATÁLOGO (TMDB / GOOGLE BOOKS) */}
          <div className="relative bg-gray-50 p-3.5 rounded-lg border border-gray-200">
            <label
              htmlFor="catalog-search-input"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5 flex items-center gap-1.5"
            >
              <Search size={14} />
              Buscar {isBook ? "livro" : "filme"} para preencher automaticamente
            </label>
            <input
              id="catalog-search-input"
              type="text"
              placeholder={
                isBook
                  ? "Digite o título ou autor do livro..."
                  : "Digite o nome do filme..."
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm"
            />

            {searching && (
              <p className="text-xs text-gray-500 mt-2">
                Buscando no catálogo...
              </p>
            )}
            {searchError && (
              <p className="text-xs text-red-600 mt-2">{searchError}</p>
            )}

            {showDropdown && searchResults.length > 0 && (
              <ul className="mt-2 bg-white border border-gray-200 rounded-lg shadow-md divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {searchResults.map((item) => (
                  <li key={`${item.source}-${item.externalId}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full p-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                      <CoverImage
                        src={item.coverUrl}
                        alt={item.title}
                        clubType={club?.type}
                        className="w-10 h-14"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-xs text-gray-500 truncate">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isBook ? "Título do Livro" : "Nome do Filme"}
            </label>
            <input
              placeholder={isBook ? "Ex: O Hobbit" : "Ex: O Poderoso Chefão"}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isBook ? "Autor(a)" : "Diretor(a)"}
            </label>
            <input
              placeholder={
                isBook ? "Ex: J.R.R. Tolkien" : "Ex: Francis Ford Coppola"
              }
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ano de lançamento
            </label>
            <input
              type="number"
              min="1000"
              max="2100"
              placeholder={isBook ? "Ex: 1954" : "Ex: 1942"}
              value={releaseYear ?? ""}
              onChange={(e) =>
                setReleaseYear(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isBook
                ? "Por que deveríamos ler essa obra?"
                : "Por que deveríamos assistir essa obra?"}
            </label>
            <textarea
              placeholder="Descreva brevemente o motivo..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <ImageIcon size={16} /> Capa da obra (Obrigatório)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-900 file:text-white hover:file:bg-black"
              required={!imagePreview}
            />
            {imagePreview && (
              <div className="mt-4 flex items-center gap-4">
                <CoverImage
                  src={imagePreview}
                  alt="Preview"
                  clubType={club?.type}
                  className="w-24 h-36"
                />
                <span className="text-xs text-green-600 font-medium">
                  {externalId
                    ? "Capa selecionada do catálogo!"
                    : "Imagem carregada com sucesso!"}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm font-medium disabled:opacity-50"
            >
              {submitting ? "Enviando..." : "Enviar Sugestão"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4 mb-8">
        {phase === "voting" && activeSuggestions.length > 0 && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${hasVotedAll ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}
          >
            <div>
              <p
                className={`font-semibold flex items-center gap-2 ${hasVotedAll ? "text-green-800" : "text-orange-800"}`}
              >
                {hasVotedAll ? (
                  <>
                    <CheckCircle2 size={18} /> Você já usou todos os seus votos!
                  </>
                ) : (
                  <>
                    <AlertCircle size={18} /> Você já votou em {myVotesCount} de{" "}
                    {numericMaxVotes} obras.
                  </>
                )}
              </p>
              {!hasVotedAll && (
                <p className="text-sm text-orange-600 mt-1">
                  Faltam {numericMaxVotes - myVotesCount} voto(s) para
                  completar.
                </p>
              )}
            </div>
            {!hasVotedAll && (
              <div className="w-10 h-10 rounded-full bg-white border-2 border-orange-400 flex items-center justify-center font-bold text-orange-600 shadow-sm">
                {numericMaxVotes - myVotesCount}
              </div>
            )}
          </div>
        )}

        {activeSuggestions.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
            <p className="text-gray-500">Nenhuma sugestão ativa no momento.</p>
          </div>
        ) : (
          activeSuggestions.map((s) => renderSuggestionCard(s, false))
        )}
      </div>

      {historySuggestions.length > 0 && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
          >
            {showHistory ? "Ocultar" : "Ver"} histórico de sugestões (
            {historySuggestions.length})
          </button>
          {showHistory && (
            <div className="space-y-4 opacity-75 grayscale-[20%]">
              {historySuggestions.map((s) => renderSuggestionCard(s, true))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
