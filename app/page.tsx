"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, profile, loading, error, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (!profile) return;
    if (profile.role === "doctor") router.replace("/doctor");
    else if (profile.role === "patient") router.replace("/patient");
  }, [user, profile, loading, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md text-center">
          <h2 className="text-red-500 font-bold mb-2">Connection Error</h2>
          <p className="text-gray-300 text-sm mb-6">{error}</p>
          <button 
            onClick={() => { logout(); router.replace("/login"); }}
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200"
          >
            Sign Out & Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 animate-pulse">Redirecting...</div>
    </div>
  );
}
