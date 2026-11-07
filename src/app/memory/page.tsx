"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Star, Gem, Crown, Flower2, Moon, Sparkles, Feather, Users, User, RotateCcw, Timer } from "lucide-react";
import { Shell, TopControls } from "@/components/Shell";
import { celebrate } from "@/components/Providers";
import { useStore } from "@/lib/store";
import { sfx, buzz } from "@/lib/sound";

const SYMBOLS = [
  { Icon: Heart, color: "text-pink-500" },
  { Icon: Star, color: "text-amber-400" },
  { Icon: Gem, color: "text-cyan-400" },
  { Icon: Crown, color: "text-yellow-400" },
  { Icon: Flower2, color: "text-rose-400" },
  { Icon: Moon, color: "text-indigo-300" },
  { Icon: Sparkles, color: "text-fuchsia-400" },
  { Icon: Feather, color: "text-emerald-400" },
];

interface Card {
  id: number;
  symbol: number;
  open: boolean;
  matched: boolean;
}

type Mode = "solo" | "coop";

function makeDeck(): Card[] {
  const ids = [...SYMBOLS.keys(), ...SYMBOLS.keys()];
  // خلط Fisher-Yates
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.map((symbol, id) => ({ id, symbol, open: false, matched: false }));
}

export default function MemoryPage() {
  const names = useStore((s) => s.names);
  const memoBest = useStore((s) => s.stats.memoBest);
  const recordMemo = useStore((s) => s.recordMemo);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [mode, setMode] = useState<Mode>("solo");
  const [cards, setCards] = useState<Card[]>([]); // الخلط يصير في المتصفح فقط
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [turn, setTurn] = useState<0 | 1>(0); // للوضع التعاوني: من يلعب الحين
  const [lock, setLock] = useState(false);
  const [done, setDone] = useState(false);
  const pending = useRef<number[]>([]);

  useEffect(() => {
    recordPlay();
    setLast("/memory");
    setCards(makeDeck());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // المؤقت
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [done]);

  const reset = (m: Mode = mode) => {
    setCards(makeDeck());
    setMoves(0);
    setSeconds(0);
    setTurn(0);
    setLock(false);
    setDone(false);
    pending.current = [];
    setMode(m);
  };

  const flip = (idx: number) => {
    if (lock || done) return;
    const c = cards[idx];
    if (c.open || c.matched || pending.current.length === 2) return;
    sfx.pick();

    const next = cards.map((x, i) => (i === idx ? { ...x, open: true } : x));
    setCards(next);
    pending.current = [...pending.current, idx];
    if (pending.current.length < 2) return;

    // محاولة مطابقة
    const [a, b] = pending.current;
    const nm = moves + 1;
    setMoves(nm);
    setLock(true);

    if (next[a].symbol === next[b].symbol) {
      sfx.draw();
      const matched = next.map((x, i) => (i === a || i === b ? { ...x, matched: true } : x));
      setTimeout(() => {
        setCards(matched);
        pending.current = [];
        setLock(false);
        if (matched.every((x) => x.matched)) {
          setDone(true);
          sfx.win();
          celebrate(160);
          recordMemo(nm);
        }
      }, 350);
    } else {
      buzz(15);
      setTimeout(() => {
        setCards((cur) => cur.map((x, i) => (i === a || i === b ? { ...x, open: false } : x)));
        pending.current = [];
        setLock(false);
        if (mode === "coop") setTurn((t) => (t === 0 ? 1 : 0));
      }, 850);
    }
  };

  const matchedPairs = cards.filter((c) => c.matched).length / 2;
  const turnName = turn === 0 ? names.a : names.b;

  return (
    <Shell title="الذاكرة" action={<TopControls />}>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5">
        {(
          [
            { v: "solo", label: "فردي", Icon: User },
            { v: "coop", label: "تعاوني", Icon: Users },
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

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Box label="الحركات" value={moves} />
        <Box label="الوقت (ث)" value={seconds} icon={<Timer className="h-3.5 w-3.5" />} />
        <Box label="الأزواج" value={`${matchedPairs}/8`} />
      </div>

      <div className="rounded-3xl border border-line bg-surface p-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-black">
            {done
              ? `خلصتوها في ${moves} حركة 🎉`
              : mode === "coop"
                ? `دور ${turnName}`
                : "طابقوا الأزواج"}
          </span>
          <span className="text-muted">أفضل: {memoBest ?? "—"}</span>
          <button onClick={() => { sfx.click(); reset(); }} className="flex items-center gap-1 font-bold text-muted">
            <RotateCcw className="h-4 w-4" /> جديدة
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2.5" style={{ perspective: 900 }}>
          {cards.map((c, i) => {
            const { Icon, color } = SYMBOLS[c.symbol];
            const showFront = c.open || c.matched;
            return (
              <motion.button
                key={c.id}
                onClick={() => flip(i)}
                whileTap={{ scale: 0.94 }}
                className="relative aspect-[3/4] w-full"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: showFront ? 180 : 0, opacity: c.matched ? 0.45 : 1 }}
                transition={{ duration: 0.45 }}
              >
                <div
                  className="absolute inset-0 grid place-items-center rounded-2xl border border-line bg-gradient-to-br from-fuchsia-900 to-violet-950 text-pink-300/40"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <Sparkles className="h-6 w-6" />
                </div>
                <div
                  className="absolute inset-0 grid place-items-center rounded-2xl bg-white shadow-[0_0_20px_rgba(255,95,162,.45)]"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <Icon className={`h-9 w-9 ${color}`} strokeWidth={2.2} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {done && (
        <button onClick={() => { sfx.click(); reset(); }} className="mx-auto mt-5 block rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-6 py-3 font-bold text-white shadow-lg">
          العبوا مرة ثانية
        </button>
      )}
    </Shell>
  );
}

function Box({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-xs text-muted">
        {icon}
        {label}
      </div>
      <div className="text-xl font-black text-pink-500">{value}</div>
    </div>
  );
}
