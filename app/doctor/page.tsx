"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, set } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { rtdb } from "@/lib/firebase";
import {
  getAllPatients, getSessionsForPatient, saveSession, deleteSession,
  UserProfile, SessionLog, ExerciseData,
} from "@/lib/firestore";
import {
  Users, Wifi, WifiOff, BarChart2, Save, Trash2, LogOut,
  Activity, Repeat, ChevronRight, Stethoscope, CheckCircle, Clock,
} from "lucide-react";

const ALL_EXERCISES = [1, 2, 3, 4, 5, 6];

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
];

interface SensorReadings {
  ex1: number; ex2: number; ex3: number;
  ex4: number; ex5: number; ex6: number;
  reps?: number;
}

export default function DoctorDashboard() {
  const { user, profile, logout, loading } = useAuth();
  const router = useRouter();

  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [liveReadings, setLiveReadings] = useState<SensorReadings | null>(null);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionSuccess, setSessionSuccess] = useState("");
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [globalReps, setGlobalReps] = useState(1);
  const [dataLoading, setDataLoading] = useState(true);

  function updateReps(value: number) {
    const clamped = Math.max(1, value);
    setGlobalReps(clamped);
    set(ref(rtdb, "FlexSensor/reps"), clamped);
  }

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (profile && profile.role !== "doctor") router.replace("/patient");
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = onValue(ref(rtdb, "FlexSensor"), (snap) => {
      if (!snap.exists()) { setDeviceConnected(false); return; }
      const d = snap.val();
      setDeviceConnected(true);
      setLiveReadings({
        ex1: d.StoredValue1 ?? 0, ex2: d.StoredValue2 ?? 0, ex3: d.StoredValue3 ?? 0,
        ex4: d.StoredValue4 ?? 0, ex5: d.StoredValue5 ?? 0, ex6: d.StoredValue6 ?? 0,
        reps: d.reps ?? 0,
      });
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || profile?.role !== "doctor") return;
    getAllPatients().then((p) => { setPatients(p); setDataLoading(false); });
  }, [user, profile]);

  useEffect(() => {
    if (!selectedPatient) return;
    setSessionSuccess("");
    getSessionsForPatient(selectedPatient.uid).then(setSessions);
  }, [selectedPatient]);

  async function handleSaveSession() {
    if (!selectedPatient || !liveReadings) return;
    setSavingSession(true);
    setSessionSuccess("");
    try {
      const readings = Object.fromEntries(
        ALL_EXERCISES.map((n) => [`ex${n}`, {
          value: liveReadings[`ex${n}` as keyof SensorReadings] as number,
          reps: globalReps, sets: 1,
        } satisfies ExerciseData])
      ) as SessionLog["readings"];
      await saveSession(selectedPatient.uid, readings);
      setSessionSuccess("Session saved successfully!");
      setSessions(await getSessionsForPatient(selectedPatient.uid));
    } finally { setSavingSession(false); }
  }

  async function handleDeleteSession(logId: string) {
    if (!selectedPatient) return;
    setDeletingSessionId(logId);
    try {
      await deleteSession(selectedPatient.uid, logId);
      setSessions(await getSessionsForPatient(selectedPatient.uid));
    } finally { setDeletingSessionId(null); }
  }

  async function handleLogout() { await logout(); router.replace("/login"); }

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  function avatarGradient(name: string) {
    return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
  }

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

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/flexa.png" alt="Flexa" className="h-8 w-auto" />
            <span className="font-black text-slate-900 text-base tracking-tight">Flexa</span>
          </div>
          <div className="h-5 w-px bg-slate-200 mx-1" />
          <div className="flex items-center gap-1.5 bg-slate-900 rounded-lg px-2.5 py-1">
            <Stethoscope className="w-3.5 h-3.5 text-[#c8f000]" />
            <span className="text-white text-[11px] font-bold uppercase tracking-wider">Doctor Portal</span>
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
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center ring-2 ring-[#c8f000]/20 group-hover:ring-[#c8f000]/50 transition-all">
                <span className="text-[#c8f000] font-black text-sm">{profile?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 leading-none">Dr. {profile?.name}</p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">Physician</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
            </button>
            <button onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-[#0d1a00] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#c8f000_0%,_transparent_55%)] opacity-[0.07]" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle,#ffffff08 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative max-w-7xl mx-auto px-6 py-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-1 rounded-full bg-[#c8f000]" />
              <span className="text-[#c8f000] text-xs font-bold uppercase tracking-[0.15em]">Patient Management</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight leading-none mb-2">
              Good day, Dr. {profile?.name}.
            </h1>
            <p className="text-slate-400 text-sm flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />{currentDate}
            </p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-1.5">Patients</p>
              <p className="text-white font-black text-5xl leading-none">{patients.length}</p>
            </div>
            <div className="w-px h-14 bg-white/10" />
            <div className="text-right">
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-1.5">Sessions</p>
              <p className="text-white font-black text-5xl leading-none">{selectedPatient ? sessions.length : "—"}</p>
              {selectedPatient && <p className="text-slate-500 text-[11px] mt-1">{selectedPatient.name}</p>}
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

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Live Sensor Section */}
        {deviceConnected && liveReadings && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
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
                  const val = (liveReadings[`ex${n}` as keyof SensorReadings] as number) ?? 0;
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

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">

          {/* Patient List */}
          <div className="col-span-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden h-full">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-900">Patients</h2>
                <span className="ml-auto px-2.5 py-0.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">{patients.length}</span>
              </div>
              <div className="p-3">
                {patients.length === 0 ? (
                  <div className="flex flex-col items-center py-14 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-3">
                      <Users className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-400">No patients yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {patients.map((p) => {
                      const isSelected = selectedPatient?.uid === p.uid;
                      return (
                        <button key={p.uid} onClick={() => setSelectedPatient(p)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left group ${isSelected ? "bg-slate-900 shadow-md" : "hover:bg-slate-50"}`}>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 text-white bg-gradient-to-br ${isSelected ? "from-[#c8f000] to-[#a3c800] !text-slate-900" : avatarGradient(p.name)}`}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`font-semibold text-sm truncate ${isSelected ? "text-white" : "text-slate-900"}`}>{p.name}</p>
                            <p className="text-xs text-slate-400 truncate">{p.email}</p>
                          </div>
                          <ChevronRight className={`w-4 h-4 shrink-0 transition-all ${isSelected ? "text-slate-400" : "text-slate-200 group-hover:text-slate-400"}`} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="col-span-8 space-y-5">
            {!selectedPatient ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-center text-center py-28">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-5">
                  <Users className="w-9 h-9 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Select a Patient</h3>
                <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                  Choose a patient from the list to view and manage their therapy sessions
                </p>
              </div>
            ) : (
              <>
                {/* Patient Header */}
                <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 overflow-hidden shadow-lg">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#c8f000_0%,_transparent_60%)] opacity-[0.06]" />
                  <div className="relative flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarGradient(selectedPatient.name)} flex items-center justify-center font-black text-2xl text-white shrink-0 shadow-lg`}>
                      {selectedPatient.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Patient</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-xs text-emerald-400 font-semibold">Active</span>
                      </div>
                      <p className="text-white font-black text-xl leading-tight truncate">{selectedPatient.name}</p>
                      <p className="text-slate-400 text-sm truncate">{selectedPatient.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-1">Total Sessions</p>
                      <p className="text-[#c8f000] font-black text-5xl leading-none">{sessions.length}</p>
                    </div>
                  </div>
                </div>

                {/* Session Builder */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                      <Save className="w-4 h-4 text-[#c8f000]" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-sm font-bold text-slate-900">Save Current Session</h2>
                      <p className="text-xs text-slate-400">Capture live readings for {selectedPatient.name}</p>
                    </div>
                    {!deviceConnected && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
                        <WifiOff className="w-3 h-3 text-amber-500" />
                        <span className="text-amber-600 text-xs font-semibold">Device offline</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-5">
                    {sessionSuccess && (
                      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <p className="text-emerald-800 text-sm font-semibold">{sessionSuccess}</p>
                      </div>
                    )}

                    {/* Reps */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                        <Repeat className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">Repetitions</p>
                        <p className="text-xs text-slate-400">Applied to all exercises</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateReps(globalReps - 1)}
                          className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-base flex items-center justify-center shadow-sm transition-all">−</button>
                        <input type="number" min={1} value={globalReps}
                          onChange={(e) => updateReps(parseInt(e.target.value) || 1)}
                          className="w-16 text-center font-black text-slate-900 text-xl bg-white border-2 border-slate-900 rounded-xl py-1.5 focus:outline-none" />
                        <button onClick={() => updateReps(globalReps + 1)}
                          className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-700 text-[#c8f000] font-black text-base flex items-center justify-center shadow-sm transition-all">+</button>
                      </div>
                    </div>

                    {/* Exercise Grid */}
                    <div className="grid grid-cols-6 gap-2.5">
                      {ALL_EXERCISES.map((n) => {
                        const val = liveReadings ? (liveReadings[`ex${n}` as keyof SensorReadings] as number) : 0;
                        const pct = Math.min(100, Math.round((val / 10) * 100));
                        return (
                          <div key={n} className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex flex-col items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center">
                              <span className="text-[#c8f000] font-black text-[10px]">{n}</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900 leading-none">{val}</p>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, background: "linear-gradient(90deg,#84cc16,#c8f000)" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {deviceConnected && liveReadings ? (
                      <button onClick={handleSaveSession} disabled={savingSession}
                        className="w-full py-4 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg">
                        {savingSession
                          ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                          : <><Save className="w-4 h-4" />Save Session to Patient</>}
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <WifiOff className="w-4 h-4 text-slate-300 shrink-0" />
                        <p className="text-sm text-slate-400">Connect the ESP32 device to save sessions</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Session History */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <BarChart2 className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-sm font-bold text-slate-900">Session History</h2>
                      <p className="text-xs text-slate-400">{selectedPatient.name}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-500">{sessions.length} total</span>
                  </div>

                  <div className="p-6">
                    {sessions.length === 0 ? (
                      <div className="flex flex-col items-center py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                        <BarChart2 className="w-8 h-8 text-slate-200 mb-3" />
                        <p className="text-sm font-semibold text-slate-400">No sessions yet</p>
                        <p className="text-xs text-slate-300 mt-1">Save a session above to get started</p>
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
                            return (
                              <div key={s.id} className="relative flex gap-4 pl-9">
                                <div className="absolute left-0 top-3.5 w-7 h-7 rounded-full bg-slate-900 border-2 border-white shadow-md flex items-center justify-center shrink-0 z-10">
                                  <span className="text-[#c8f000] font-black text-[9px]">{String(sessions.length - i).padStart(2, "0")}</span>
                                </div>
                                <div className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <p className="text-sm font-bold text-slate-900">Session {sessions.length - i}</p>
                                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3" />{date}{time ? ` · ${time}` : ""}
                                      </p>
                                    </div>
                                    <button onClick={() => handleDeleteSession(s.id)} disabled={deletingSessionId === s.id}
                                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-6 gap-2">
                                    {ALL_EXERCISES.map((n) => {
                                      const ex = s.readings[`ex${n}` as keyof SessionLog["readings"]] as ExerciseData;
                                      const val = typeof ex === "object" ? ex.value : ex;
                                      const reps = typeof ex === "object" ? ex.reps : "—";
                                      const pct = Math.min(100, Math.round(((val as number) / 10) * 100));
                                      return (
                                        <div key={n} className="bg-white border border-slate-100 rounded-lg p-2.5 flex flex-col items-center gap-1.5">
                                          <p className="text-[10px] text-slate-400 font-semibold">Ex {n}</p>
                                          <p className="text-sm font-black text-slate-900">{val}</p>
                                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#84cc16,#c8f000)" }} />
                                          </div>
                                          <p className="text-[10px] text-slate-400">{reps}r</p>
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
