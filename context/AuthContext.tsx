"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, getUserProfile, UserProfile } from "@/lib/firestore";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: "doctor" | "patient") => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const p = await getUserProfile(firebaseUser.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email: string, password: string, name: string, role: "doctor" | "patient") {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await createUserProfile(cred.user.uid, { email, name, role });
    const p = await getUserProfile(cred.user.uid);
    setProfile(p);
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
