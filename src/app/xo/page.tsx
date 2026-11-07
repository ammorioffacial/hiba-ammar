"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X as XIcon, Circle, Bot, Users, RotateCcw } from "lucide-react";
import { Shell, TopControls } from "@/components/Shell";
import { celebrate } from "@/components/Providers";
import { useStore } from "@/lib/store";
import { sfx, buzz } from "@/lib/sound";

type Cell = "X" | "O" | null;
type Mode = "pvp" | "cpu";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winnerOf(b: Cell[]): { player: "X" | "O" | "D"; line: number[] } | null {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { player: b[a]!, line: [a, c, d] };
  }
  return b.every(Boolean) ? { player: "D", line: [] } : null;
}

// الجهاز: يفوز إذا يقدر، يمنع الخسارة، وإلا يختار المركز أو عشوائياً
function botMove(b: Cell[]): number {
  const find = (p: "X" | "O") => {
    for (const l of LINES) {
      const free = l.filter((i) => !b[i]);
      const mine = l.filter((i) => b[i] === p);
      if (mine.length === 2 && free.length === 1) return free[0];
    }
    return null;
  };
  const free = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  return find("O") ?? find("X") ?? (b[4] ? free[Math.floor(Math.random() * free.length)] : 4);
}

export default function XOPage() {
  const names = useStore((s) => s.names);
  const streak = useStore((s) => s.stats.xoStreak);
  const recordXo = useStore((s) => s.recordXo);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [mode, setMode] = useState<Mode>("pvp");
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [result, setResult] = useState<ReturnType<typeof winnerOf>>(null);
  const [score, setScore] = useState({ X: 0, O: 0, D: 0 });

  useEffect(() => {
    recordPlay();
    setLast("/xo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playerName = (p: "X" | "O") => (p === "X" ? names.a : mode === "cpu" ? "الجهاز" : names.b);

  const reset = () => {
    setBoard(Array(9).fill(null));
    setTurn("X");
    setResult(null);
  };

  const finish = (b: Cell[], r: NonNullable<ReturnType<typeof winnerOf>>) => {
    setResult(r);
    setScore((s) => ({ ...s, [r.player]: s[r.player] + 1 }));
    if (r.player === "D") {
      sfx.draw();
      recordXo(false);
    } else if (r.player === "X") {
      sfx.win();
      celebrate();
      recordXo(true);
    } else {
      sfx.lose();
      recordXo(false);
      buzz(40);
    }
    return b;
  };

  const play = (i: number) => {
    if (result || board[i] || (mode === "cpu" && turn === "O")) return;
    sfx.pick();
    const next = [...board];
    next[i] = turn;
    setBoard(next);
    const r = winnerOf(next);
    if (r) return finish(next, r);
    setTurn(turn === "X" ? "O" : "X");
  };

  // دور الجهاز
  useEffect(() => {
    if (mode !== "cpu" || turn !== "O" || result) return;
    const t = setTimeout(() => {
      const next = [...board];
      next[botMove(board)] = "O";
      setBoard(next);
      const r = winnerOf(next);
      if (r) finish(next, r);
      else setTurn("X");
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, mode, result]);

  const status = result
    ? result.player === "D"
      ? "تعادل 🤝"
      : `${playerName(result.player)} فاز 🎉`
    : mode === "cpu" && turn === "O"
      ? "الجهاز يفكر…"
      : `دور ${playerName(turn)}`;

  return (
    <Shell title="إكس أو" action={<TopControls />}>
      {/* وضع اللعب */}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5">
        {(
          [
            { v: "pvp", label: `${names.a} و${names.b}`, Icon: Users },
            { v: "cpu", label: "ضد الجهاز", Icon: Bot },
          ] as const
        ).map(({ v, label, Icon }) => (
          <button
            key={v}
            onClick={() => {
              sfx.click();
              setMode(v);
              setScore({ X: 0, O: 0, D: 0 });
              reset();
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
              mode === v ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white shadow-lg" : "text-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* النتيجة */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <ScoreBox label={names.a} value={score.X} />
        <ScoreBox label="تعادل" value={score.D} />
        <ScoreBox label={mode === "cpu" ? "الجهاز" : names.b} value={score.O} />
      </div>

      <div className="rounded-3xl border border-line bg-surface p-5 backdrop-blur">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-bold text-pink-500">سلسلة الانتصار: {streak} 🔥</span>
          <button onClick={() => { sfx.click(); reset(); }} className="flex items-center gap-1 font-bold text-muted">
            <RotateCcw className="h-4 w-4" /> جولة جديدة
          </button>
        </div>

        <div className="mb-3 min-h-6 text-center font-black">{status}</div>

        <div className="mx-auto grid max-w-[340px] grid-cols-3 gap-2.5">
          {board.map((cell, i) => {
            const won = result?.line.includes(i);
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.92 }}
                onClick={() => play(i)}
                className={`grid aspect-square place-items-center rounded-2xl border border-line transition ${
                  won ? "bg-gold/25 border-gold" : "bg-surface-2 hover:bg-pink-500/10"
                }`}
              >
                <AnimatePresence>
                  {cell && (
                    <motion.span
                      key={cell}
                      initial={{ scale: 0, rotate: -90, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 18 }}
                      className={cell === "X" ? "text-pink-500" : "text-pink-200"}
                    >
                      {cell === "X" ? <XIcon className="h-10 w-10" strokeWidth={2.5} /> : <Circle className="h-9 w-9" strokeWidth={2.5} />}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-2.5 text-center">
      <div className="truncate text-xs text-muted">{label}</div>
      <div className="text-2xl font-black text-pink-500">{value}</div>
    </div>
  );
}
