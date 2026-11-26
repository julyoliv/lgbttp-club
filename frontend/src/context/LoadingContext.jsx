import { createContext, useCallback, useContext, useState } from "react";

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [pendingCount, setPendingCount] = useState(0);

  const setLoading = useCallback((isLoading) => {
    setPendingCount((prev) => (isLoading ? prev + 1 : Math.max(0, prev - 1)));
  }, []);

  const withLoading = useCallback(async (fn) => {
    setPendingCount((prev) => prev + 1);
    try {
      return await fn();
    } finally {
      setPendingCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const loading = pendingCount > 0;

  return (
    <LoadingContext.Provider value={{ loading, setLoading, withLoading }}>
      {children}

      {loading && (
        <div className="fixed inset-0 z-[9999] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-700">Carregando...</p>
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context)
    throw new Error("useLoading deve ser usado dentro de LoadingProvider");
  return context;
}
