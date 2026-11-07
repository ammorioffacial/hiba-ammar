"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, X as XIcon, Timer } from "lucide-react";
import { Shell, TopControls } from "@/components/Shell";
import { celebrate } from "@/components/Providers";
import { TRUE_FALSE } from "@/lib/content";
import { useStore } from "@/lib/store";
import { sfx, buzz } from "@/lib/sound";

const SECONDS = 10;
const ROUNDS = 8;

export default function TruePage() {
  const names = useStore((s) => s.names);
  const incr = useStore((s) => s.incr);
  const counters = useStore((s) => s.counters);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [items, setItems] = useState<typeof TRUE_FALSE>([]); // الخلط يصير في المتصفح فقط
  const [idx, setIdx] = useState(0);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [left, setLeft] = useState(SECONDS);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [points, setPoints] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    recordPlay();
    setLast("/tf");
    setItems([...TRUE_FALSE].sort(() => Math.random() - 0.5).slice(0, ROUNDS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item = items[idx];
  const finished = items.length > 0 && idx >= items.length;
  const accuracy = (counters["tfTotal"] ?? 0) ? Math.round(((counters["tfCorrect"] ?? 0) / (counters["tfTotal"] ?? 1)) * 100) : null;

  // العداد التنازلي للسؤال الحالي
  useEffect(() => {
    if (finished || answer !== null) return;
    if (left <= 0) {
      submit(null);
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, answer, finished]);

  const submit = (choice: boolean | null) => {
    if (answer !== null || !item) return;
    const correct = choice === item.v;
    setAnswer(choice ?? false);
    incr("tfTotal");
    if (correct) {
      incr("tfCorrect");
      const gained = 10 + left;
      setPoints((p) => (turn === 0 ? [p[0] + gained, p[1]] : [p[0], p[1] + gained]));
      sfx.win();
    } else {
      sfx.lose();
      buzz(30);
    }
  };

  const next = () => {
    sfx.click();
    setAnswer(null);
    setLeft(SECONDS);
    setTurn((t) => (t === 0 ? 1 : 0));
    setIdx((i) => i + 1);
  };

  useEffect(() => {
    if (finished && points[0] + points[1] > 0) celebrate(120);
  }, [finished, points]);

  const restart = () => {
    setIdx(0);
    setLeft(SECONDS);
    setAnswer(null);
    setPoints([0, 0]);
    setTurn(0);
  };

  return (
    <Shell title="صح أو غلط" action={<TopControls />}>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Score label={names.a} value={points[0]} active={turn === 0 && !finished} />
        <Score label={names.b} value={points[1]} active={turn === 1 && !finished} />
      </div>

      {finished ? (
        <div className="rounded-3xl border border-line bg-surface p-6 text-center">
          <div className="font-script text-4xl text-pink-400">
            {points[0] === points[1] ? "تعادل!" : points[0] > points[1] ? `${names.a} فاز` : `${names.b} فاز`}
          </div>
          <p className="mt-3 text-muted">الدقة الكلية: {accuracy ?? 0}%</p>
          <button onClick={restart} className="mt-5 rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-6 py-3 font-bold text-white">
            جولة جديدة
          </button>
        </div>
      ) : !item ? null : (
        <div className="rounded-3xl border border-line bg-surface p-5 backdrop-blur">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-bold text-pink-400">دور {turn === 0 ? names.a : names.b}</span>
            <span className="flex items-center gap-1 font-black">
              <Timer className="h-4 w-4" /> {left}
            </span>
          </div>

          <div className="mb-2 text-xs text-muted">{item.cat}</div>
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 min-h-[88px] text-center text-xl font-black leading-relaxed"
          >
            {item.s}
          </motion.div>

          {answer === null ? (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => submit(true)} className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface-2 py-4 font-bold hover:border-emerald-400">
                <Check className="h-5 w-5 text-emerald-400" /> صح
              </button>
              <button onClick={() => submit(false)} className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface-2 py-4 font-bold hover:border-rose-400">
                <XIcon className="h-5 w-5 text-rose-400" /> غلط
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className={`mb-3 font-black ${answer === item.v ? "text-emerald-400" : "text-rose-400"}`}>
                {answer === item.v ? "إجابة صحيحة 🎉" : "إجابة خاطئة"}
              </div>
              <div className="mb-4 text-sm text-muted">الإجابة: {item.v ? "صح" : "غلط"}</div>
              <button onClick={next} className="rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-6 py-2.5 font-bold text-white">
                التالي
              </button>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-muted">
        الدقة على هذا الجهاز: {accuracy === null ? "—" : `${accuracy}%`} · كل إجابة صحيحة = 10 نقاط + الوقت المتبقي
      </p>
    </Shell>
  );
}

function Score({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 text-center transition ${active ? "border-pink-400 bg-pink-500/10" : "border-line bg-surface"}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="text-2xl font-black text-pink-500">{value}</div>
    </div>
  );
}
