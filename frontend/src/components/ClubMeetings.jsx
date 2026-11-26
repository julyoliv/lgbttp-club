import { useCallback, useEffect, useMemo, useState } from "react";
import { meetingsApi, attendancesApi, suggestionsApi } from "../api/client";
import MeetingCard from "./MeetingCard";
import { Plus, Calendar as CalendarIcon, Trash2, Check, X } from "lucide-react";

const EMPTY_WORK = { title: "", author: "", cover_url: "" };

function GroupAttendance({ clubId, meetingId, currentUser }) {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAttendances = useCallback(async () => {
    setError("");
    try {
      const data = await attendancesApi.list(clubId, meetingId);
      setAttendances(data.attendances || []);
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar presenças");
    } finally {
      setLoading(false);
    }
  }, [clubId, meetingId]);

  useEffect(() => {
    loadAttendances();
  }, [loadAttendances]);

  async function handleAttendance(status) {
    setError("");
    try {
      await attendancesApi.update(clubId, meetingId, status);
      await loadAttendances();
    } catch (err) {
      setError(err.message || "Erro ao confirmar presença");
    }
  }

  const myAttendance = attendances.find((a) => a.user_id === currentUser?.id);
  const goingList = attendances.filter((a) => a.status === "going");

  if (loading)
    return <p className="text-sm text-gray-400">Carregando presenças...</p>;

  return (
    <div className="flex flex-col gap-4 w-full">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => handleAttendance("going")}
          className={`flex-1 py-2 px-4 text-sm rounded-lg border flex items-center justify-center gap-1.5 font-medium transition-colors ${myAttendance?.status === "going" ? "bg-gray-900 text-white border-gray-900 shadow-sm" : "bg-white hover:bg-gray-50 text-gray-600 border-gray-300"}`}
        >
          <Check size={16} /> Vou comparecer
        </button>
        <button
          type="button"
          onClick={() => handleAttendance("not_going")}
          className={`flex-1 py-2 px-4 text-sm rounded-lg border flex items-center justify-center gap-1.5 font-medium transition-colors ${myAttendance?.status === "not_going" ? "bg-gray-600 text-white border-gray-600 shadow-sm" : "bg-white hover:bg-gray-50 text-gray-600 border-gray-300"}`}
        >
          <X size={16} /> Não vou
        </button>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Confirmados ({goingList.length}):
        </p>
        <div className="flex flex-wrap gap-2">
          {goingList.map((a) => (
            <span
              key={a.user_id}
              className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {a.name}
            </span>
          ))}
          {goingList.length === 0 && (
            <span className="italic text-gray-400 text-xs">
              Ninguém confirmou ainda.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClubMeetings({
  clubId,
  isOwner,
  currentUser,
  prefilledMeeting,
  clearPrefill,
  club,
}) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(Boolean(prefilledMeeting?.length));

  const [works, setWorks] = useState(
    prefilledMeeting && prefilledMeeting.length > 0
      ? prefilledMeeting
      : [{ ...EMPTY_WORK }],
  );

  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchMeetings = useCallback(async () => {
    try {
      const { meetings: fetched } = await meetingsApi.list(clubId);
      setMeetings(fetched || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    if (prefilledMeeting && prefilledMeeting.length > 0) {
      setWorks(prefilledMeeting);
      setShowForm(true);
    }
  }, [prefilledMeeting]);

  function handleAddWork() {
    setWorks((prev) => [...prev, { ...EMPTY_WORK }]);
  }

  function handleRemoveWork(index) {
    setWorks((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.length ? filtered : [{ ...EMPTY_WORK }];
    });
  }

  function handleWorkChange(index, field, value) {
    setWorks((prev) =>
      prev.map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    );
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const isoDate = new Date(date).toISOString();
      for (const work of works) {
        if (work.title.trim()) {
          await meetingsApi.create(clubId, {
            title: work.title.trim(),
            author: work.author?.trim() || null,
            cover_url: work.cover_url || null,
            description: description.trim() || null,
            scheduled_at: isoDate,
            theme: club?.current_theme || null,
          });

          if (work.suggestionId) {
            await suggestionsApi.choose(clubId, work.suggestionId, "created");
          }
        }
      }
      setShowForm(false);
      setWorks([{ ...EMPTY_WORK }]);
      setDescription("");
      setDate("");
      if (clearPrefill) clearPrefill();
      await fetchMeetings();
    } catch (err) {
      setFormError(err.message || "Erro ao criar encontro.");
    } finally {
      setSubmitting(false);
    }
  }

  const sortedGroups = useMemo(() => {
    const grouped = meetings.reduce((acc, meeting) => {
      const dateObj = new Date(meeting.scheduled_at);
      const themeKey = meeting.theme || "";
      const groupKey = `${dateObj.getTime()}__${themeKey}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          key: groupKey,
          date: dateObj,
          meetings: [],
        };
      }
      acc[groupKey].meetings.push(meeting);
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.date - a.date);
  }, [meetings]);

  if (loading) return <p className="text-gray-500">Carregando encontros...</p>;

  return (
    <div>
      {club && (
        <div className="mb-6 bg-gray-50 border border-gray-200 p-3 rounded-lg text-sm text-gray-700 flex items-center gap-2 font-medium">
          {club.type === "book"
            ? "Meta do clube: 1 livro lido por mês."
            : "Meta do clube: 3 filmes assistidos por mês."}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-800">Encontros</h2>
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            {showForm ? (
              "Cancelar"
            ) : (
              <>
                <Plus size={16} /> Novo Encontro
              </>
            )}
          </button>
        )}
      </div>

      {showForm && isOwner && (
        <form
          onSubmit={handleCreate}
          className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-4 sm:space-y-5"
        >
          {formError && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              {formError}
            </p>
          )}

          <div className="space-y-3 sm:space-y-4">
            {works.map((work, index) => (
              <div
                key={work.suggestionId || index}
                className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-100 relative"
              >
                {work.cover_url && (
                  <div className="w-20 h-28 sm:w-24 sm:h-36 shrink-0 rounded-md overflow-hidden border border-gray-200 bg-white">
                    <img
                      src={work.cover_url}
                      alt={`Capa de ${work.title || "obra"}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 w-full space-y-3">
                  <input
                    placeholder={
                      club?.type === "book"
                        ? `Título do Livro ${works.length > 1 ? index + 1 : ""}`
                        : `Nome do Filme ${works.length > 1 ? index + 1 : ""}`
                    }
                    value={work.title}
                    onChange={(e) =>
                      handleWorkChange(index, "title", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-gray-400 focus:border-gray-400"
                    required={index === 0 || Boolean(work.author?.trim())}
                  />
                  <input
                    placeholder={
                      club?.type === "book" ? "Autor(a)" : "Diretor(a)"
                    }
                    value={work.author || ""}
                    onChange={(e) =>
                      handleWorkChange(index, "author", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>
                {works.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveWork(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors sm:self-center self-end"
                    title="Remover obra"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddWork}
            className="text-sm font-medium text-gray-600 hover:text-black flex items-center gap-1"
          >
            <Plus size={16} /> Adicionar outra obra
          </button>

          <hr className="border-gray-100" />

          <div className="relative">
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 pl-10 focus:ring-gray-400 focus:border-gray-400"
              required
            />
            <div className="absolute left-3 top-2.5 pointer-events-none text-gray-400">
              <CalendarIcon size={18} />
            </div>
          </div>

          <textarea
            placeholder="Descrição, local ou pauta (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none focus:ring-gray-400 focus:border-gray-400"
          />

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 text-sm font-medium shadow-sm transition-colors"
            >
              {submitting ? "Criando..." : "Salvar Encontro"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-6 sm:space-y-8">
        {sortedGroups.length === 0 ? (
          <p className="text-gray-500 py-4 bg-white p-6 rounded-lg border text-center text-sm">
            Nenhum encontro agendado ainda.
          </p>
        ) : (
          sortedGroups.map((group) => (
            <div
              key={group.key}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="bg-gray-50/80 p-4 sm:p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-start justify-between gap-4 sm:gap-6">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg sm:text-xl">
                    {group.meetings[0]?.theme || "Encontro do Clube"}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 capitalize flex items-center gap-1.5 mt-1">
                    <CalendarIcon size={14} className="sm:w-4 sm:h-4" />
                    {group.date.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {group.meetings.length > 1 && (
                    <span className="inline-block mt-2 bg-gray-200 text-gray-700 text-[10px] sm:text-[11px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide">
                      {group.meetings.length} obras
                    </span>
                  )}
                </div>

                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm w-full md:w-auto md:min-w-[280px]">
                  <GroupAttendance
                    clubId={clubId}
                    meetingId={group.meetings[0].id}
                    currentUser={currentUser}
                  />
                </div>
              </div>

              <div className="p-3 sm:p-5 space-y-2 bg-gray-50/30">
                {group.meetings.map((meeting) => (
                  <div key={meeting.id} className="flex items-start gap-3">
                    {meeting.cover_url && (
                      <div className="w-16 h-24 sm:w-20 sm:h-28 shrink-0 rounded-md overflow-hidden border border-gray-200 bg-white shadow-sm">
                        <img
                          src={meeting.cover_url}
                          alt={`Capa de ${meeting.title}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <MeetingCard
                        clubId={clubId}
                        meeting={meeting}
                        currentUser={currentUser}
                        hideDate={true}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
