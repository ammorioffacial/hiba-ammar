"use client";

import { useEffect, useRef } from "react";
import { card, btnPrimary } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { useSecret, setSecret, patchState, nameOf, other, type Side, type Meta } from "@/lib/play";
import { sfx } from "@/lib/sound";

type Props = { code: string; meta: Meta; state: any; me: { uid: string; name: string }; side: Side };
type Secret = { cells: string[] };

const N = 7;
const SHIPS = [4, 3, 2];

// توزيع عشوائي للسفن بدون تلامس
function placeShips(): string[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const taken = new Set<string>();
    const cells: string[] = [];
    let ok = true;
    for (const len of SHIPS) {
      let placed = false;
      for (let t = 0; t < 100 && !placed; t++) {
        const horiz = Math.random() < 0.5;
        const x = Math.floor(Math.random() * (horiz ? N - len + 1 : N));
        const y = Math.floor(Math.random() * (horiz ? N : N - len + 1));
        const seg = Array.from({ length: len }, (_, k) => (horiz ? `${x + k}_${y}` : `${x}_${y + k}`));
        const touches = seg.some((c) => {
          const [cx, cy] = c.split("_").map(Number);
          for (let dx = -1; dx <= 1; dx++)
            for (let dy = -1; dy <= 1; dy++)
              if (taken.has(`${cx + dx}_${cy + dy}`)) return true;
          return false;
        });
        if (touches) continue;
        seg.forEach((c) => { taken.add(c); cells.push(c); });
        placed = true;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return cells;
  }
  return [];
}

export function BattleGame({ code, meta, state, me, side }: Props) {
  const isHost = side === "a";
  const phase: string = state?.phase ?? "wait";
  const ready: Record<Side, boolean> = state?.ready ?? { a: false, b: false };
  const turn: Side | null = state?.turn ?? null;
  const pending = state?.pending ?? null;
  const winner: Side | null = state?.winner ?? null;
  const shots: Record<Side, Record<string, "h" | "m">> = state?.shots ?? { a: {}, b: {} };
  const mySecret = useSecret<Secret>(code, me.uid);
  const placing = useRef(false);
  const handled = useRef<string | null>(null);
  const enemy = other(side);

  // ترتيب سفني تلقائياً (وأعيده لو بدأت جولة جديدة)
  useEffect(() => {
    if (phase === "wait") return;
    if (ready[side]) { placing.current = false; return; }
    if (phase !== "place" || placing.current) return;
    placing.current = true;
    const cells = placeShips();
    setSecret(code, me.uid, { cells }).then(() => patchState(code, { [`ready/${side}`]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ready[side], side]);

  // بداية الترتيب لما ينضم الطرف الثاني
  useEffect(() => {
    if (isHost && phase === "wait" && meta.players.b) patchState(code, { phase: "place", ready: { a: false, b: false } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, meta.players.b]);

  // المضيف يبدأ اللعب لما يجهز الاثنين
  useEffect(() => {
    if (isHost && phase === "place" && ready.a && ready.b) patchState(code, { phase: "play", turn: "a" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, ready.a, ready.b]);

  // الدفاع: لما يجيك هدف، تحسب الضربة من سفنك وتعلن النتيجة
  useEffect(() => {
    if (!pending || pending.by === side || phase !== "play" || handled.current === pending.id) return;
    if (!mySecret?.cells) return;
    handled.current = pending.id;
    const key = `${pending.x}_${pending.y}`;
    const hit = mySecret.cells.includes(key);
    const hitsSoFar = Object.values(shots[side] ?? {}).filter((v) => v === "h").length + (hit ? 1 : 0);
    const updates: Record<string, unknown> = { pending: null, [`shots/${side}/${key}`]: hit ? "h" : "m" };
    if (hit) {
      sfx.lose();
      if (hitsSoFar >= mySecret.cells.length) {
        updates.winner = pending.by;
        updates.phase = "over";
      }
    } else {
      sfx.pick();
      updates.turn = side; // الضربة فاتت، الدور يرجع لك
    }
    patchState(code, updates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, phase, mySecret]);

  useEffect(() => {
    if (phase === "over" && winner === side) celebrate(120);
  }, [phase, winner, side]);

  const shoot = (x: number, y: number) => {
    const key = `${x}_${y}`;
    if (phase !== "play" || winner || pending || turn !== side) return;
    if (shots[enemy]?.[key]) return;
    sfx.click();
    patchState(code, { pending: { id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`, x, y, by: side } });
  };

  const rematch = () =>
    patchState(code, { phase: "place", ready: { a: false, b: false }, shots: null, pending: null, winner: null, turn: null });

  const myCells = new Set(mySecret?.cells ?? []);
  const incoming = shots[side] ?? {};
  const outgoing = shots[enemy] ?? {};
  const myTurn = phase === "play" && !winner && turn === side && !pending;
  const bothReady = ready.a && ready.b;

  const grid = (kind: "mine" | "enemy") => (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: N * N }, (_, idx) => {
        const x = idx % N, y = Math.floor(idx / N);
        const key = `${x}_${y}`;
        if (kind === "mine") {
          const shot = incoming[key];
          const ship = myCells.has(key);
          return (
            <div key={key} className={`grid aspect-square place-items-center rounded-md text-xs font-black ${ship ? "bg-gradient-to-br from-pink-400 to-rose-600 text-white" : "bg-surface-2"}`}>
              {shot === "h" ? "✕" : shot === "m" ? <span className="h-1.5 w-1.5 rounded-full bg-muted" /> : null}
            </div>
          );
        }
        const shot = outgoing[key];
        const isPending = pending && pending.x === x && pending.y === y;
        const clickable = myTurn && !shot;
        return (
          <button
            key={key}
            disabled={!clickable}
            onClick={() => shoot(x, y)}
            className={`grid aspect-square place-items-center rounded-md text-xs font-black transition ${
              shot === "h" ? "bg-rose-500 text-white"
                : shot === "m" ? "bg-surface-2"
                : isPending ? "animate-pulse bg-gold/50"
                : clickable ? "bg-surface-2 hover:bg-pink-500/25" : "bg-surface-2 opacity-60"
            }`}
          >
            {shot === "h" ? "✕" : shot === "m" ? <span className="h-1.5 w-1.5 rounded-full bg-muted" /> : null}
          </button>
        );
      })}
    </div>
  );

  if (phase === "wait") return <div className={`${card} py-10 text-center text-muted`}>بانتظار الطرف الثاني…</div>;

  return (
    <div className="space-y-3">
      <div className={`${card} text-center text-sm`}>
        {phase === "place" && (bothReady ? "الاثنين جاهزين" : `جاري ترتيب السفن… ${nameOf(meta, enemy)} ${ready[enemy] ? "جاهز" : "يرتب"}`)}
        {phase === "play" && !winner && (myTurn ? <span className="font-black text-pink-400">دورك: اضرب ويا الخصم</span> : pending ? "ضربة بالطريق…" : `دور ${nameOf(meta, turn ?? "a")}`)}
        {phase === "over" && winner && <span className="font-script text-3xl text-pink-400">{nameOf(meta, winner)} أغرق كل السفن!</span>}
      </div>

      <div className="grid gap-3">
        <div className={card}>
          <div className="mb-2 text-xs font-bold text-muted">لوحتك (سفنك: {SHIPS.join(" + ")})</div>
          {grid("mine")}
        </div>
        <div className={card}>
          <div className="mb-2 text-xs font-bold text-muted">لوحة {nameOf(meta, enemy)} (اضرب هنا)</div>
          {grid("enemy")}
        </div>
      </div>

      {phase === "over" && isHost && (
        <div className="flex justify-center">
          <button className={btnPrimary} onClick={rematch}>جولة ثانية</button>
        </div>
      )}
    </div>
  );
}
