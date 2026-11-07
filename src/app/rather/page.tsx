"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shell, TopControls } from "@/components/Shell";
import { Handoff } from "@/components/Handoff";
import { RATHER_QUESTIONS } from "@/lib/content";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";

type Stage = "a" | "handoff" | "b" | "reveal";

export default function RatherPage() {
  const names = useStore((s) => s.names);
  const incr = useStore((s) => s.incr);
  const counters = useStore((s) => s.counters);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [questions, setQuestions] = useState<typeof RATHER_QUESTIONS>([]); // الخلط يصير في المتصفح فقط
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState<Stage>("a");
  const [pickA, setPickA] = useState<0 | 1 | null>(null);
  const [pickB, setPickB] = useState<0 | 1 | null>(null);
  const [sameCount, setSameCount] = useState(0);

  useEffect(() => {
    recordPlay();
    setLast("/rather");
    setQuestions([...RATHER_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 6));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = questions[idx];
  const total = counters["ratherTotal"] ?? 0;
  const same = counters["ratherSame"] ?? 0;
  const pct = total ? Math.round((same / total) * 100) : null;

  const choose = (side: 0 | 1) => {
    sfx.pick();
    if (stage === "a") {
      setPickA(side);
      setStage("handoff");
    } else if (stage === "b") {
      setPickB(side);
      const agree = side === pickA;
      setSameCount((c) => c + (agree ? 1 : 0));
      incr("ratherTotal");
      if (agree) incr("ratherSame");
      setStage("reveal");
    }
  };

  const next = () => {
    sfx.click();
    setPickA(null);
    setPickB(null);
    setStage("a");
    setIdx((i) => i + 1);
  };

  const finished = questions.length > 0 && idx >= questions.length;
  const label = (side: 0 | 1) => (side === 0 ? q?.a : q?.b);

  return (
    <Shell title="هل تفضل؟" action={<TopControls />}>
      {stage === "handoff" && (
        <Handoff name={names.b} text="دورك الحين، اختاري بالسر، وما تخلّين الثاني يشوف!" onReady={() => setStage("b")} />
      )}

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-line bg-surface p-3 text-center">
          <div className="text-xs text-muted">نسبة التوافق</div>
          <div className="text-2xl font-black text-pink-500">{pct === null ? "—" : `${pct}%`}</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-3 text-center">
          <div className="text-xs text-muted">السؤال</div>
          <div className="text-2xl font-black text-pink-500">
            {Math.min(idx + 1, questions.length)}/{questions.length}
          </div>
        </div>
      </div>

      {finished ? (
        <div className="rounded-3xl border border-line bg-surface p-6 text-center">
          <div className="font-script text-4xl text-pink-400">خلصنا!</div>
          <p className="mt-3 text-muted">اتفقتوا على {sameCount} من {questions.length} سؤال</p>
          <button onClick={() => { sfx.click(); setIdx(0); setSameCount(0); setStage("a"); }} className="mt-5 rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-6 py-3 font-bold text-white">
            جولة جديدة
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-line bg-surface p-5 backdrop-blur">
          <div className="mb-4 text-center text-sm font-bold text-pink-400">
            {stage === "b" ? `دور ${names.b}` : stage === "reveal" ? "النتيجة" : `دور ${names.a}`}
          </div>
          <div className="mb-5 text-center text-lg font-black">هل تفضل؟</div>

          <div className="grid gap-3">
            {[0, 1].map((side) => {
              const s = side as 0 | 1;
              const chosen = stage === "reveal" && (s === pickA || s === pickB);
              const agree = stage === "reveal" && pickA === pickB;
              return (
                <motion.button
                  key={side}
                  disabled={stage !== "a" && stage !== "b"}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => choose(s)}
                  className={`rounded-2xl border p-5 text-center text-base font-bold transition disabled:cursor-default ${
                    chosen
                      ? agree
                        ? "border-emerald-400 bg-emerald-500/20"
                        : "border-gold bg-gold/15"
                      : "border-line bg-surface-2 hover:border-pink-400"
                  }`}
                >
                  {label(s)}
                  {stage === "reveal" && (
                    <div className="mt-2 text-xs text-muted">
                      {s === pickA ? `${names.a} اختارت هذا` : ""}
                      {s === pickA && s === pickB ? " · " : ""}
                      {s === pickB ? `${names.b} اختار هذا` : ""}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {stage === "reveal" && (
            <div className="mt-5 text-center">
              <div className="mb-3 font-black">{pickA === pickB ? "متفقين! 💞" : "مختلفين، وهذا حلو 😄"}</div>
              <button onClick={next} className="rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-6 py-2.5 font-bold text-white">
                السؤال اللي بعده
              </button>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-muted">نسبة التوافق تتحدث عبر كل الجولات على هذا الجهاز</p>
    </Shell>
  );
}
