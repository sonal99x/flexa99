"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, LogOut, Shield, User, Mail, Cpu } from "lucide-react";

export default function ProfilePage() {
  const { user, profile, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
  }, [loading, user, router]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  function handleBack() {
    if (profile?.role === "doctor") router.push("/doctor");
    else router.push("/patient");
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/flexa.png" alt="Flexa" className="h-7 w-auto" />
            <span className="font-black text-slate-900 text-sm tracking-tight">Flexa</span>
          </div>

          <span className="w-px h-4 bg-slate-200" />

          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 uppercase tracking-wide transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:block">
              {profile.name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
              profile.role === "doctor"
                ? "bg-slate-900 text-white"
                : "bg-[#c8f000] text-slate-900"
            }`}>
              {profile.role === "doctor"
                ? <Shield className="w-3 h-3" />
                : <User className="w-3 h-3" />
              }
              {profile.role}
            </span>
          </div>
        </div>

        {/* 2-col grid: 1 + 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left col — dark profile card */}
          <div className="bg-slate-900 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">Profile</p>

              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-[#c8f000] flex items-center justify-center mb-4">
                <span className="text-slate-900 font-black text-2xl">
                  {profile.name?.charAt(0).toUpperCase()}
                </span>
              </div>

              <p className="text-white font-black text-xl leading-tight">{profile.name}</p>
              <p className="text-slate-400 text-sm mt-1 break-all">{profile.email}</p>

              <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                profile.role === "doctor"
                  ? "bg-white/10 text-slate-300"
                  : "bg-[#c8f000]/20 text-[#c8f000]"
              }`}>
                {profile.role}
              </span>
            </div>

            {/* Device info at bottom */}
            <div className="mt-8 pt-4 border-t border-white/10">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Connected Device</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c8f000] shadow-[0_0_6px_#c8f000]" />
                <p className="text-slate-300 text-xs font-semibold tracking-wide">ESP32FlexSensor</p>
              </div>
            </div>
          </div>

          {/* Right col (spans 2) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Account details card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Account Details</p>

              <div className="divide-y divide-slate-100">
                {/* Full Name */}
                <div className="flex items-center gap-4 py-4 first:pt-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Full Name</p>
                    <p className="text-slate-900 font-bold text-sm">{profile.name}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-4 py-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Email Address</p>
                    <p className="text-slate-900 font-bold text-sm break-all">{profile.email}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center gap-4 py-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Role</p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      profile.role === "doctor"
                        ? "bg-slate-900 text-white"
                        : "bg-[#c8f000] text-slate-900"
                    }`}>
                      {profile.role}
                    </span>
                  </div>
                </div>

                {/* Connected device */}
                <div className="flex items-center gap-4 py-4 last:pb-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Connected Device</p>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                      <p className="text-slate-900 font-bold text-sm">ESP32FlexSensor</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign out button */}
            <button
              onClick={handleLogout}
              className="w-full py-3.5 bg-white border border-slate-200 text-slate-900 hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-bold rounded-2xl flex items-center justify-center gap-2 text-sm transition-all shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
