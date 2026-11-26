import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { clubsApi } from "../api/client";
import CreateClubModal from "../components/CreateClubModal";
import JoinClubModal from "../components/JoinClubModal";
import { BookOpen, Film, Plus, LogIn } from "lucide-react";

export default function Home() {
  const { user, logout } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const loadClubs = useCallback(async ({ showSpinner = false } = {}) => {
    if (showSpinner) setLoading(true);
    setError("");
    try {
      const { clubs: fetchedClubs } = await clubsApi.list();
      setClubs(fetchedClubs);
    } catch (err) {
      setError(err.message || "Erro ao carregar clubes");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClubs({ showSpinner: true });
  }, [loadClubs]);

  function handleCreated(club) {
    setClubs((prev) => [{ ...club, role: "owner" }, ...prev]);
    setShowCreate(false);
  }

  function handleJoined() {
    setShowJoin(false);
    loadClubs({ showSpinner: false });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="/icon.png"
              alt="Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
            <h1 className="text-sm sm:text-xl font-bold text-gray-900 leading-tight">
              LGBTs também podem
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <span className="text-xs sm:text-sm text-gray-600 hidden sm:block">
              {user?.name}
            </span>
            <button
              type="button"
              onClick={logout}
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            Meus clubes
          </h2>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowJoin(true)}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            >
              <LogIn size={16} /> Entrar com código
            </button>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-gray-900 text-white rounded-lg hover:bg-black flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-sm"
            >
              <Plus size={16} /> Criar clube
            </button>
          </div>
        </div>

        {loading && <p className="text-gray-500">Carregando...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && clubs.length === 0 && (
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm border text-center">
            <p className="text-gray-600 mb-2">
              Você ainda não participa de nenhum clube.
            </p>
            <p className="text-sm text-gray-500">
              Crie um clube ou entre com um código de convite.
            </p>
          </div>
        )}

        {!loading && !error && clubs.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <Link
                key={club.id}
                to={`/clubs/${club.id}`}
                className="bg-white p-5 rounded-lg shadow-sm border hover:shadow-md hover:border-gray-300 transition-all group flex flex-col"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-gray-200 transition-colors">
                    {club.type === "book" ? (
                      <BookOpen size={20} />
                    ) : (
                      <Film size={20} />
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-medium capitalize border">
                    {club.role}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-gray-800 line-clamp-1">
                  {club.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {club.type === "book" ? "Clube do Livro" : "Clube de Cinema"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateClubModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {showJoin && (
        <JoinClubModal
          onClose={() => setShowJoin(false)}
          onJoined={handleJoined}
        />
      )}
    </div>
  );
}
