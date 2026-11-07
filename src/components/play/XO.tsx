"use client";

import { ScoreBox, btnPrimary, card } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { patchState, nameOf, other, type Side, type Meta } from "@/lib/play";
import { sfx } from "@/lib/sound";

type Props = { code: string; meta: Meta; state: any; me: { uid: string; name: string }; side: Side };
type Sym = "X" | "O";

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const EMPTY = Array(9).fill("");

function check(b: string[]): { w: Sym | "D"; line: number[] } | null {
  for (const l of LINES) {
    const [x, y, z] = l;
    if (b[x] && b[x] === b[y] && b[x] === b[z]) return { w: b[x] as Sym, line: l };
  }
  return b.every(Boolean) ? { w: "D", line: [] } : null;
}

// X = صاحب الغرفة، O = الطرف الثاني
export function XOGame({ code, meta, state, side }: Props) {
  const mySym: Sym = side === "a" ? "X" : "O";
  const board: string[] = state?.board ?? EMPTY;
  const turn: Sym = state?.turn ?? "X";
  const win = state?.win ?? null;
  const line: number[] = state?.line ?? [];
  const sc: { a: number; b: number; d: number } = state?.sc ?? { a: 0, b: 0, d: 0 };
  const waiting = !meta.players.b;

  const play = (i: number) => {
    if (waiting || win || board[i] || turn !== mySym) return;
    const next = [...board];
    next[i] = mySym;
    const r = check(next);
    sfx.pick();
    const patch: Record<string, unknown> = { board: next, turn: mySym === "X" ? "O" : "X" };
    if (r) {
      patch.win = r.w;
      patch.line = r.line;
      patch.sc = {
        ...sc,
        [r.w === "D" ? "d" : r.w === "X" ? "a" : "b"]: sc[r.w === "D" ? "d" : r.w === "X" ? "a" : "b"] + 1,
      };
      if (r.w === mySym) { sfx.win(); celebrate(80); }
      else if (r.w !== "D") sfx.lose();
    }
    patchState(code, patch);
  };

  const rematch = () => patchState(code, { board: EMPTY, turn: "X", win: null, line: null });

  const status = waiting
    ? "بانتظار الطرف الثاني"
    : win
      ? win === "D" ? "تعادل" : `${nameOf(meta, win === "X" ? "a" : "b")} فاز`
      : turn === mySym ? "دورك" : `دور ${nameOf(meta, other(side))}`;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <ScoreBox label={`${nameOf(meta, "a")} (X)`} value={sc.a} active={turn === "X" && !win} />
        <ScoreBox label="تعادل" value={sc.d} />
        <ScoreBox label={`${nameOf(meta, "b")} (O)`} value={sc.b} active={turn === "O" && !win} />
      </div>
      <div className={card}>
        <div className="mb-3 min-h-6 text-center font-black">{status}</div>
        <div className="mx-auto grid max-w-[320px] grid-cols-3 gap-2.5">
          {board.map((v, i) => (
            <button
              key={i}
              disabled={waiting || !!win || !!v || turn !== mySym}
              onClick={() => play(i)}
              className={`grid aspect-square place-items-center rounded-2xl border border-line text-4xl font-black transition ${
                line.includes(i) ? "border-gold bg-gold/25" : "bg-surface-2"
              } ${v === "X" ? "text-pink-500" : v === "O" ? "text-pink-200" : ""}`}
            >
              {v === "X" ? "✕" : v === "O" ? "◯" : ""}
            </button>
          ))}
        </div>
        {win && side === "a" && (
          <div className="mt-4 flex justify-center">
            <button className={btnPrimary} onClick={rematch}>جولة ثانية</button>
          </div>
        )}
      </div>
    </div>
  );
}
