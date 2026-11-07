"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shell, TopControls } from "@/components/Shell";
import { Handoff } from "@/components/Handoff";
import { ScoreBox, btnPrimary, btnGhost, card, shuffle } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { QUIZ_CATS, QUIZ_QUESTIONS, type QuizCat } from "@/lib/game-data";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";

// كل جولة: 6 أسئلة (2 سهل، 2 متوسط، 2 صعب)، بالتناوب بين اللاعبين
type Q = (typeof QUIZ_QUESTIONS)[number];

function pickSet(cat: QuizCat | "all"): Q[] {
  const pool = QUIZ_QUESTIONS.filter((q) => cat === "all" || q.cat === cat);
  const take = (lv: 1 | 2 | 3) => shuffle(pool.filter((q) => q.level === lv)).slice(0, 2);
  return [...take(1), ...take(2), ...take(3)];
}

export default function QuizPage() {
  const names = useStore((s) => s.names);
  const incr = useStore((s) => s.incr);
  const counters = useStore((s) => s.counters);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [cat, setCat] = useState<QuizCat | "all">("all");
  const [set, setSet] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [handoff, setHandoff] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [phase, setPhase] = useState<"setup" | "play" | "over">("setup");

  useEffect(() => {
    recordPlay();
    setLast("/quiz");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = set[idx];
  const levelName = q ? (["", "سهل", "متوسط", "صعب"][q.level]) : "";

  const start = () => {
    sfx.click();
    setSet(pickSet(cat));
    setIdx(0);
    setScore([0, 0]);
    setTurn(0);
    setPicked(null);
    setHandoff(false);
    setPhase("play");
  };

  const answer = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    if (i === q.a) {
      setScore((s) => (turn === 0 ? [s[0] + 1, s[1]] : [s[0], s[1] + 1]));
      incr(turn === 0 ? "quizA" : "quizB");
      sfx.win();
      celebrate(40);
    } else sfx.lose();
  };

  const next = () => {
    sfx.click();
    if (idx + 1 >= set.length) {
      setPhase("over");
      return;
    }
    setIdx((i) => i + 1);
    setPicked(null);
    const nt = (turn === 0 ? 1 : 0) as 0 | 1;
    setTurn(nt);
    setHandoff(true);
  };

  const totalA = counters["quizA"] ?? 0;
  const totalB = counters["quizB"] ?? 0;

  return (
    <Shell title="مسابقة الثقافة" action={<TopControls />}>
      {handoff && phase === "play" && (
        <Handoff name={turn === 0 ? names.a : names.b} text="دورك تجاوب على هالسؤال" onReady={() => setHandoff(false)} />
      )}

      {phase === "setup" && (
        <div className={card}>
          <div className="mb-3 text-center font-black">اختاروا الفئة</div>
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {[{ id: "all" as const, name: "الكل" }, ...QUIZ_CATS].map((c) => (
              <button
                key={c.id}
                onClick={() => { sfx.click(); setCat(c.id); }}
                className={`rounded-full px-3.5 py-2 text-sm font-bold ${cat === c.id ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "bg-surface-2 text-muted"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="mb-4 rounded-2xl bg-black/20 p-3 text-center text-sm">
            <span className="font-bold">لوحة الصدارة:</span> {names.a} {totalA} · {names.b} {totalB}
          </div>
          <div className="flex justify-center">
            <button className={btnPrimary} onClick={start}>ابدأوا</button>
          </div>
        </div>
      )}

      {phase === "play" && q && (
        <>
          <div className="mb-3 flex gap-2">
            <ScoreBox label={names.a} value={score[0]} active={turn === 0} />
            <ScoreBox label={`سؤال ${idx + 1}/${set.length}`} value={levelName} />
            <ScoreBox label={names.b} value={score[1]} active={turn === 1} />
          </div>

          <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className={card}>
            <div className="mb-1 text-center text-xs text-muted">{QUIZ_CATS.find((c) => c.id === q.cat)?.name} · {levelName}</div>
            <div className="mb-2 text-center text-sm font-bold text-pink-400">يجاوب: {turn === 0 ? names.a : names.b}</div>
            <div className="mb-5 text-center text-lg font-black leading-relaxed">{q.q}</div>

            <div className="grid gap-2">
              {q.o.map((o, i) => {
                const right = picked !== null && i === q.a;
                const wrong = picked === i && i !== q.a;
                return (
                  <button
                    key={o}
                    disabled={picked !== null}
                    onClick={() => answer(i)}
                    className={`rounded-2xl border px-4 py-3 text-right font-bold transition ${
                      right ? "border-emerald-400 bg-emerald-500/20"
                        : wrong ? "border-rose-400 bg-rose-500/20"
                        : "border-line bg-surface-2 hover:border-pink-400"
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>

            {picked !== null && (
              <div className="mt-4 flex justify-center">
                <button className={btnPrimary} onClick={next}>
                  {idx + 1 >= set.length ? "النتيجة" : "السؤال اللي بعده"}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}

      {phase === "over" && (
        <div className={`${card} text-center`}>
          <div className="font-script text-4xl text-pink-400">
            {score[0] === score[1] ? "تعادل!" : score[0] > score[1] ? `${names.a} فاز` : `${names.b} فاز`}
          </div>
          <p className="mt-2 text-muted">{score[0]} - {score[1]} من {set.length}</p>
          <p className="mt-3 text-sm text-muted">لوحة الصدارة الكاملة: {names.a} {totalA} · {names.b} {totalB}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button className={btnPrimary} onClick={start}>جولة جديدة</button>
            <button className={btnGhost} onClick={() => setPhase("setup")}>غيّروا الفئة</button>
          </div>
        </div>
      )}
    </Shell>
  );
}
