"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { rtdb } from "@/lib/firebase";
import { getSessionsForPatient, SessionLog, ExerciseData } from "@/lib/firestore";
import {
  Zap, Square, CheckCircle, Heart, Activity, Repeat,
  Wifi, WifiOff, BarChart2, ChevronRight, LogOut, Clock,
} from "lucide-react";

interface SensorReadings {
  ex1: number; ex2: number; ex3: number;
  ex4: number; ex5: number; ex6: number;
  reps?: number;
}
interface HeartRateData { BPM?: number }
interface PulseData { BPM?: number }

const ALL_EXERCISES = [1, 2, 3, 4, 5, 6];

export default function PatientDashboard() {
  const { user, profile, logout, loading } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [liveReadings, setLiveReadings] = useState<SensorReadings | null>(null);
  const [heartRate, setHeartRate] = useState<HeartRateData>({});
  const [pulse, setPulse] = useState<PulseData>({});
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentExercise, setCurrentExercise] = useState<number | null>(null);
  const [completedExercises, setCompletedExercises] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [sessionDone, setSessionDone] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSessionRef = useRef<SessionLog | null>(null);
  const currentExRef = useRef<number | null>(null);
  const completedRef = useRef<number[]>([]);
  const liveReadingsRef = useRef<SensorReadings | null>(null);
  const exerciseBaseRepsRef = useRef<number>(0);
  const targetRepsRef = useRef<number>(0);
  const advancingRef = useRef<boolean>(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (profile && profile.role !== "patient") router.replace("/doctor");
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (!user || profile?.role !== "patient") return;
    getSessionsForPatient(user.uid).then((s) => { setSessions(s); setDataLoading(false); });
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    const u1 = onValue(ref(rtdb, "FlexSensor"), (s) => {
      if (!s.exists()) { setDeviceConnected(false); return; }
      const d = s.val();
      setDeviceConnected(true);
      const readings = {
        ex1: d.StoredValue1 ?? 0, ex2: d.StoredValue2 ?? 0, ex3: d.StoredValue3 ?? 0,
        ex4: d.StoredValue4 ?? 0, ex5: d.StoredValue5 ?? 0, ex6: d.StoredValue6 ?? 0,
        reps: d.reps ?? 0,
      };
      liveReadingsRef.current = readings;
      setLiveReadings(readings);
    });
    const u2 = onValue(ref(rtdb, "HeartRate"), (s) => { if (s.exists()) setHeartRate(s.val()); });
    const u3 = onValue(ref(rtdb, "PulseSensor"), (s) => { if (s.exists()) setPulse(s.val()); });
    return () => { u1(); u2(); u3(); };
  }, [user]);

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function advanceExercise() {
    const exNum = currentExRef.current;
    if (exNum === null) return;
    const newCompleted = [...completedRef.current, exNum];
    completedRef.current = newCompleted;
    setCompletedExercises(newCompleted);
    const next = exNum + 1;
    if (next > 6) {
      currentExRef.current = null;
      setCurrentExercise(null);
      setActiveSessionId(null);
      activeSessionRef.current = null;
      setTimeout(() => setSessionDone(true), 300);
    } else {
      currentExRef.current = next;
      setCurrentExercise(next);
      startExerciseTimer(next);
    }
  }

  function startExerciseTimer(exNum: number) {
    clearTimer();
    const session = activeSessionRef.current;
    if (!session) return;
    const ex = session.readings[`ex${exNum}` as keyof SessionLog["readings"]] as ExerciseData;
    const totalReps = typeof ex === "object" ? ex.reps : 1;
    targetRepsRef.current = totalReps;
    exerciseBaseRepsRef.current = liveReadingsRef.current?.reps ?? 0;
    advancingRef.current = false;
    setTimeLeft(totalReps);
  }

  // Sensor-driven: fires whenever Firebase reps value changes
  useEffect(() => {
    if (!activeSessionId || currentExRef.current === null || advancingRef.current) return;
    const sensorReps = liveReadings?.reps ?? 0;
    const done = Math.max(0, sensorReps - exerciseBaseRepsRef.current);
    const remaining = Math.max(0, targetRepsRef.current - done);
    setTimeLeft(remaining);
    if (remaining === 0 && targetRepsRef.current > 0) {
      advancingRef.current = true;
      advanceExercise();
    }
  }, [liveReadings?.reps, activeSessionId]);

  // Manual fallback button
  function handleCompleteRep() {
    if (advancingRef.current) return;
    const repsLeft = timeLeft - 1;
    setTimeLeft(repsLeft);
    if (repsLeft <= 0) {
      advancingRef.current = true;
      advanceExercise();
    }
  }

  function startSession(id: string) {
    const session = sessions.find((s) => s.id === id) ?? null;
    activeSessionRef.current = session;
    completedRef.current = [];
    currentExRef.current = 1;
    setActiveSessionId(id);
    setCompletedExercises([]);
    setSessionDone(false);
    setCurrentExercise(1);
    startExerciseTimer(1);
  }

  function stopSession() {
    clearTimer();
    setActiveSessionId(null);
    activeSessionRef.current = null;
    currentExRef.current = null;
    completedRef.current = [];
    setCurrentExercise(null);
    setCompletedExercises([]);
    setTimeLeft(0);
    setSessionDone(false);
  }

  useEffect(() => () => clearTimer(), []);
  async function handleLogout() { await logout(); router.replace("/login"); }

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mx-auto">
            <div className="w-5 h-5 border-2 border-[#c8f000]/30 border-t-[#c8f000] rounded-full animate-spin" />
          </div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Loading Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <style>{`
        @keyframes electricPulse {
          0%,100% { box-shadow:0 0 8px 2px #c8f000aa,0 0 24px 4px #c8f00044; }
          50%      { box-shadow:0 0 18px 6px #c8f000ff,0 0 48px 12px #c8f00088; }
        }
        @keyframes zapSpin {
          0%,100% { transform:scale(1) rotate(0deg); }
          25%     { transform:scale(1.3) rotate(-10deg); }
          75%     { transform:scale(1.3) rotate(10deg); }
        }
        @keyframes scanLine {
          0%   { top:0%; opacity:0.7; }
          100% { top:100%; opacity:0; }
        }
        @keyframes particleFloat {
          0%   { transform:translateY(0) translateX(0); opacity:1; }
          100% { transform:translateY(-40px) translateX(var(--px,0px)); opacity:0; }
        }
        @keyframes sessionDonePop {
          0%   { transform:scale(0.8); opacity:0; }
          60%  { transform:scale(1.08); }
          100% { transform:scale(1); opacity:1; }
        }
        .electric-card {
          animation: electricPulse 1.2s ease-in-out infinite;
          border-width:2px !important;
          background:#1a2200 !important;
          border-color:#c8f000 !important;
        }
        .electric-card-dim {
          border-width:2px !important;
          border-color:#c8f00022 !important;
          background:#111 !important;
        }
      `}</style>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/flexa.png" alt="Flexa" className="h-8 w-auto" />
            <span className="font-black text-slate-900 text-base tracking-tight">Flexa</span>
          </div>
          <div className="h-5 w-px bg-slate-200 mx-1" />
          <div className="flex items-center gap-1.5 bg-[#c8f000] rounded-lg px-2.5 py-1">
            <span className="text-slate-900 text-[11px] font-black uppercase tracking-wider">Patient Portal</span>
          </div>

          <div className="ml-4 flex items-center gap-5 hidden lg:flex border-l border-slate-200 pl-5">
            <a href="https://neurospeed.akamaized.site/" target="_blank" rel="noreferrer" title="Real-time Emotion Detection with Doctor Notification System" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider truncate max-w-[200px]">Emotion Detection</a>
            <a href="https://gripmonitor.akamaized.site/" target="_blank" rel="noreferrer" title="Measure & Monitor paralysis improvement using A Pressure ball" className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider truncate max-w-[200px]">Pressure Ball Monitor</a>
          </div>

          <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${
            deviceConnected ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-400"
          }`}>
            {deviceConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {deviceConnected ? "ESP32 · Online" : "Device Offline"}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => router.push("/profile")}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c8f000] to-[#a3c800] flex items-center justify-center ring-2 ring-[#c8f000]/20 group-hover:ring-[#c8f000]/60 transition-all">
                <span className="text-slate-900 font-black text-sm">{profile?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 leading-none">{profile?.name}</p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">Patient</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
            </button>
            <button onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-[#001a0d] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_#c8f000_0%,_transparent_55%)] opacity-[0.06]" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle,#ffffff08 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative max-w-5xl mx-auto px-6 py-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-1 rounded-full bg-[#c8f000]" />
              <span className="text-[#c8f000] text-xs font-bold uppercase tracking-[0.15em]">Rehabilitation Portal</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight leading-none mb-2">
              Good day, {profile?.name}.
            </h1>
            <p className="text-slate-400 text-sm flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />{todayStr}
            </p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-1.5">Sessions</p>
              <p className="text-white font-black text-5xl leading-none">{sessions.length}</p>
            </div>
            <div className="w-px h-14 bg-white/10" />
            <div className="text-right">
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-1.5">Heart Rate</p>
              <p className="text-red-400 font-black text-5xl leading-none">{heartRate.BPM !== undefined ? Math.round(heartRate.BPM) : "—"}</p>
              <p className="text-slate-500 text-[11px] mt-1">BPM</p>
            </div>
            <div className="w-px h-14 bg-white/10" />
            <div className="text-right">
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-1.5">Device</p>
              <div className="flex items-center justify-end gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${deviceConnected ? "bg-[#c8f000] animate-pulse shadow-[0_0_8px_#c8f000aa]" : "bg-slate-600"}`} />
                <p className={`font-black text-2xl leading-none ${deviceConnected ? "text-[#c8f000]" : "text-slate-500"}`}>
                  {deviceConnected ? "Live" : "Off"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Session complete banner */}
        {sessionDone && (
          <div className="bg-white border-2 border-emerald-200 rounded-2xl p-8 text-center shadow-sm"
            style={{ animation: "sessionDonePop 600ms ease forwards" }}>
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-slate-900 font-black text-2xl mb-2">Session Complete!</p>
            <p className="text-slate-400 text-sm mb-6">All exercises finished. Great work, {profile?.name}!</p>
            <button onClick={() => setSessionDone(false)}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-colors shadow-sm">
              Done
            </button>
          </div>
        )}

        {/* Active session banner */}
        {activeSession && (
          <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-[#c8f000] p-6"
            style={{ animation: "electricPulse 1.5s ease-in-out infinite" }}>
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c8f000] to-transparent pointer-events-none"
              style={{ animation: "scanLine 2s linear infinite" }} />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#c8f000]/10 border border-[#c8f000]/40 flex items-center justify-center"
                  style={{ animation: "zapSpin 1s ease-in-out infinite" }}>
                  <Zap className="w-6 h-6 text-[#c8f000]" fill="#c8f000" />
                </div>
                <div>
                  <p className="text-[#c8f000] font-black text-sm uppercase tracking-widest">Stimulation Active</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {currentExercise ? `Exercise ${currentExercise} — ${timeLeft} rep${timeLeft !== 1 ? "s" : ""} remaining` : "Finishing..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c8f000]/10 border border-[#c8f000]/30 rounded-xl">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c8f000] animate-pulse" />
                  <span className="text-[#c8f000] text-xs font-semibold">Sensor tracking</span>
                </div>
                {currentExercise && timeLeft > 0 && (
                  <button onClick={handleCompleteRep}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white text-xs font-bold uppercase tracking-wide rounded-xl border border-white/10 transition-colors"
                    title="Mark rep manually">
                    <CheckCircle className="w-3 h-3" /> Manual
                  </button>
                )}
                <button onClick={stopSession}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wide rounded-2xl border border-white/20 transition-colors">
                  <Square className="w-3 h-3 fill-white" /> Stop
                </button>
              </div>
            </div>
            {currentExercise && (() => {
              const ex = activeSession.readings[`ex${currentExercise}` as keyof SessionLog["readings"]] as ExerciseData;
              const total = typeof ex === "object" ? ex.reps : 1;
              const done = total - timeLeft;
              const pct = Math.round((done / total) * 100);
              return (
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-5">
                  <div className="h-full bg-[#c8f000] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              );
            })()}
            <div className="grid grid-cols-6 gap-3">
              {ALL_EXERCISES.map((n) => {
                const ex = activeSession.readings[`ex${n}` as keyof SessionLog["readings"]] as ExerciseData;
                const val = typeof ex === "object" ? ex.value : 0;
                const duration = typeof ex === "object" ? ex.reps : 5;
                const isDone = completedExercises.includes(n);
                const isActive = currentExercise === n;
                return (
                  <div key={n} className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border overflow-hidden transition-all ${isDone ? "bg-[#c8f000]/10 border-[#c8f000]/50" : isActive ? "electric-card" : "electric-card-dim"}`}>
                    {isActive && [...Array(3)].map((_, p) => (
                      <div key={p} className="absolute w-1 h-1 rounded-full bg-[#c8f000]"
                        style={{ bottom: 6, left: `${20 + p * 30}%`, ["--px" as string]: `${(p - 1) * 10}px`, animation: `particleFloat ${1.2 + p * 0.3}s ease-out infinite`, animationDelay: `${p * 0.5}s` }} />
                    ))}
                    <p className={`text-xs uppercase tracking-widest font-bold ${isDone || isActive ? "text-[#c8f000]" : "text-white/30"}`}>Ex {n}</p>
                    {isDone ? <CheckCircle className="w-6 h-6 text-[#c8f000]" /> : (
                      <>
                        <p className={`text-2xl font-black ${isActive ? "text-white" : "text-white/20"}`}>{isActive ? timeLeft : val}</p>
                        <p className={`text-xs ${isActive ? "text-[#c8f000]/80" : "text-white/20"}`}>{isActive ? "reps left" : `${duration}r`}</p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vitals row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="relative bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50 to-red-100/50 rounded-full -translate-y-12 translate-x-12" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-md">
                  <Heart className="w-5 h-5 text-white" fill="white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Heart Rate</p>
                </div>
              </div>
              <p className="text-6xl font-black text-red-500 leading-none">{heartRate.BPM !== undefined ? Math.round(heartRate.BPM) : "—"}</p>
              <p className="text-slate-400 text-sm font-semibold mt-1.5">BPM</p>
            </div>
          </div>

          <div className="relative bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-full -translate-y-12 translate-x-12" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-md">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pulse Sensor</p>
                </div>
              </div>
              <p className="text-6xl font-black text-pink-500 leading-none">{pulse.BPM !== undefined ? Math.round(pulse.BPM) : "—"}</p>
              <p className="text-slate-400 text-sm font-semibold mt-1.5">BPM</p>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-slate-900 to-[#0d1a00] rounded-2xl p-6 shadow-sm overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c8f000]/5 rounded-full -translate-y-12 translate-x-12" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#c8f000]/15 border border-[#c8f000]/30 flex items-center justify-center">
                  <Repeat className="w-5 h-5 text-[#c8f000]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Reps</p>
                </div>
              </div>
              <p className="text-6xl font-black text-[#c8f000] leading-none">{liveReadings?.reps ?? "—"}</p>
              <p className="text-slate-400 text-sm font-semibold mt-1.5">Total Reps</p>
            </div>
          </div>
        </div>

        {/* Live sensor readings */}
        {deviceConnected && liveReadings && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#c8f000]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Live Sensor Readings</h2>
                <p className="text-xs text-slate-400">ESP32 FlexSensor · Real-time</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 text-xs font-bold">Live</span>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-6 gap-4">
                {ALL_EXERCISES.map((n) => {
                  const val = liveReadings[`ex${n}` as keyof SensorReadings] as number;
                  const pct = Math.min(100, Math.round((val / 10) * 100));
                  return (
                    <div key={n} className="flex flex-col items-center gap-3">
                      <div className="flex items-end justify-center gap-0.5 h-16 w-full">
                        {[...Array(8)].map((_, bar) => {
                          const active = pct >= ((bar + 1) / 8) * 100;
                          return (
                            <div key={bar}
                              className={`flex-1 rounded-sm transition-all duration-700 ${active ? "" : "bg-slate-100"}`}
                              style={{ height: `${20 + bar * 11}%`, background: active ? `hsl(${78 + bar * 2},${88 - bar * 3}%,${48 + bar * 2}%)` : undefined }}
                            />
                          );
                        })}
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-black text-slate-900">{val}</p>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Ex {n}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Session history */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900">Session History</h2>
              <p className="text-xs text-slate-400">{sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded</p>
            </div>
          </div>

          <div className="p-6">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center py-14 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
                  <BarChart2 className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-400 mb-1">No sessions yet</p>
                <p className="text-xs text-slate-300">Sessions saved by your doctor will appear here</p>
              </div>
            ) : (
              <div className="relative">
                {sessions.length > 1 && (
                  <div className="absolute left-[15px] top-8 bottom-8 w-px bg-gradient-to-b from-slate-300 to-transparent" />
                )}
                <div className="space-y-4">
                  {sessions.map((s, i) => {
                    const ts = s.savedAt ? (s.savedAt as { seconds: number }).seconds * 1000 : null;
                    const date = ts ? new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                    const time = ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";
                    const isActive = activeSessionId === s.id;
                    return (
                      <div key={s.id} className="relative flex gap-4 pl-9">
                        <div className={`absolute left-0 top-3.5 w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center shrink-0 z-10 ${isActive ? "bg-[#c8f000]" : "bg-slate-900"}`}>
                          <span className={`font-black text-[9px] ${isActive ? "text-slate-900" : "text-[#c8f000]"}`}>
                            {String(sessions.length - i).padStart(2, "0")}
                          </span>
                        </div>
                        <div className={`flex-1 rounded-xl p-4 border transition-all duration-300 ${isActive ? "bg-slate-950 border-[#c8f000]" : "bg-slate-50 border-slate-200/60 hover:border-slate-300 hover:shadow-sm"}`}
                          style={isActive ? { animation: "electricPulse 1.5s ease-in-out infinite" } : {}}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className={`text-sm font-bold ${isActive ? "text-[#c8f000]" : "text-slate-900"}`}>Session {sessions.length - i}</p>
                                <p className={`text-xs flex items-center gap-1 mt-0.5 ${isActive ? "text-white/40" : "text-slate-400"}`}>
                                  <Clock className="w-3 h-3" />{date}{time ? ` · ${time}` : ""}
                                </p>
                              </div>
                              {isActive && (
                                <span className="flex items-center gap-1 text-xs font-bold text-[#c8f000] uppercase tracking-wide ml-2">
                                  <Zap className="w-3 h-3 fill-[#c8f000]" /> Active
                                </span>
                              )}
                            </div>
                            {isActive ? (
                              <button onClick={stopSession}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase rounded-xl border border-white/20 transition-colors">
                                <Square className="w-3 h-3 fill-white" /> Stop
                              </button>
                            ) : (
                              <button onClick={() => startSession(s.id)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-[#c8f000] text-xs font-bold uppercase rounded-xl transition-colors shadow-sm">
                                <Zap className="w-3 h-3 fill-[#c8f000]" /> Start
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {ALL_EXERCISES.map((n) => {
                              const ex = s.readings[`ex${n}` as keyof SessionLog["readings"]] as ExerciseData;
                              const val = typeof ex === "object" ? ex.value : ex;
                              const duration = typeof ex === "object" ? ex.reps : 5;
                              const isDone = isActive && completedExercises.includes(n);
                              const isCurrent = isActive && currentExercise === n;
                              return (
                                <div key={n} className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border transition-all ${
                                  isDone ? "bg-[#c8f000]/10 border-[#c8f000]/40" :
                                  isCurrent ? "bg-[#c8f000]/5 border-[#c8f000]/30" :
                                  isActive ? "bg-white/5 border-white/10" : "bg-white border-slate-100"
                                }`}>
                                  <p className={`text-[10px] font-semibold ${isActive ? "text-white/50" : "text-slate-400"}`}>Ex {n}</p>
                                  {isDone
                                    ? <CheckCircle className="w-4 h-4 text-[#c8f000]" />
                                    : <p className={`text-sm font-black ${isActive ? "text-white" : "text-slate-900"}`}>{val}</p>}
                                  <p className={`text-[10px] ${isActive ? "text-[#c8f000]/60" : "text-slate-400"}`}>{duration} reps</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
