"use client";

import { useEffect, useState } from "react";
import { Shell, TopControls } from "./Shell";
import { Handoff } from "./Handoff";
import { DrawCanvas, PALETTE, type Stroke } from "./DrawCanvas";
import { ScoreBox, ModeTabs, btnPrimary, btnGhost, card, shuffle } from "./ui";
import { DRAW_WORDS, PICTO_WORDS } from "@/lib/game-data";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { celebrate } from "./Providers";

type Phase = "setup" | "handoff" | "show" | "draw" | "judge" | "over";
type Variant = "draw" | "picto";

const ROUNDS = 4;
const NO_STROKES: Stroke[] = []; // ثابت حتى لا يمسح عرض الإعادة

// لعبة رسم وتخمين مشتركة: "draw" بفئات الكلمات، و"picto" بمستويات الصعوبة ومدة قابلة للاختيار
export function DrawGame({ variant }: { variant: Variant }) {
  const names = useStore((s) => s.names);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [cat, setCat] = useState<string>(variant === "draw" ? "food" : "easy");
  const [seconds, setSeconds] = useState(variant === "draw" ? 60 : 60);
  const [phase, setPhase] = useState<Phase>("setup");
  const [round, setRound] = useState(0);
  const [artist, setArtist] = useState<0 | 1>(0);
  const [word, setWord] = useState("");
  const [left, setLeft] = useState(60);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState(PALETTE[0]);
  const [size, setSize] = useState(6);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [history, setHistory] = useState<{ word: string; strokes: Stroke[] }[]>([]);
  const [replayIdx, setReplayIdx] = useState<number | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    recordPlay();
    setLast(variant === "draw" ? "/draw" : "/pictionary");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // العداد التنازلي للرسم
  useEffect(() => {
    if (phase !== "draw") return;
    if (left <= 0) {
      setPhase("judge");
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left]);

  const pool: readonly string[] =
    variant === "draw"
      ? DRAW_WORDS[cat as keyof typeof DRAW_WORDS]
      : PICTO_WORDS[cat as keyof typeof PICTO_WORDS];

  const catOptions =
    variant === "draw"
      ? [
          { v: "food", label: "أكل" },
          { v: "animals", label: "حيوانات" },
          { v: "places", label: "أماكن" },
          { v: "actions", label: "أفعال" },
        ]
      : [
          { v: "easy", label: "سهل" },
          { v: "medium", label: "متوسط" },
          { v: "hard", label: "صعب" },
        ];

  const startRound = (r: number) => {
    setWord(shuffle(pool)[0]);
    setStrokes([]);
    setLeft(seconds);
    setArtist(r % 2 === 0 ? 0 : 1);
    setPhase("handoff");
  };

  const start = () => {
    sfx.click();
    setScore([0, 0]);
    setHistory([]);
    setRound(0);
    startRound(0);
  };

  const judge = (guessed: boolean) => {
    const guesser = artist === 0 ? 1 : 0;
    if (guessed) {
      setScore((s) => (guesser === 0 ? [s[0] + 1, s[1]] : [s[0], s[1] + 1]));
      sfx.win();
      celebrate(80);
    } else sfx.lose();
    setHistory((h) => [...h, { word, strokes }]);
    if (round + 1 >= ROUNDS) {
      setPhase("over");
      return;
    }
    setRound((r) => r + 1);
    startRound(round + 1);
  };

  const artistName = artist === 0 ? names.a : names.b;
  const guesserName = artist === 0 ? names.b : names.a;
  const title = variant === "draw" ? "ارسم وخمّن" : "التخمين بالرسم";

  return (
    <Shell title={title} action={<TopControls />}>
      {phase === "handoff" && (
        <Handoff
          name={artistName}
          text={`أنت الرسام هالجولة. الكلمة بتظهر لك وحدك، لا تخلّي ${guesserName} يشوفها!`}
          onReady={() => setPhase("show")}
        />
      )}

      {phase === "setup" && (
        <div className={card}>
          <div className="mb-3 text-center font-black">اختاروا {variant === "draw" ? "الفئة" : "الصعوبة"}</div>
          <ModeTabs value={cat} options={catOptions} onChange={setCat} />
          {variant === "picto" && (
            <div className="mb-4">
              <div className="mb-2 text-center text-sm text-muted">مدة الرسم</div>
              <ModeTabs
                value={String(seconds)}
                options={[
                  { v: "30", label: "30 ث" },
                  { v: "60", label: "60 ث" },
                  { v: "90", label: "90 ث" },
                ]}
                onChange={(v) => setSeconds(Number(v))}
              />
            </div>
          )}
          <p className="mb-4 text-center text-sm text-muted">{ROUNDS} جولات، كل واحد يرسم بالدور</p>
          <div className="flex justify-center">
            <button className={btnPrimary} onClick={start}>ابدأوا</button>
          </div>
        </div>
      )}

      {phase !== "setup" && (
        <>
          <div className="mb-3 flex gap-2">
            <ScoreBox label={names.a} value={score[0]} active={artist === 1} />
            <ScoreBox label="الجولة" value={`${Math.min(round + 1, ROUNDS)}/${ROUNDS}`} />
            <ScoreBox label={names.b} value={score[1]} active={artist === 0} />
          </div>

          {phase === "show" && (
            <div className={`${card} text-center`}>
              <div className="mb-2 text-sm text-muted">{artistName} ترسم هالكلمة</div>
              <div className="my-6 font-script text-5xl text-pink-400">{word}</div>
              <button className={btnPrimary} onClick={() => { setPhase("draw"); }}>ابدأ الرسم</button>
            </div>
          )}

          {(phase === "draw" || phase === "judge") && (
            <div className={card}>
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-bold text-pink-400">يرسم: {artistName}</span>
                <span className="font-black">{left} ث</span>
              </div>

              <DrawCanvas
                strokes={strokes}
                onChange={setStrokes}
                color={color}
                size={size}
                disabled={phase !== "draw"}
              />

              {phase === "draw" && (
                <>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      {PALETTE.map((c) => (
                        <button
                          key={c}
                          aria-label={c}
                          onClick={() => setColor(c)}
                          style={{ background: c }}
                          className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-white ring-2 ring-pink-500" : "border-transparent"}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {[3, 6, 12].map((s) => (
                        <button key={s} onClick={() => setSize(s)} className={`grid h-9 w-9 place-items-center rounded-xl border ${size === s ? "border-pink-400 bg-pink-500/20" : "border-line bg-surface-2"}`}>
                          <span className="rounded-full bg-current" style={{ width: s, height: s }} />
                        </button>
                      ))}
                      <button className={btnGhost + " px-3 py-1.5 text-sm"} onClick={() => setStrokes((s) => s.slice(0, -1))}>تراجع</button>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <button className={btnPrimary} onClick={() => { setPhase("judge"); }}>انتهينا من الرسم</button>
                  </div>
                </>
              )}

              {phase === "judge" && (
                <div className="mt-4 text-center">
                  <div className="mb-3 font-black">هل {guesserName} خمّن الكلمة؟</div>
                  <div className="mb-2 text-sm text-muted">الكلمة كانت: <span className="font-black text-pink-400">{word}</span></div>
                  <div className="flex justify-center gap-3">
                    <button className={btnPrimary} onClick={() => judge(true)}>خمّنوها!</button>
                    <button className={btnGhost} onClick={() => judge(false)}>ما خمّنوا</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {phase === "over" && (
        <div className={`${card} mt-3 text-center`}>
          <div className="font-script text-4xl text-pink-400">
            {score[0] === score[1] ? "تعادل!" : score[0] > score[1] ? `${names.a} فاز` : `${names.b} فاز`}
          </div>
          <p className="mt-2 text-muted">{score[0]} - {score[1]}</p>
          <button className={`${btnPrimary} mt-5`} onClick={() => setPhase("setup")}>جولة جديدة</button>
        </div>
      )}

      {history.length > 0 && variant === "picto" && (
        <div className={`${card} mt-4`}>
          <div className="mb-3 font-black">سجل الرسمات</div>
          <div className="flex flex-wrap gap-2">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setReplayIdx(i); setReplayKey((k) => k + 1); }}
                className={`rounded-xl border px-3 py-2 text-sm font-bold ${replayIdx === i ? "border-pink-400 bg-pink-500/15" : "border-line bg-surface-2"}`}
              >
                {h.word}
              </button>
            ))}
          </div>
          {replayIdx !== null && (
            <div className="mt-4">
              <DrawCanvas strokes={NO_STROKES} disabled replay={history[replayIdx].strokes} replayKey={replayKey} color={color} size={size} />
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
