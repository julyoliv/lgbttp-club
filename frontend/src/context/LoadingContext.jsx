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
        <div
          className="fixed inset-0 z-[9999] bg-gray-900/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div className="bg-white/95 p-4 rounded-xl shadow-lg border border-gray-200 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading deve ser usado dentro de LoadingProvider");
  }
  return context;
}
