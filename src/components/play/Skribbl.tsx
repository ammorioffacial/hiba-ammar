"use client";

import { useEffect, useMemo, useState } from "react";
import { DrawCanvas, PALETTE, type Stroke } from "@/components/DrawCanvas";
import { ScoreBox, btnPrimary, btnGhost, card, shuffle } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { DRAW_WORDS } from "@/lib/game-data";
import { useCollection, useSecret, setSecret, patchState, addTo, clearSub, normAr, other, nameOf, type Side, type Meta } from "@/lib/play";
import { sfx } from "@/lib/sound";

type Props = { code: string; meta: Meta; state: any; me: { uid: string; name: string }; side: Side };
type Msg = { side: Side; from: string; text: string; at: number };

const TURN_SECONDS = 60;
const ALL_WORDS = ([] as string[]).concat(...Object.values(DRAW_WORDS));

export function SkribblGame({ code, meta, state, me, side }: Props) {
  const isHost = side === "a";
  const phase: string = state?.phase ?? "wait";
  const drawer: Side = state?.drawer ?? "a";
  const isDrawer = side === drawer;
  const round: number = state?.round ?? 0;
  const rounds: number = state?.rounds ?? 4;
  const scores: Record<Side, number> = state?.scores ?? { a: 0, b: 0 };
  const myWord = useSecret<{ word: string }>(code, me.uid)?.word ?? null;

  const strokeItems = useCollection<Stroke>(code, "strokes");
  const strokes = useMemo(() => strokeItems.map(({ c, w, p }) => ({ c, w, p })), [strokeItems]);
  const chat = useCollection<Msg>(code, "chat");

  const [options, setOptions] = useState<string[]>([]);
  const [color, setColor] = useState(PALETTE[0]);
  const [size, setSize] = useState(6);
  const [now, setNow] = useState(() => Date.now());
  const [text, setText] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // بداية اللعبة لما ينضم الطرف الثاني
  useEffect(() => {
    if (isHost && phase === "wait" && meta.players.b) patchState(code, { phase: "pick", round: 1 });
  }, [isHost, phase, meta.players.b, code]);

  // الرسام يختار من 3 كلمات
  useEffect(() => {
    if (phase === "pick" && isDrawer) setOptions(shuffle(ALL_WORDS).slice(0, 3));
  }, [phase, isDrawer, round]);

  const left = phase === "draw" ? Math.max(0, TURN_SECONDS - Math.floor((now - (state?.t0 ?? now)) / 1000)) : 0;

  const finish = (winner: Side | null, guessBy: string | null) =>
    patchState(code, { phase: "reveal", winner, guessBy, revealWord: myWord ?? "" });

  // انتهى الوقت
  useEffect(() => {
    if (phase === "draw" && isDrawer && left === 0) finish(null, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, phase, isDrawer]);

  // الرسام يتأكد من التخمين الصحيح
  useEffect(() => {
    if (!isDrawer || phase !== "draw" || !myWord) return;
    const hit = chat.find((c) => c.side !== drawer && normAr(c.text) === normAr(myWord));
    if (hit) {
      sfx.win();
      finish(hit.side, hit.from);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat, phase, isDrawer, myWord]);

  // بعد الكشف: الرسام يكمل للجولة الجاية
  useEffect(() => {
    if (!isDrawer || phase !== "reveal") return;
    const t = setTimeout(async () => {
      const w = state?.winner as Side | null;
      const next = w ? { ...scores, [w]: scores[w] + 1 } : scores;
      if (w === side) celebrate(60);
      if (round >= rounds) {
        await patchState(code, { phase: "over", scores: next });
      } else {
        await clearSub(code, "strokes");
        await clearSub(code, "chat");
        await patchState(code, { phase: "pick", round: round + 1, drawer: other(drawer), scores: next, winner: null, guessBy: null, revealWord: null });
      }
    }, 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isDrawer, round]);

  const choose = async (w: string) => {
    await clearSub(code, "strokes");
    await clearSub(code, "chat");
    await setSecret(code, me.uid, { word: w });
    await patchState(code, { phase: "draw", t0: Date.now() });
    sfx.click();
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    addTo(code, "chat", { side, from: me.name, text: t, at: Date.now() } as Msg);
    setText("");
  };

  const rematch = async () => {
    await clearSub(code, "strokes");
    await clearSub(code, "chat");
    await patchState(code, { phase: "pick", round: 1, drawer: "a", scores: { a: 0, b: 0 }, winner: null, guessBy: null, revealWord: null });
  };

  const drawing = isDrawer && phase === "draw";
  const drawerName = nameOf(meta, drawer);
  const winnerName = state?.winner ? nameOf(meta, state.winner as Side) : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <ScoreBox label={nameOf(meta, "a")} value={scores.a} active={drawer === "a"} />
        <ScoreBox label="الجولة" value={`${Math.min(round, rounds)}/${rounds}`} />
        <ScoreBox label={nameOf(meta, "b")} value={scores.b} active={drawer === "b"} />
      </div>

      <div className={`${card} space-y-3`}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-pink-400">يرسم: {drawerName}</span>
          {phase === "draw" && <span className="font-black">{left} ث</span>}
        </div>

        {phase === "wait" && <div className="py-10 text-center text-muted">بانتظار الطرف الثاني…</div>}

        {phase === "pick" && isDrawer && (
          <div className="space-y-3 py-4 text-center">
            <div className="font-black">اختاروا كلمة ترسمونها</div>
            <div className="grid gap-2">
              {options.map((w) => (
                <button key={w} onClick={() => choose(w)} className="rounded-2xl border border-line bg-surface-2 py-3 font-black hover:border-pink-400">{w}</button>
              ))}
            </div>
          </div>
        )}
        {phase === "pick" && !isDrawer && <div className="py-10 text-center text-muted">{drawerName} يختار كلمة…</div>}

        {(phase === "draw" || phase === "reveal" || phase === "pick") && (
          <DrawCanvas
            strokes={strokes}
            onChange={(next) => {
              const s = next[next.length - 1];
              if (s) addTo(code, "strokes", s);
            }}
            color={color}
            size={size}
            disabled={!drawing}
          />
        )}

        {drawing && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1.5">
                {PALETTE.map((c) => (
                  <button key={c} aria-label={c} onClick={() => setColor(c)} style={{ background: c }} className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-white ring-2 ring-pink-500" : "border-transparent"}`} />
                ))}
              </div>
              <div className="flex gap-1.5">
                {[3, 6, 12].map((s) => (
                  <button key={s} onClick={() => setSize(s)} className={`grid h-9 w-9 place-items-center rounded-xl border ${size === s ? "border-pink-400 bg-pink-500/20" : "border-line bg-surface-2"}`}>
                    <span className="rounded-full bg-current" style={{ width: s, height: s }} />
                  </button>
                ))}
                <button className={btnGhost + " px-3 py-1.5 text-sm"} onClick={() => clearSub(code, "strokes")}>امسح</button>
              </div>
            </div>
            <div className="text-center text-sm">كلمتك: <span className="font-black text-pink-400">{myWord}</span></div>
            <div className="flex justify-center">
              <button className={btnPrimary} onClick={() => finish(null, null)}>خلصت الرسم</button>
            </div>
          </>
        )}

        {phase === "draw" && !isDrawer && (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="خمّنوا الكلمة"
              className="min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-pink-400 select-text"
            />
            <button className={btnPrimary} onClick={send}>أرسل</button>
          </div>
        )}

        {phase === "reveal" && (
          <div className="text-center">
            <div className="text-sm text-muted">الكلمة كانت</div>
            <div className="font-script text-3xl text-pink-400">{state?.revealWord}</div>
            <div className="mt-2 font-black">{winnerName ? `${winnerName} خمّنها!` : "ما أحد خمّنها"}</div>
          </div>
        )}

        {phase === "over" && (
          <div className="space-y-3 text-center">
            <div className="font-script text-4xl text-pink-400">
              {scores.a === scores.b ? "تعادل!" : `${nameOf(meta, scores.a > scores.b ? "a" : "b")} فاز`}
            </div>
            <div className="text-muted">{scores.a} - {scores.b}</div>
            <button className={btnPrimary} onClick={rematch}>جولة جديدة</button>
          </div>
        )}
      </div>

      {(phase === "draw" || phase === "reveal") && (
        <div className={`${card} max-h-48 space-y-1 overflow-y-auto text-sm`}>
          {chat.length === 0 && <div className="text-center text-muted">التخمينات بتظهر هنا</div>}
          {chat.map((c) => (
            <div key={c.id}>
              <span className="font-bold text-pink-400">{c.from}:</span> {c.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
