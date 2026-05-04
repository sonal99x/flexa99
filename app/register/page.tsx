"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, AlertCircle, Stethoscope, UserRound } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"doctor" | "patient">("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name, role);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left — image panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&q=80"
          alt="Physical therapy session"
          fill
          className="object-cover"
          priority
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 to-slate-900/40" />

        {/* Content on image */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo top-left */}
          <div className="flex items-center gap-2">
            <img src="/flexa.png" alt="Flexa" className="h-8 w-auto" />
            <span className="font-black text-white text-lg tracking-tight">Flexa</span>
          </div>

          {/* Bottom headline */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c8f000]" />
              <span className="text-white/80 text-xs font-semibold tracking-wide">Join the Platform</span>
            </div>
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Connecting doctors<br />with patients.
            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm">
              A smart rehabilitation platform where doctors prescribe stimulation therapy and patients track their recovery in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Right — form area */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Mobile nav */}
        <div className="flex justify-center pt-6 px-4 lg:hidden">
          <nav className="bg-white border border-slate-200 shadow-sm rounded-2xl px-6 py-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <img src="/flexa.png" alt="Flexa" className="h-8 w-auto" />
              <span className="font-black text-slate-900 text-sm tracking-tight">Flexa</span>
            </div>
            <span className="w-px h-4 bg-slate-200" />
            <span className="text-xs text-slate-400 uppercase tracking-widest">Rehabilitation Platform</span>
          </nav>
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-sm">
            {/* Heading */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Create account</p>
              <h1 className="text-4xl font-black text-slate-900 leading-none tracking-tight">Join the platform</h1>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Role selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    I am a
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("patient")}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                        role === "patient"
                          ? "bg-[#c8f000] border-[#c8f000] text-slate-900"
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                      }`}
                    >
                      <UserRound className="w-4 h-4" />
                      Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("doctor")}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                        role === "doctor"
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                      }`}
                    >
                      <Stethoscope className="w-4 h-4" />
                      Doctor
                    </button>
                  </div>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 transition text-sm font-medium"
                    placeholder="John Doe"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 transition text-sm font-medium"
                    placeholder="you@example.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 transition text-sm font-medium"
                    placeholder="Min. 6 characters"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#c8f000] hover:bg-[#b5dc00] disabled:opacity-50 text-slate-900 font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 text-sm transition-all"
                >
                  {loading ? "Creating account…" : "Create Account"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            </div>

            {/* Login link */}
            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-slate-900 font-bold hover:underline underline-offset-2 transition-colors">
                Sign in &rarr;
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
