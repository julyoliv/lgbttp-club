import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { clubsApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ClubMural from "../components/ClubMural";
import ClubMeetings from "../components/ClubMeetings";
import ClubSuggestions from "../components/ClubSuggestions";
import {
  ArrowLeft,
  Calendar,
  Lightbulb,
  MessageSquare,
  Trash2,
} from "lucide-react";

export default function Club() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [activeTab, setActiveTab] = useState("meetings");
  const [meetingPrefill, setMeetingPrefill] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setLoading(true);
    setError("");
    setActionError("");
    setClub(null);
    setActiveTab("meetings");
    setMeetingPrefill(null);

    async function loadClub() {
      try {
        const { club: fetchedClub } = await clubsApi.get(clubId, {
          signal: controller.signal,
        });
        if (active) setClub(fetchedClub);
      } catch (err) {
        if (active && err?.name !== "AbortError") {
          setError(err.message || "Erro ao carregar clube");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadClub();

    return () => {
      active = false;
      controller.abort();
    };
  }, [clubId]);

  function handleGoToMeeting(data) {
    setMeetingPrefill(data);
    setActiveTab("meetings");
  }

  async function handleDeleteClub() {
    if (!club) return;
    if (
      !window.confirm(
        "ATENÇÃO: Isso vai apagar o clube e TODOS os encontros, sugestões e recados. Tem certeza absoluta?",
      )
    ) {
      return;
    }
    setActionError("");
    try {
      await clubsApi.delete(club.id);
      navigate("/");
    } catch (err) {
      setActionError(err.message || "Erro ao deletar o clube");
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }
  if (!club) {
    return (
      <div className="p-8 text-center text-gray-500">Clube não encontrado.</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </Link>
          <span className="text-xs px-2 py-1 rounded bg-brand-50 text-brand-700 capitalize font-medium border border-brand-100">
            {club.role}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {actionError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {actionError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-gray-900">
              {club.name}
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2 text-sm sm:text-base">
              {club.type === "book" ? "Clube do Livro" : "Clube de Cinema"}
            </p>
          </div>

          <div className="flex items-start gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            {club.role === "owner" && (
              <>
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex-1 sm:flex-none">
                  <p className="text-[10px] text-gray-500 mb-1 uppercase font-semibold tracking-wider">
                    Código de convite
                  </p>
                  <span className="font-mono text-base sm:text-lg font-bold tracking-widest text-brand-800">
                    {club.invite_code}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDeleteClub}
                  className="p-3 text-accent-500 border border-accent-200 rounded-lg hover:bg-accent-50 transition-colors shrink-0"
                  title="Deletar clube"
                >
                  <Trash2 size={20} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex border-b border-gray-200 mb-6 gap-2 sm:gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("meetings")}
            className={`py-3 px-2 sm:px-0 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === "meetings" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            <Calendar size={16} /> Encontros
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("suggestions")}
            className={`py-3 px-2 sm:px-0 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === "suggestions" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            <Lightbulb size={16} /> Sugestões
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mural")}
            className={`py-3 px-2 sm:px-0 font-medium text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === "mural" ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            <MessageSquare size={16} /> Mural
          </button>
        </div>

        <div>
          {activeTab === "meetings" && (
            <ClubMeetings
              club={club}
              isOwner={club.role === "owner"}
              currentUser={user}
              prefill={meetingPrefill}
              onClearPrefill={() => setMeetingPrefill(null)}
            />
          )}
          {activeTab === "suggestions" && (
            <ClubSuggestions
              clubId={club.id}
              isOwner={club.role === "owner"}
              club={club}
              onGoToMeeting={handleGoToMeeting}
            />
          )}
          {activeTab === "mural" && (
            <ClubMural clubId={club.id} isOwner={club.role === "owner"} />
          )}
        </div>
      </main>
    </div>
  );
}
