"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Hand, Mountain, Scissors, Bot, Users, RotateCcw } from "lucide-react";
import { Shell, TopControls } from "@/components/Shell";
import { celebrate } from "@/components/Providers";
import { Handoff } from "@/components/Handoff";
import { useStore } from "@/lib/store";
import { sfx, buzz } from "@/lib/sound";

type Choice = "rock" | "paper" | "scissors";
type Mode = "cpu" | "pvp";

// أيقونات Lucide: الحجر جبل، الورقة كف، المقص مقص
const ICONS: Record<Choice, React.ElementType> = {
  rock: Mountain,
  paper: Hand,
  scissors: Scissors,
};

const CHOICES: { id: Choice; label: string }[] = [
  { id: "rock", label: "حجر" },
  { id: "paper", label: "ورقة" },
  { id: "scissors", label: "مقص" },
];

const BEATS: Record<Choice, Choice> = { rock: "scissors", paper: "rock", scissors: "paper" };
const WIN_AT = 3; // أفضل من 5 جولات

function HandIcon({ choice, className }: { choice: Choice; className?: string }) {
  const Icon = ICONS[choice];
  return <Icon className={className} strokeWidth={2} />;
}

export default function RpsPage() {
  const names = useStore((s) => s.names);
  const recordRps = useStore((s) => s.recordRps);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [mode, setMode] = useState<Mode>("cpu");
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [picks, setPicks] = useState<[Choice | null, Choice | null]>([null, null]);
  const [phase, setPhase] = useState<"pick1" | "pick2" | "reveal" | "over">("pick1");
  const [msg, setMsg] = useState("اختاري حركتك");
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [handoff, setHandoff] = useState(false);

  useEffect(() => {
    recordPlay();
    setLast("/rps");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = (m: Mode = mode) => {
    setScore([0, 0]);
    setPicks([null, null]);
    setPhase("pick1");
    setWinner(null);
    setHandoff(false);
    setMode(m);
    setMsg(m === "cpu" ? "اختاري حركتك" : `${names.a} تختار أولاً`);
  };

  const pickFor = (who: 0 | 1, c: Choice) => {
    sfx.pick();
    buzz(10);
    if (mode === "pvp" && who === 0) {
      setPicks([c, null]);
      setPhase("pick2");
      setMsg(`الحين ${names.b} تختار`);
      setHandoff(true);
      return;
    }
    const p1 = who === 0 ? c : picks[0];
    const p2 = mode === "cpu" ? (["rock", "paper", "scissors"] as Choice[])[Math.floor(Math.random() * 3)] : c;
    reveal(p1 as Choice, p2);
  };

  const reveal = (a: Choice, b: Choice) => {
    setPicks([a, b]);
    setPhase("reveal");
    const w: 0 | 1 | null = a === b ? null : BEATS[a] === b ? 0 : 1;
    setWinner(w);
    const next: [number, number] = [score[0] + (w === 0 ? 1 : 0), score[1] + (w === 1 ? 1 : 0)];
    setScore(next);

    if (w === null) {
      setMsg("تعادل 🤝");
      sfx.draw();
    } else if (w === 0) {
      setMsg(mode === "cpu" ? "فزتِ بالجولة 🎉" : `${names.a} فازت بالجولة 🎉`);
      sfx.win();
      recordRps(mode === "cpu");
    } else {
      setMsg(mode === "cpu" ? "الجهاز فاز بالجولة 🤖" : `${names.b} فاز بالجولة 🎉`);
      sfx.lose();
    }

    if (next[0] >= WIN_AT || next[1] >= WIN_AT) {
      setTimeout(() => {
        setPhase("over");
        const meWon = next[0] > next[1];
        setMsg(
          mode === "cpu"
            ? meWon ? "فزتِ بالمباراة! 🏆" : "الجهاز كسب المباراة 🤖"
            : `${meWon ? names.a : names.b} فاز بالمباراة 🏆`
        );
        if (meWon) celebrate(160);
      }, 1200);
      return;
    }

    setTimeout(() => {
      setPicks([null, null]);
      setWinner(null);
      setPhase("pick1");
      setMsg(mode === "cpu" ? "اختاري حركتك" : `${names.a} تختار أولاً`);
    }, 1600);
  };

  const interactive = phase === "pick1" || phase === "pick2";
  const who: 0 | 1 = phase === "pick2" ? 1 : 0;
  const leftName = names.a;
  const rightName = mode === "cpu" ? "الجهاز" : names.b;

  return (
    <Shell title="حجر ورقة مقص" action={<TopControls />}>
      {handoff && (
        <Handoff name={names.b} text={`${names.a} اختارت بالسر. ${names.b}، دورك الحين!`} onReady={() => setHandoff(false)} />
      )}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5">
        {(
          [
            { v: "cpu", label: "ضد الجهاز", Icon: Bot },
            { v: "pvp", label: `${names.a} و${names.b}`, Icon: Users },
          ] as const
        ).map(({ v, label, Icon }) => (
          <button
            key={v}
            onClick={() => { sfx.click(); reset(v); }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
              mode === v ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white shadow-lg" : "text-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <Score label={leftName} value={score[0]} />
        <Score label={rightName} value={score[1]} />
      </div>

      <div className="rounded-3xl border border-line bg-surface p-5 backdrop-blur">
        <div className="flex items-center justify-around py-4">
          <Side label={leftName} choice={picks[0]} reveal={phase === "reveal" || phase === "over"} won={winner === 0} />
          <span className="font-script text-2xl text-pink-400">VS</span>
          <Side label={rightName} choice={picks[1]} reveal={phase === "reveal" || phase === "over"} won={winner === 1} flip />
        </div>

        <div className="mb-4 min-h-6 text-center font-black">{msg}</div>

        {phase === "over" ? (
          <div className="flex justify-center">
            <button onClick={() => { sfx.click(); reset(); }} className="flex items-center gap-2 rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-6 py-3 font-bold text-white shadow-lg">
              <RotateCcw className="h-4 w-4" /> مباراة جديدة
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {CHOICES.map((c) => (
              <motion.button
                key={c.id}
                disabled={!interactive}
                whileTap={{ scale: 0.92 }}
                onClick={() => pickFor(who, c.id)}
                className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface-2 py-4 transition hover:border-pink-400 disabled:opacity-40"
              >
                <HandIcon choice={c.id} className="h-9 w-9" />
                <span className="text-xs font-bold text-muted">{c.label}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted">أول من يوصل {WIN_AT} جولات يفوز بالمباراة</p>
    </Shell>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 text-center">
      <div className="truncate text-xs text-muted">{label}</div>
      <div className="text-3xl font-black text-pink-500">{value}</div>
    </div>
  );
}

function Side({
  label,
  choice,
  reveal,
  won,
  flip,
}: {
  label: string;
  choice: Choice | null;
  reveal: boolean;
  won: boolean;
  flip?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs font-bold text-muted">{label}</div>
      <motion.div
        key={reveal ? `r-${choice}` : "hidden"}
        initial={{ scale: 0.4, rotate: flip ? 40 : -40, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 14 }}
        className={`grid h-24 w-24 place-items-center rounded-3xl border ${won ? "border-gold bg-gold/20" : "border-line bg-surface-2"}`}
      >
        {reveal && choice ? (
          <HandIcon choice={choice} className={`h-12 w-12 text-pink-500 ${flip ? "-scale-x-100" : ""}`} />
        ) : (
          <span className="text-3xl font-black text-muted">?</span>
        )}
      </motion.div>
    </div>
  );
}
