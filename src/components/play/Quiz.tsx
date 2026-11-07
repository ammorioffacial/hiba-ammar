"use client";

import { useEffect, useRef, useState } from "react";
import { serverTimestamp } from "firebase/database";
import { ScoreBox, btnPrimary, card, shuffle } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { QUIZ_QUESTIONS } from "@/lib/game-data";
import { patchState, setStateAll, nameOf, other, type Side, type Meta } from "@/lib/play";
import { sfx } from "@/lib/sound";

type Props = { code: string; meta: Meta; state: any; me: { uid: string; name: string }; side: Side };
type Ans = { c: number; t: number };

const QUESTION_SECONDS = 15;
const REVEAL_MS = 2600;

const pickQuestions = () => shuffle(QUIZ_QUESTIONS).slice(0, 8).map((x) => ({ q: x.q, o: x.o, a: x.a, cat: x.cat }));

export function QuizGame({ code, meta, state, me, side }: Props) {
  const isHost = side === "a";
  const phase: string = state?.phase ?? "wait";
  const i: number = state?.i ?? 0;
  const qs: { q: string; o: string[]; a: number }[] = state?.qs ?? [];
  const ans: Partial<Record<Side, Ans>> = state?.ans ?? {};
  const sc: Record<Side, number> = state?.sc ?? { a: 0, b: 0 };
  const reveal: { c: number; win: Side | null } | null = state?.reveal ?? null;
  const q = qs[i];

  // وقت محلي يبدأ من أول ما يظهر السؤال
  const [now, setNow] = useState(() => Date.now());
  const [startedLocal, setStartedLocal] = useState(0);
  useEffect(() => {
    setStartedLocal(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [i, phase]);
  const left = Math.max(0, QUESTION_SECONDS - Math.floor((now - startedLocal) / 1000));

  // بداية الاختبار
  useEffect(() => {
    if (isHost && phase === "wait" && meta.players.b) {
      patchState(code, { phase: "q", i: 0, qs: pickQuestions(), ans: null, sc: { a: 0, b: 0 }, reveal: null, startAt: Date.now() });
    }
  }, [isHost, phase, meta.players.b, code]);

  // المضيف يحسم كل سؤال: لما يجاوب الاثنين أو يخلص الوقت
  const resolved = useRef<number>(-1);
  useEffect(() => {
    if (!isHost || phase !== "q" || !q) return;
    if (reveal) {
      const t = setTimeout(async () => {
        if (i + 1 >= qs.length) await patchState(code, { phase: "over" });
        else await patchState(code, { i: i + 1, ans: null, reveal: null, startAt: Date.now() });
      }, REVEAL_MS);
      return () => clearTimeout(t);
    }
    const resolve = () => {
      if (resolved.current === i) return;
      resolved.current = i;
      const correct = (["a", "b"] as Side[]).filter((s) => ans[s] && ans[s]!.c === q.a);
      correct.sort((x, y) => (ans[x]!.t ?? 0) - (ans[y]!.t ?? 0));
      const win = correct[0] ?? null;
      if (win) sfx.win();
      patchState(code, { reveal: { c: q.a, win }, sc: win ? { ...sc, [win]: sc[win] + 1 } : sc });
    };
    const answeredBoth = ans.a && ans.b && typeof ans.a.t === "number" && typeof ans.b.t === "number";
    if (answeredBoth) {
      resolve();
      return;
    }
    const wait = Math.max(0, QUESTION_SECONDS * 1000 - (Date.now() - (state?.startAt ?? Date.now())));
    const t = setTimeout(resolve, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isHost, phase]);

  const answer = (c: number) => {
    if (phase !== "q" || reveal || ans[side]) return;
    sfx.pick();
    patchState(code, { [`ans/${side}`]: { c, t: serverTimestamp() } });
  };

  const rematch = async () => {
    await setStateAll(code, { phase: "q", i: 0, qs: pickQuestions(), ans: null, sc: { a: 0, b: 0 }, reveal: null, startAt: Date.now() });
    resolved.current = -1;
  };

  const mine = ans[side];
  const oppAnswered = !!ans[other(side)];
  const winnerName = reveal?.win ? nameOf(meta, reveal.win) : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <ScoreBox label={nameOf(meta, "a")} value={sc.a} active={!!reveal?.win && reveal.win === "a"} />
        <ScoreBox label={phase === "q" ? `سؤال ${i + 1}/${qs.length}` : "النتيجة"} value={phase === "q" ? left : "—"} active={left <= 5 && phase === "q"} />
        <ScoreBox label={nameOf(meta, "b")} value={sc.b} active={!!reveal?.win && reveal.win === "b"} />
      </div>

      {phase === "wait" && <div className={`${card} py-10 text-center text-muted`}>بانتظار الطرف الثاني…</div>}

      {phase === "q" && q && (
        <div className={card}>
          <div className="mb-5 text-center text-lg font-black leading-relaxed">{q.q}</div>
          <div className="grid gap-2">
            {q.o.map((o, idx) => {
              const right = reveal && idx === q.a;
              const wrong = reveal && mine?.c === idx && idx !== q.a;
              const chosen = !reveal && mine?.c === idx;
              return (
                <button
                  key={o}
                  disabled={!!mine || !!reveal}
                  onClick={() => answer(idx)}
                  className={`rounded-2xl border px-4 py-3 text-right font-bold transition ${
                    right ? "border-emerald-400 bg-emerald-500/20"
                      : wrong ? "border-rose-400 bg-rose-500/20"
                      : chosen ? "border-pink-400 bg-pink-500/15"
                      : "border-line bg-surface-2 hover:border-pink-400"
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-center text-sm">
            {reveal ? (
              <span className="font-black text-pink-400">{winnerName ? `${winnerName} كان أسرع وجاوب صح` : "ما أحد جاوب صح بالوقت"}</span>
            ) : mine ? (
              <span className="text-muted">جاوبت، {oppAnswered ? "الثاني جاوب أيضاً" : "بانتظار الطرف الثاني…"}</span>
            ) : (
              <span className="text-muted">اختاروا بسرعة، الأسرع الصحيح يكسب النقطة</span>
            )}
          </div>
        </div>
      )}

      {phase === "over" && (
        <div className={`${card} space-y-3 text-center`}>
          <div className="font-script text-4xl text-pink-400">
            {sc.a === sc.b ? "تعادل!" : `${nameOf(meta, sc.a > sc.b ? "a" : "b")} فاز`}
          </div>
          <div className="text-muted">{sc.a} - {sc.b}</div>
          {isHost && <button className={btnPrimary} onClick={rematch}>جولة ثانية</button>}
          {!isHost && <div className="text-xs text-muted">المضيف يقدر يبدأ جولة ثانية</div>}
        </div>
      )}
    </div>
  );
}
