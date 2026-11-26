import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    authApi
      .me({ signal: controller.signal })
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((err) => {
        if (active && err?.name !== "AbortError") {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { user: loggedUser } = await authApi.login({ email, password });
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { user: createdUser } = await authApi.register({
      name,
      email,
      password,
    });
    setUser(createdUser);
    return createdUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
