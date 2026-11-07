"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Pizza, House, Film, Plane, MapPin, Coffee, Book, Moon, Star, Heart, Cloud, Umbrella,
  Cake, Gift, Music, Mountain, Camera, Waves, Sun, Utensils, type LucideIcon,
} from "lucide-react";
import { Shell, TopControls } from "@/components/Shell";
import { ScoreBox, btnPrimary, card, shuffle } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { ICON_PUZZLES } from "@/lib/game-data";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";

const ICON_MAP: Record<string, LucideIcon> = {
  Pizza, House, Film, Plane, MapPin, Coffee, Book, Moon, Star, Heart, Cloud, Umbrella,
  Cake, Gift, Music, Mountain, Camera, Waves, Sun, Utensils,
};

const ROUNDS = 8;

export default function IconsPage() {
  const names = useStore((s) => s.names);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [deck, setDeck] = useState<typeof ICON_PUZZLES>([]);
  const [round, setRound] = useState(0);
  const [turn, setTurn] = useState<0 | 1>(0); // من يخمّن الحين
  const [options, setOptions] = useState<string[]>([]);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    recordPlay();
    setLast("/icons");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const puzzle = deck[round];

  const prep = (list: typeof ICON_PUZZLES, r: number) => {
    const p = list[r];
    const others = list.filter((x) => x.answer !== p.answer).map((x) => x.answer);
    setOptions(shuffle([p.answer, ...shuffle(others).slice(0, 3)]));
    setTurn(0);
    setWrongPick(null);
    setRevealed(false);
  };

  const start = () => {
    sfx.click();
    const list = shuffle(ICON_PUZZLES).slice(0, ROUNDS);
    setDeck(list);
    setRound(0);
    setScore([0, 0]);
    setStarted(true);
    prep(list, 0);
  };

  // الأول يحاول بقيمة 10، ولو غلط يجي دور الثاني بقيمة 5
  const pick = (opt: string) => {
    if (revealed || !puzzle) return;
    if (opt === puzzle.answer) {
      const pts = turn === 0 ? 10 : 5;
      setScore((s) => (turn === 0 ? [s[0] + pts, s[1]] : [s[0], s[1] + pts]));
      setRevealed(true);
      sfx.win();
      celebrate(50);
      return;
    }
    sfx.lose();
    setWrongPick(opt);
    if (turn === 0) {
      setTurn(1);
      setWrongPick(null);
    } else {
      setRevealed(true);
    }
  };

  const nextRound = () => {
    sfx.click();
    if (round + 1 >= deck.length) {
      setStarted(false);
      return;
    }
    setRound((r) => r + 1);
    prep(deck, round + 1);
  };

  const finished = started === false && deck.length > 0;
  const guesser = turn === 0 ? names.a : names.b;

  return (
    <Shell title="لعبة الأيقونات" action={<TopControls />}>
      {!started ? (
        <div className={`${card} text-center`}>
          {finished && (
            <div className="mb-4">
              <div className="font-script text-4xl text-pink-400">
                {score[0] === score[1] ? "تعادل!" : score[0] > score[1] ? `${names.a} فاز` : `${names.b} فاز`}
              </div>
              <p className="mt-2 text-muted">{score[0]} - {score[1]}</p>
            </div>
          )}
          {!finished && <p className="mb-4 text-muted">شوفوا الرموز وخمّنوا وش المعنى. الأول يخمّن بعشرة نقاط، والثاني بخمسة لو غلط الأول.</p>}
          <button className={btnPrimary} onClick={start}>{finished ? "جولة جديدة" : "ابدأوا"}</button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <ScoreBox label={names.a} value={score[0]} active={turn === 0} />
            <ScoreBox label="اللغز" value={`${round + 1}/${deck.length}`} />
            <ScoreBox label={names.b} value={score[1]} active={turn === 1} />
          </div>

          <div className={card}>
            <div className="mb-4 flex justify-center gap-3">
              {puzzle?.icons.map((name, i) => {
                const Icon = ICON_MAP[name];
                return (
                  <motion.div
                    key={`${round}-${i}`}
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.15, type: "spring" }}
                    className="grid h-20 w-20 place-items-center rounded-3xl border border-line bg-gradient-to-br from-pink-500/25 to-rose-600/25"
                  >
                    {Icon && <Icon className="h-9 w-9 text-pink-400" strokeWidth={2} />}
                  </motion.div>
                );
              })}
            </div>

            <div className="mb-3 text-center font-bold">
              {revealed ? (
                <span className="text-pink-400">الجواب: {puzzle?.answer}</span>
              ) : (
                <span>دور {guesser} يخمّن {turn === 1 ? "(الأول غلط)" : ""}</span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              {options.map((o) => {
                const correct = revealed && o === puzzle?.answer;
                const wrong = wrongPick === o;
                return (
                  <button
                    key={o}
                    disabled={revealed}
                    onClick={() => pick(o)}
                    className={`rounded-2xl border px-4 py-3 text-right font-bold transition ${
                      correct ? "border-emerald-400 bg-emerald-500/20"
                        : wrong ? "border-rose-400 bg-rose-500/20"
                        : "border-line bg-surface-2 hover:border-pink-400"
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <div className="mt-4 flex justify-center">
                <button className={btnPrimary} onClick={nextRound}>
                  {round + 1 >= deck.length ? "شوفوا النتيجة" : "اللغز اللي بعده"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
