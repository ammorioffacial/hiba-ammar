"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shell, TopControls } from "@/components/Shell";
import { Handoff } from "@/components/Handoff";
import { celebrate } from "@/components/Providers";
import { KNOW_QUESTIONS } from "@/lib/content";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";

// كل واحد يجاوب عن نفسه بالسر، وبعدين نقارن: كم مرة اتفقتوا؟
type Stage = "a" | "handoff" | "b" | "reveal";

export default function KnowPage() {
  const names = useStore((s) => s.names);
  const incr = useStore((s) => s.incr);
  const counters = useStore((s) => s.counters);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [questions, setQuestions] = useState<typeof KNOW_QUESTIONS>([]); // الخلط يصير في المتصفح فقط
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState<Stage>("a");
  const [pickA, setPickA] = useState<number | null>(null);
  const [pickB, setPickB] = useState<number | null>(null);
  const [matches, setMatches] = useState(0);

  useEffect(() => {
    recordPlay();
    setLast("/know");
    setQuestions([...KNOW_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = questions[idx];
  const finished = questions.length > 0 && idx >= questions.length;
  const total = counters["knowTotal"] ?? 0;
  const hits = counters["knowMatch"] ?? 0;
  const compat = total ? Math.round((hits / total) * 100) : null;

  const choose = (i: number) => {
    sfx.pick();
    if (stage === "a") {
      setPickA(i);
      setStage("handoff");
    } else if (stage === "b") {
      setPickB(i);
      const same = i === pickA;
      if (same) setMatches((m) => m + 1);
      incr("knowTotal");
      if (same) incr("knowMatch");
      setStage("reveal");
      if (same) sfx.win();
    }
  };

  const next = () => {
    sfx.click();
    setPickA(null);
    setPickB(null);
    setStage("a");
    setIdx((i) => i + 1);
  };

  const restart = () => {
    setIdx(0);
    setMatches(0);
    setStage("a");
    setPickA(null);
    setPickB(null);
  };

  useEffect(() => {
    if (finished && matches >= Math.ceil(questions.length / 2)) celebrate(100);
  }, [finished, matches, questions.length]);

  const who = stage === "b" || (stage === "reveal") ? names.b : names.a;

  return (
    <Shell title="اعرفني أكثر" action={<TopControls />}>
      {stage === "handoff" && (
        <Handoff name={names.b} text="دورك الحين، جاوب عن نفسك بالسر" onReady={() => setStage("b")} />
      )}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-line bg-surface p-3 text-center">
          <div className="text-xs text-muted">نسبة التوافق</div>
          <div className="text-2xl font-black text-pink-500">{compat === null ? "—" : `${compat}%`}</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-3 text-center">
          <div className="text-xs text-muted">الجولة الحالية</div>
          <div className="text-2xl font-black text-pink-500">
            {matches}/{Math.min(idx, questions.length)}
          </div>
        </div>
      </div>

      {finished ? (
        <div className="rounded-3xl border border-line bg-surface p-6 text-center">
          <div className="font-script text-4xl text-pink-400">
            {matches === questions.length ? "توأم الروح!" : matches >= questions.length / 2 ? "ممتاز، تعرفون بعض!" : "فيكم مجال تتعرفون أكثر"}
          </div>
          <p className="mt-3 text-muted">اتفقتوا على {matches} من {questions.length} سؤال</p>
          <button onClick={restart} className="mt-5 rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-6 py-3 font-bold text-white">
            جولة جديدة
          </button>
        </div>
      ) : !q ? null : (
        <motion.div key={idx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-3xl border border-line bg-surface p-5 backdrop-blur">
          <div className="mb-2 text-center text-sm font-bold text-pink-400">
            {stage === "reveal" ? "النتيجة" : `${who} تجاوب عن نفسها/نفسه`}
          </div>
          <div className="mb-5 text-center text-lg font-black">{q.q}</div>

          <div className="grid grid-cols-2 gap-2.5">
            {q.o.map((opt, i) => {
              const chosen = stage === "reveal" && (i === pickA || i === pickB);
              const agree = stage === "reveal" && pickA === pickB;
              return (
                <motion.button
                  key={opt}
                  whileTap={{ scale: 0.96 }}
                  disabled={stage !== "a" && stage !== "b"}
                  onClick={() => choose(i)}
                  className={`rounded-2xl border p-3.5 text-sm font-bold transition disabled:cursor-default ${
                    chosen
                      ? agree
                        ? "border-emerald-400 bg-emerald-500/20"
                        : "border-gold bg-gold/15"
                      : "border-line bg-surface-2 hover:border-pink-400"
                  }`}
                >
                  {opt}
                </motion.button>
              );
            })}
          </div>

          {stage === "reveal" && (
            <div className="mt-5 text-center">
              <div className="mb-1 text-sm text-muted">
                {names.a}: {q.o[pickA ?? 0]} · {names.b}: {q.o[pickB ?? 0]}
              </div>
              <div className="mb-3 font-black">{pickA === pickB ? "متفقين 💞" : "مختلفين، وهذا ممتع 😄"}</div>
              <button onClick={next} className="rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-6 py-2.5 font-bold text-white">
                السؤال اللي بعده
              </button>
            </div>
          )}
        </motion.div>
      )}

      <p className="mt-4 text-center text-xs text-muted">نسبة التوافق تتحدث عبر كل الجولات على هذا الجهاز</p>
    </Shell>
  );
}
