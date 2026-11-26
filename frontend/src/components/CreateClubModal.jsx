import { useState } from 'react';
import { clubsApi } from '../api/client';

export default function CreateClubModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('book');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { club } = await clubsApi.create({ name, type });
      setCreated(club);
    } catch (err) {
      setError(err.message || 'Erro ao criar clube');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded shadow-lg w-full max-w-md p-6">
        {!created ? (
          <>
            <h2 className="text-xl font-bold mb-4">Criar clube</h2>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                placeholder="Nome do clube"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('book')}
                  className={`flex-1 py-2 rounded border ${
                    type === 'book' ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100'
                  }`}
                >
                  📚 Livro
                </button>
                <button
                  type="button"
                  onClick={() => setType('movie')}
                  className={`flex-1 py-2 rounded border ${
                    type === 'movie' ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100'
                  }`}
                >
                  🎬 Cinema
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded hover:bg-gray-100">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-2">Clube criado! 🎉</h2>
            <p className="text-sm text-gray-600 mb-4">
              Compartilhe o código abaixo com quem você quer convidar:
            </p>
            <div className="bg-gray-100 rounded p-4 text-center mb-4">
              <span className="font-mono text-2xl font-bold tracking-wider">
                {created.invite_code}
              </span>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => onCreated(created)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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