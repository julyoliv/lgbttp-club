import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Erro ao cadastrar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm flex flex-col items-center"
      >
        <img
          src="/icon.png"
          alt="Logo"
          className="w-16 h-16 object-contain mb-4"
        />

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Criar conta</h1>

        {error && (
          <p className="text-red-600 text-sm mb-4 text-center">{error}</p>
        )}

        <div className="w-full space-y-4">
          <input
            aria-label="Nome"
            autoComplete="name"
            placeholder="Nome"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-violet-500 focus:border-violet-500"
            required
          />
          <input
            type="email"
            aria-label="Email"
            autoComplete="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-violet-500 focus:border-violet-500"
            required
          />
          <input
            type="password"
            aria-label="Senha"
            autoComplete="new-password"
            placeholder="Senha (mín. 8 caracteres)"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-violet-500 focus:border-violet-500"
            required
            minLength={8}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-violet-600 text-white py-2.5 rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium transition-colors shadow-sm mt-2"
          >
            {submitting ? "Criando..." : "Criar conta"}
          </button>
        </div>

        <p className="text-sm text-gray-600 mt-6">
          Já tem conta?{" "}
          <Link
            to="/login"
            className="text-violet-600 font-medium hover:text-violet-700 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
