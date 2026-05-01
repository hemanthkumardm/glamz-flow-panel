import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import * as api from "@/lib/api";

type Role = "admin" | "staff" | null;

interface AuthCtx {
  user: api.AuthUser | null;
  role: Role;
  fullName: string;
  loading: boolean;
  isAdmin: boolean;
  login: (phone: string, pass: string) => Promise<api.AuthUser>;
  signUp: (phone: string, pass: string, name: string, role?: "admin" | "staff") => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<api.AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from stored JWT
    const token = sessionStorage.getItem("smg_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.getMe()
      .then((u) => setUser(u))
      .catch(() => {
        api.logout();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (phone: string, pass: string) => {
    const u = await api.login(phone, pass);
    setUser(u);
    return u;
  };

  const signUp = async (phone: string, pass: string, name: string, role?: "admin" | "staff") => {
    await api.register(phone, pass, name, role);
  };

  const signOut = () => {
    api.logout();
    setUser(null);
  };

  const role = (user?.role ?? null) as Role;

  return (
    <Ctx.Provider
      value={{
        user,
        role,
        fullName: user?.full_name ?? "",
        loading,
        isAdmin: role === "admin",
        login,
        signUp,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};
