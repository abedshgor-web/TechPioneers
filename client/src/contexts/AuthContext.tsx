import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setSession: (token: string, user: User) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  setSession: () => {},
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, validate token from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("copytrade_token");
    if (!storedToken) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Token invalid");
        return res.json() as Promise<User>;
      })
      .then((userData) => {
        setToken(storedToken);
        setUser(userData);
      })
      .catch(() => {
        localStorage.removeItem("copytrade_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error || "Login failed");
    }

    const data = (await res.json()) as { token: string; user: User };
    localStorage.setItem("copytrade_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error || "Registration failed");
    }

    const data = (await res.json()) as { token: string; user: User };
    localStorage.setItem("copytrade_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = (): void => {
    localStorage.removeItem("copytrade_token");
    setToken(null);
    setUser(null);
  };

  // Replace the active session (e.g. after a token is re-issued with a new role).
  const setSession = (newToken: string, newUser: User): void => {
    localStorage.setItem("copytrade_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, setSession, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
