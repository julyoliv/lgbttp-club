import { useEffect, useState } from "react";
import { messagesApi } from "../api/client";
import { MuralListSkeleton } from "./LoadingSkeletons";
import { Send, Trash2, Edit2 } from "lucide-react";

export default function ClubMural({ clubId, isOwner }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [newBody, setNewBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");

  useEffect(() => {
    if (!clubId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setMessages([]);
    setLoading(true);
    setError("");

    async function load() {
      try {
        const { messages: fetched } = await messagesApi.list(clubId, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setMessages(fetched || []);
        }
      } catch (err) {
        if (!controller.signal.aborted && err?.name !== "AbortError") {
          setError(err.message || "Erro ao carregar recados");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => controller.abort();
  }, [clubId]);

  async function handlePost(e) {
    e.preventDefault();
    if (!newBody.trim()) return;
    setSubmitting(true);
    setError("");
    setFeedback("");
    try {
      const { message } = await messagesApi.create(clubId, newBody.trim());
      setMessages((prev) => [message, ...prev]);
      setNewBody("");
      setFeedback("Aviso publicado no mural.");
    } catch (err) {
      setError(err.message || "Erro ao postar recado");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(messageId) {
    if (!window.confirm("Tem certeza que deseja apagar este recado?")) return;
    setError("");
    setFeedback("");
    try {
      await messagesApi.delete(clubId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setFeedback("Recado removido.");
    } catch (err) {
      setError(err.message || "Erro ao deletar recado");
    }
  }

  async function handleSaveEdit(messageId) {
    if (!editBody.trim()) return;
    setError("");
    setFeedback("");
    try {
      const { message } = await messagesApi.update(
        clubId,
        messageId,
        editBody.trim(),
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...message } : m)),
      );
      setEditingId(null);
      setEditBody("");
      setFeedback("Recado atualizado.");
    } catch (err) {
      setError(err.message || "Erro ao editar recado");
    }
  }

  if (loading) {
    return <MuralListSkeleton count={3} />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-100">
          {error}
        </p>
      )}
      {feedback && (
        <p className="text-green-700 text-sm bg-green-50 p-3 rounded border border-green-100">
          {feedback}
        </p>
      )}

      {isOwner && (
        <form
          onSubmit={handlePost}
          className="bg-white p-5 rounded-lg shadow-sm border border-gray-200"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deixar um aviso para o clube:
          </label>
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Ex: Pessoal, o encontro de sexta foi adiado para sábado às 14h..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 resize-none focus:ring-brand-500 focus:border-brand-500"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 font-medium">
              {newBody.length}/500
            </span>
            <button
              type="submit"
              disabled={submitting || !newBody.trim()}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              {submitting ? (
                "Enviando..."
              ) : (
                <>
                  <Send size={16} /> Postar aviso
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8 bg-white rounded-lg border text-sm">
            Nenhum recado por aqui ainda.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-brand-500 relative group"
            >
              {editingId === msg.id ? (
                <div>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 resize-none focus:ring-brand-500 focus:border-brand-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-sm px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(msg.id)}
                      className="text-sm px-3 py-1 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors shadow-sm"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {msg.body}
                  </p>
                  <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
                    <span className="font-semibold text-brand-600">
                      {msg.author_name}
                    </span>

                    <div className="flex items-center gap-4">
                      <span>
                        {new Date(msg.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {msg.updated_at &&
                          msg.updated_at !== msg.created_at &&
                          " (editado)"}
                      </span>

                      {isOwner && (
                        <div className="flex gap-2 ml-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(msg.id);
                              setEditBody(msg.body);
                            }}
                            className="text-brand-400 hover:text-brand-600 transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            className="text-accent-400 hover:text-accent-600 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
