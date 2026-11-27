import { useState } from "react";
import { clubsApi } from "../api/client";
import { BookOpen, Film, Copy, Check, X } from "lucide-react";

export default function CreateClubModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("book");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { club } = await clubsApi.create({ name: name.trim(), type });
      setCreated(club);
    } catch (err) {
      setError(err.message || "Erro ao criar clube");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyCode() {
    if (!created?.invite_code) return;
    try {
      await navigator.clipboard.writeText(created.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg w-full max-w-md p-6">
        {!created ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Criar clube</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Nome do clube
                </label>
                <input
                  placeholder="Ex.: Clube de Leitura ou Sessão das 20h"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-900"
                  required
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-gray-600 mb-1.5">
                  Formato
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setType("book")}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      type === "book"
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <BookOpen size={16} />
                    <span>Livro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("movie")}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      type === "movie"
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <Film size={16} />
                    <span>Cinema</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Criando..." : "Criar"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1.5">
              Clube criado
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Compartilhe o código de convite com quem vai participar:
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 flex items-center justify-between gap-3">
              <span className="font-mono text-2xl font-bold tracking-wider text-gray-900 mx-auto">
                {created.invite_code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-xs font-medium text-gray-700 flex items-center gap-1.5 transition-colors"
                title="Copiar código"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-green-600" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onCreated(created)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
              >
                Ir para o clube
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
