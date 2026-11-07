"use client";

import { useEffect, useMemo, useState } from "react";
import { ScoreBox, btnPrimary, btnGhost, card } from "@/components/ui";
import { useCollection, addTo, patchState, clearSub, normAr, other, nameOf, type Side, type Meta } from "@/lib/play";
import { sfx } from "@/lib/sound";

type Props = { code: string; meta: Meta; state: any; me: { uid: string; name: string }; side: Side };
type Word = { side: Side; text: string; at: number };

const TURN_SECONDS = 20;

// الحرف الأخير من الكلمة السابقة يحدد أول حرف للكلمة الجاية
const lastLetter = (w: string) => {
  const n = normAr(w);
  return n.charAt(n.length - 1);
};
// نتجاهل "ال" التعريف عند بداية الكلمة
const firstLetter = (w: string) => {
  let n = normAr(w);
  if (n.startsWith("ال") && n.length > 3) n = n.slice(2);
  return n.charAt(0);
};

export function WordsGame({ code, meta, state, me, side }: Props) {
  const isHost = side === "a";
  const phase: string = state?.phase ?? "wait";
  const cat: string = state?.cat ?? "";
  const turn: Side = state?.turn ?? "a";
  const out: Side | null = state?.out ?? null;
  const challenge = state?.challenge ?? null;
  const words = useCollection<Word>(code, "words");
  const last = words[words.length - 1];
  const used = useMemo(() => new Set(words.map((w) => normAr(w.text))), [words]);

  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [turnStart, setTurnStart] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // يبدأ العداد من جديد كل ما يتغير الدور أو تنزل كلمة
  useEffect(() => {
    setTurnStart(Date.now());
  }, [turn, words.length]);

  useEffect(() => {
    if (isHost && phase === "wait" && meta.players.b) patchState(code, { phase: "play", turn: "a", out: null, challenge: null });
  }, [isHost, phase, meta.players.b, code]);

  const left = phase === "play" && !out ? Math.max(0, TURN_SECONDS - Math.floor((now - turnStart) / 1000)) : 0;
  const myTurn = turn === side;

  // انتهى الوقت: صاحب الدور يخسر (أي طرف يشوف الوقت يخلصه)
  useEffect(() => {
    if (phase === "play" && !out && left === 0) patchState(code, { out: turn });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase, out, turn]);

  const submit = async () => {
    const t = text.trim();
    if (!t || !myTurn || phase !== "play") return;
    if (used.has(normAr(t))) return setErr("هالكلمة انقالت قبل");
    if (last && firstLetter(t) !== lastLetter(last.text)) return setErr(`لازم تبدأ بحرف "${lastLetter(last.text)}"`);
    setErr("");
    await addTo(code, "words", { side, text: t, at: Date.now() } as Word);
    await patchState(code, { turn: other(side), challenge: null });
    setText("");
    sfx.pick();
  };

  // الطرف الثاني يعترض على الكلمة الأخيرة (ما تنقال أو غلط): كاتبها يخسر
  const dispute = async () => {
    if (!last) return;
    await patchState(code, { out: last.side, challenge: { by: side, word: last.text } });
    sfx.lose();
  };

  const rematch = async () => {
    await clearSub(code, "words");
    await patchState(code, { phase: "play", turn: "a", out: null, challenge: null });
  };

  const winner: Side | null = out ? other(out) : null;
  const canDispute = phase === "play" && !out && myTurn && !!last && last.side !== side;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <ScoreBox label={nameOf(meta, "a")} value={words.filter((w) => w.side === "a").length} active={turn === "a" && !out} />
        <ScoreBox label="الفئة" value={cat} />
        <ScoreBox label={nameOf(meta, "b")} value={words.filter((w) => w.side === "b").length} active={turn === "b" && !out} />
      </div>

      {phase === "wait" && <div className={`${card} py-10 text-center text-muted`}>بانتظار الطرف الثاني…</div>}

      {phase === "play" && (
        <div className={card}>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-bold text-pink-400">{myTurn ? "دورك" : `دور ${nameOf(meta, turn)}`}</span>
            <span className={`font-black ${left <= 5 ? "text-rose-400" : ""}`}>{left} ث</span>
          </div>

          <div className="mb-4 text-center">
            <div className="text-xs text-muted">لازم تبدأون بحرف</div>
            <div className="font-script text-6xl text-pink-400">{last ? lastLetter(last.text) : "؟"}</div>
            {last && <div className="mt-1 text-sm text-muted">آخر كلمة: <span className="font-bold">{last.text}</span></div>}
          </div>

          {!out && myTurn && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => { setText(e.target.value); setErr(""); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder={`كلمة من ${cat}`}
                  className="min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-pink-400 select-text"
                />
                <button className={btnPrimary} onClick={submit}>أرسل</button>
              </div>
              {err && <p className="text-sm text-rose-400">{err}</p>}
            </div>
          )}
          {!out && !myTurn && <p className="text-center text-muted">بانتظار {nameOf(meta, turn)}…</p>}

          {canDispute && (
            <div className="mt-3 text-center">
              <button className={btnGhost + " text-sm"} onClick={dispute}>اعتراض: "{last?.text}" ما هي {cat} صحيحة؟</button>
            </div>
          )}
        </div>
      )}

      {out && (
        <div className={`${card} space-y-3 text-center`}>
          <div className="font-script text-4xl text-pink-400">{winner ? `${nameOf(meta, winner)} فاز` : ""}</div>
          <div className="text-sm text-muted">
            {challenge ? `${nameOf(meta, challenge.by)} اعترض على "${challenge.word}"` : `${nameOf(meta, out)} تأخر أو ما قدر يكمل`}
          </div>
          {isHost && <button className={btnPrimary} onClick={rematch}>جولة ثانية</button>}
        </div>
      )}

      <div className={`${card} max-h-56 space-y-1 overflow-y-auto text-sm`}>
        {words.length === 0 && <div className="text-center text-muted">الكلمات بتنكتب هنا</div>}
        {words.map((w, idx) => (
          <div key={w.id} className="flex justify-between">
            <span className={w.side === side ? "font-bold text-pink-400" : ""}>{w.text}</span>
            <span className="text-xs text-muted">{idx + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
