"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simular verificación de sesión al cargar
  useEffect(() => {
    const checkAuth = async () => {
      // Verificar si hay datos de usuario en localStorage (temporal)
      const userData = localStorage.getItem("lufa_user");
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } catch (error) {
          console.error("Error parsing user data:", error);
          localStorage.removeItem("lufa_user");
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      // Usuarios de prueba hardcodeados
      const testUsers = [
        {
          id: "1",
          name: "Administrador LUFA",
          email: "admin@lufa.com",
          password: "admin123",
          role: "admin" as const,
          avatar: "",
        },
        {
          id: "2",
          name: "Usuario Demo",
          email: "user@lufa.com",
          password: "user123",
          role: "user" as const,
          avatar: "",
        },
      ];

      const foundUser = testUsers.find((u) => u.email === email && u.password === password);

      if (foundUser) {
        const userData = {
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          role: foundUser.role,
          avatar: foundUser.avatar,
        };

        setUser(userData);
        localStorage.setItem("lufa_user", JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, error: "Credenciales inválidas" };
      }
    } catch {
      return { success: false, error: "Error de conexión" };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("lufa_user");
  };

  const signUp = async (name: string, email: string, password: string) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.message };
      }
    } catch {
      return { success: false, error: "Error de conexión" };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
