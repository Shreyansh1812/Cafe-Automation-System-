import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "barista" | "owner" | "super_admin";

export interface AuthUser {
  email: string;
  role: Role;
  tenant_id?: string;
  name?: string;
  business_name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "crema.auth.user";
const TENANT_KEY = "tenant_id";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setUserState(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  const setUser = (u: AuthUser | null) => {
    setUserState(u);
    if (typeof window === "undefined") return;
    if (u) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      if (u.tenant_id) {
        window.localStorage.setItem(TENANT_KEY, u.tenant_id);
      } else {
        window.localStorage.removeItem(TENANT_KEY);
      }
      if (u.business_name) {
        window.localStorage.setItem("business_name", u.business_name);
      } else {
        window.localStorage.removeItem("business_name");
      }
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(TENANT_KEY);
      window.localStorage.removeItem("business_name");
    }
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function dashboardPathFor(role: Role): string {
  if (role === "barista") return "/barista";
  if (role === "super_admin") return "/admin";
  return "/owner";
}
