"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { celebrate } from "@/components/Providers";
import { useStore } from "@/lib/store";
import { sfx, buzz } from "@/lib/sound";

type Phase = "wait" | "go" | "early" | "won" | "end";
const WIN_AT = 5;

export default function SpeedPage() {
  const names = useStore((s) => s.names);
  const recordSpeed = useStore((s) => s.recordSpeed);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [phase, setPhase] = useState<Phase>("wait");
  const [msg, setMsg] = useState("استعدّوا…");
  const [earlyBy, setEarlyBy] = useState<0 | 1 | null>(null);
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [lastMs, setLastMs] = useState<number | null>(null);

  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef<[number, number]>([0, 0]);
  const phaseRef = useRef<Phase>("wait");

  // نحدّث المرجع عشان الدوال داخل الـ timers تشوف آخر قيمة
  phaseRef.current = phase;

  const schedule = (fn: () => void, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };

  const nextRound = () => {
    setEarlyBy(null);
    setWinner(null);
    setLastMs(null);
    setPhase("wait");
    setMsg("استعدّوا…");
    schedule(() => {
      goAt.current = performance.now();
      setPhase("go");
      setMsg("اضغطوا الحين!!");
      sfx.go();
      buzz(30);
    }, 1500 + Math.random() * 2500);
  };

  const finishRound = (w: 0 | 1, ms: number | null) => {
    const next: [number, number] = [scoreRef.current[0] + (w === 0 ? 1 : 0), scoreRef.current[1] + (w === 1 ? 1 : 0)];
    scoreRef.current = next;
    setScore(next);
    setWinner(w);
    setLastMs(ms);
    if (ms !== null) recordSpeed(ms);
    sfx.win();

    if (next[w] >= WIN_AT) {
      setPhase("end");
      setMsg(`${w === 0 ? names.a : names.b} فاز بالسباق 🏆`);
      celebrate(160);
      return;
    }
    setPhase("won");
    setMsg(ms !== null ? `${w === 0 ? names.a : names.b} أسرع بـ ${ms} ms ⚡` : `${w === 0 ? names.a : names.b} كسب الجولة`);
    schedule(nextRound, 1700);
  };

  const press = (p: 0 | 1) => {
    const ph = phaseRef.current;
    if (ph === "wait") {
      // ضغط بدري: الخصم يكسب الجولة
      setPhase("early");
      setEarlyBy(p);
      sfx.lose();
      setMsg(`${p === 0 ? names.a : names.b} ضغط بدري 😅`);
      schedule(() => finishRound(p === 0 ? 1 : 0, null), 1300);
    } else if (ph === "go") {
      const ms = Math.round(performance.now() - goAt.current);
      finishRound(p, ms);
    }
  };

  // بداية السباق
  useEffect(() => {
    recordPlay();
    setLast("/speed");
    nextRound();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    scoreRef.current = [0, 0];
    setScore([0, 0]);
    nextRound();
  };

  const bg = (side: 0 | 1) => {
    if (phase === "go") return "bg-gradient-to-b from-emerald-400 to-emerald-700";
    if (phase === "early" && earlyBy === side) return "bg-red-950";
    if (winner === side) return side === 0 ? "bg-gradient-to-b from-pink-400 to-rose-700" : "bg-gradient-to-b from-violet-400 to-purple-800";
    return side === 0 ? "bg-gradient-to-b from-pink-600 to-fuchsia-900" : "bg-gradient-to-b from-violet-700 to-indigo-950";
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      {/* الشاشة العلوية لهبة (مقلوبة لتقرأها من جهتها) */}
      <button
        aria-label={`${names.a} تضغط`}
        onPointerDown={() => press(0)}
        className={`absolute inset-x-0 top-0 flex h-1/2 rotate-180 flex-col items-center justify-center gap-2 text-white transition-colors duration-150 ${bg(0)}`}
      >
        <span className="text-2xl font-black">{names.a}</span>
        <span className="text-6xl font-black">{score[0]}</span>
        <span className="text-sm opacity-80">{phase === "go" ? "اضغطي!" : ""}</span>
      </button>

      {/* الشاشة السفلية لعمار */}
      <button
        aria-label={`${names.b} تضغط`}
        onPointerDown={() => press(1)}
        className={`absolute inset-x-0 bottom-0 flex h-1/2 flex-col items-center justify-center gap-2 text-white transition-colors duration-150 ${bg(1)}`}
      >
        <span className="text-2xl font-black">{names.b}</span>
        <span className="text-6xl font-black">{score[1]}</span>
        <span className="text-sm opacity-80">{phase === "go" ? "اضغط!" : ""}</span>
      </button>

      {/* الوسط: الرسالة والأزرار */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 flex w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
        <div className="rounded-2xl border border-white/15 bg-black/80 px-5 py-3 text-center font-black text-white shadow-2xl">
          <Zap className="mx-auto mb-1 h-5 w-5 text-yellow-300" />
          {msg}
          {lastMs !== null && <div className="mt-1 text-xs text-white/70">آخر ضغطة: {lastMs} ms</div>}
        </div>
        <div className="pointer-events-auto flex gap-2">
          <Link
            href="/"
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded-xl border border-white/20 bg-black/70 px-4 py-2 text-sm font-bold text-white"
          >
            <ArrowRight className="h-4 w-4" /> خروج
          </Link>
          {phase === "end" && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={reset}
              className="rounded-xl bg-gradient-to-l from-pink-500 to-rose-600 px-4 py-2 text-sm font-bold text-white"
            >
              سباق جديد
            </button>
          )}
        </div>
        <div className="text-xs text-white/70">أول من يوصل {WIN_AT} نقاط يفوز</div>
      </div>
    </div>
  );
}
