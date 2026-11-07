"use client";

import { useEffect, useState } from "react";
import { Shell, TopControls } from "@/components/Shell";
import { ScoreBox, ModeTabs, btnPrimary, card, shuffle, sleep } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { SOUNDS, SOUND_CATS, playSound, type SoundDef } from "@/lib/synth";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { Play } from "lucide-react";

const ROUNDS = 6;

export default function SoundPage() {
  const names = useStore((s) => s.names);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [cat, setCat] = useState<string>("all");
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<SoundDef | null>(null);
  const [options, setOptions] = useState<SoundDef[]>([]);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [over, setOver] = useState(false);

  useEffect(() => {
    recordPlay();
    setLast("/sound");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pool = SOUNDS.filter((s) => cat === "all" || s.cat === cat);

  const prep = (r: number, list: SoundDef[]) => {
    const t = list[r];
    const others = shuffle(pool.filter((s) => s.id !== t.id)).slice(0, 3);
    setTarget(t);
    setOptions(shuffle([t, ...others]));
    setPicked(null);
    setTurn(0);
    setTimeout(() => playSound(t), 300);
  };

  const [deck, setDeck] = useState<SoundDef[]>([]);

  const start = () => {
    sfx.click();
    const list = shuffle(pool).slice(0, Math.min(ROUNDS, pool.length));
    setDeck(list);
    setRound(0);
    setScore([0, 0]);
    setOver(false);
    setStarted(true);
    prep(0, list);
  };

  // الأول يخمّن بعشرة، ولو غلط يجي دور الثاني بخمسة
  const pick = (id: string) => {
    if (picked || !target) return;
    if (id === target.id) {
      const pts = turn === 0 ? 10 : 5;
      setScore((s) => (turn === 0 ? [s[0] + pts, s[1]] : [s[0], s[1] + pts]));
      setPicked(id);
      sfx.win();
      celebrate(40);
      return;
    }
    sfx.lose();
    if (turn === 0) setTurn(1);
    else setPicked(id);
  };

  const nextRound = async () => {
    sfx.click();
    if (round + 1 >= deck.length) {
      setOver(true);
      setStarted(false);
      return;
    }
    setRound((r) => r + 1);
    prep(round + 1, deck);
  };

  const guesser = turn === 0 ? names.a : names.b;
  const correct = picked !== null && target !== null && picked === target.id;
  const done = picked !== null;

  return (
    <Shell title="خمّن الصوت" action={<TopControls />}>
      {!started ? (
        <div className={card}>
          {over && (
            <div className="mb-4 text-center">
              <div className="font-script text-4xl text-pink-400">
                {score[0] === score[1] ? "تعادل!" : score[0] > score[1] ? `${names.a} فاز` : `${names.b} فاز`}
              </div>
              <p className="mt-2 text-muted">{score[0]} - {score[1]}</p>
            </div>
          )}
          <div className="mb-3 text-center font-black">اختاروا نوع الأصوات</div>
          <ModeTabs
            value={cat}
            options={[{ v: "all", label: "الكل" }, ...SOUND_CATS.map((c) => ({ v: c.id, label: c.name }))]}
            onChange={setCat}
          />
          <p className="mb-4 text-center text-sm text-muted">تسمعون الصوت وتختارون اللي يطابقه. الأول بعشرة نقاط، والثاني بخمسة لو غلط الأول.</p>
          <div className="flex justify-center">
            <button className={btnPrimary} onClick={start}>{over ? "جولة جديدة" : "ابدأوا"}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <ScoreBox label={names.a} value={score[0]} active={turn === 0} />
            <ScoreBox label="الصوت" value={`${round + 1}/${deck.length}`} />
            <ScoreBox label={names.b} value={score[1]} active={turn === 1} />
          </div>

          <div className={card}>
            <div className="mb-4 flex flex-col items-center gap-3">
              <button
                onClick={() => target && playSound(target)}
                className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg transition active:scale-95"
                aria-label="اسمعوا الصوت"
              >
                <Play className="h-8 w-8" />
              </button>
              <div className="text-sm text-muted">{done ? (correct ? "صح!" : "") : `دور ${guesser} يخمّن`}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {options.map((o) => {
                const isRight = done && o.id === target?.id;
                const isWrong = picked === o.id && o.id !== target?.id;
                return (
                  <button
                    key={o.id}
                    disabled={done && !isWrong}
                    onClick={() => pick(o.id)}
                    className={`rounded-2xl border px-3 py-3 font-bold transition ${
                      isRight ? "border-emerald-400 bg-emerald-500/20"
                        : isWrong ? "border-rose-400 bg-rose-500/20"
                        : "border-line bg-surface-2 hover:border-pink-400"
                    }`}
                  >
                    {o.name}
                  </button>
                );
              })}
            </div>

            {done && (
              <div className="mt-4 flex justify-center gap-2">
                <button className={btnPrimary} onClick={nextRound}>
                  {round + 1 >= deck.length ? "شوفوا النتيجة" : "الصوت اللي بعده"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
