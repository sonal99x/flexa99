"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile) return;
    if (profile.role === "doctor") router.replace("/doctor");
    else if (profile.role === "patient") router.replace("/patient");
  }, [user, profile, loading, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 animate-pulse">Redirecting...</div>
    </div>
  );
}
