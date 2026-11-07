"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shell, TopControls } from "@/components/Shell";
import { ScoreBox, ModeTabs, btnPrimary, btnGhost, card, shuffle, sleep } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { SCRAMBLE_WORDS } from "@/lib/game-data";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";

type Level = keyof typeof SCRAMBLE_WORDS;
const ROUNDS = 6;
const SECONDS = 30;

function scrambled(word: string): string[] {
  let s = shuffle([...word]);
  for (let i = 0; i < 10 && s.join("") === word; i++) s = shuffle([...word]);
  return s;
}

export default function ScramblePage() {
  const names = useStore((s) => s.names);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [level, setLevel] = useState<Level>("easy");
  const [started, setStarted] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [letters, setLetters] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [left, setLeft] = useState(SECONDS);
  const [hint, setHint] = useState(false);
  const [solved, setSolved] = useState(false);
  const [msg, setMsg] = useState("");
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [over, setOver] = useState(false);

  useEffect(() => {
    recordPlay();
    setLast("/scramble");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const word = words[round] ?? "";

  const prep = (w: string) => {
    setLetters(scrambled(w));
    setInput("");
    setLeft(SECONDS);
    setHint(false);
    setSolved(false);
    setMsg("");
  };

  // العداد: إذا خلص الوقت يتكشف الجواب
  useEffect(() => {
    if (!started || over || solved) return;
    if (left <= 0) {
      setSolved(true);
      setMsg(`الوقت خلص! الكلمة كانت: ${word}`);
      sfx.lose();
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [started, over, solved, left, word]);

  const start = () => {
    sfx.click();
    const list = shuffle(SCRAMBLE_WORDS[level]).slice(0, ROUNDS);
    setWords(list);
    setRound(0);
    setScore([0, 0]);
    setOver(false);
    setStarted(true);
    prep(list[0]);
  };

  const next = async () => {
    if (round + 1 >= words.length) {
      setOver(true);
      return;
    }
    await sleep(300);
    setRound((r) => r + 1);
    prep(words[round + 1]);
  };

  const claim = async (p: 0 | 1) => {
    if (solved) return;
    if (input.trim() === word) {
      setScore((s) => (p === 0 ? [s[0] + 10, s[1]] : [s[0], s[1] + 10]));
      setSolved(true);
      setMsg(`${p === 0 ? names.a : names.b} كتبها صح! +10`);
      sfx.win();
      celebrate(60);
      await next();
    } else {
      setMsg("مو صحيح، جربوا مرة ثانية");
      sfx.lose();
    }
  };

  const levelOptions: { v: Level; label: string }[] = [
    { v: "easy", label: "سهل (4 حروف)" },
    { v: "medium", label: "متوسط (6)" },
    { v: "hard", label: "صعب (8+)" },
  ];

  return (
    <Shell title="ترتيب الكلمات" action={<TopControls />}>
      {!started || over ? (
        <div className={card}>
          {over ? (
            <div className="mb-4 text-center">
              <div className="font-script text-4xl text-pink-400">
                {score[0] === score[1] ? "تعادل!" : score[0] > score[1] ? `${names.a} فاز` : `${names.b} فاز`}
              </div>
              <p className="mt-2 text-muted">{score[0]} - {score[1]}</p>
            </div>
          ) : (
            <div className="mb-3 text-center font-black">اختاروا المستوى</div>
          )}
          <ModeTabs value={level} options={levelOptions} onChange={setLevel} />
          <p className="mb-4 text-center text-sm text-muted">{ROUNDS} كلمات، كل واحد يقول الكلمة قبل الثاني، ومعكم {SECONDS} ثانية لكل كلمة</p>
          <div className="flex justify-center">
            <button className={btnPrimary} onClick={start}>{over ? "جولة جديدة" : "ابدأوا"}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <ScoreBox label={names.a} value={score[0]} />
            <ScoreBox label="الوقت" value={left} active={left <= 10} />
            <ScoreBox label={names.b} value={score[1]} />
          </div>

          <div className={card}>
            <div className="mb-3 text-center text-sm text-muted">الكلمة {round + 1} من {ROUNDS}</div>
            <div className="mb-5 flex flex-wrap justify-center gap-2" dir="rtl">
              {letters.map((l, i) => (
                <motion.div
                  key={`${round}-${i}`}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
                  className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface-2 text-2xl font-black text-pink-400"
                >
                  {l}
                </motion.div>
              ))}
            </div>

            {hint && !solved && (
              <div className="mb-3 text-center text-sm text-muted">تلميح: أول حرف <span className="font-black text-pink-400">{word[0]}</span></div>
            )}

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={solved}
              placeholder="اكتبوا الكلمة"
              className="mb-3 w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-center text-lg font-bold outline-none focus:border-pink-400 select-text"
            />

            <div className="mb-3 text-center text-sm font-bold">{msg || " "}</div>

            {!solved ? (
              <>
                <div className="mb-2 text-center text-xs text-muted">اختاروا مين كتبها أولاً</div>
                <div className="flex justify-center gap-3">
                  <button className={btnPrimary} onClick={() => claim(0)}>{names.a}</button>
                  <button className={btnPrimary} onClick={() => claim(1)}>{names.b}</button>
                </div>
                <div className="mt-3 flex justify-center gap-2">
                  <button className={btnGhost + " text-sm"} disabled={hint} onClick={() => setHint(true)}>تلميح</button>
                  <button className={btnGhost + " text-sm"} onClick={() => { setSolved(true); setMsg(`الكلمة: ${word}`); sfx.lose(); }}>اكشفوها</button>
                </div>
              </>
            ) : (
              round + 1 < words.length ? (
                <div className="flex justify-center">
                  <button className={btnPrimary} onClick={() => { sfx.click(); next(); }}>الكلمة اللي بعدها</button>
                </div>
              ) : (
                <div className="flex justify-center">
                  <button className={btnPrimary} onClick={() => { sfx.click(); setOver(true); }}>شوفوا النتيجة</button>
                </div>
              )
            )}
          </div>
        </>
      )}
    </Shell>
  );
}
