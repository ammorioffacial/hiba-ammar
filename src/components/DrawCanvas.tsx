"use client";

import { useEffect, useRef } from "react";
import { sleep } from "./ui";

export type Stroke = { c: string; w: number; p: [number, number][] };

const W = 600;
const H = 450;

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.p.length === 0) return;
  ctx.strokeStyle = s.c;
  ctx.lineWidth = s.w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(s.p[0][0], s.p[0][1]);
  for (const [x, y] of s.p.slice(1)) ctx.lineTo(x, y);
  ctx.stroke();
}

function paintAll(ctx: CanvasRenderingContext2D, list: Stroke[]) {
  ctx.fillStyle = "#fffaf5";
  ctx.fillRect(0, 0, W, H);
  list.forEach((s) => drawStroke(ctx, s));
}

// لوحة رسم: اللون وحجم الفرشاة من الأب، والرسم يُحفظ في strokes
export function DrawCanvas({
  strokes,
  onChange,
  color,
  size,
  disabled,
  replay,
  replayKey,
}: {
  strokes: Stroke[];
  onChange?: (next: Stroke[]) => void;
  color: string;
  size: number;
  disabled?: boolean;
  replay?: Stroke[];
  replayKey?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cur = useRef<Stroke | null>(null);

  // إعادة الرسم عند تغيّر الرسم
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) paintAll(ctx, strokes);
  }, [strokes]);

  // إعادة عرض رسمة سابقة خطوة بخطوة
  useEffect(() => {
    if (!replay || !replayKey) return;
    let stop = false;
    (async () => {
      const ctx = ref.current?.getContext("2d");
      if (!ctx) return;
      paintAll(ctx, []);
      for (const s of replay) {
        if (stop) return;
        drawStroke(ctx, s);
        await sleep(220);
      }
    })();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height];
  };

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className="block w-full touch-none rounded-2xl border border-line bg-[#fffaf5] shadow-inner"
      style={{ aspectRatio: `${W} / ${H}`, cursor: disabled ? "default" : "crosshair" }}
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        cur.current = { c: color, w: size, p: [pos(e)] };
      }}
      onPointerMove={(e) => {
        const s = cur.current;
        if (!s) return;
        const prev = s.p[s.p.length - 1];
        const next = pos(e);
        s.p.push(next);
        const ctx = ref.current?.getContext("2d");
        if (!ctx) return;
        ctx.strokeStyle = s.c;
        ctx.lineWidth = s.w;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(prev[0], prev[1]);
        ctx.lineTo(next[0], next[1]);
        ctx.stroke();
      }}
      onPointerUp={() => {
        const s = cur.current;
        cur.current = null;
        if (s && s.p.length > 0 && onChange) onChange([...strokes, s]);
      }}
      onPointerCancel={() => (cur.current = null)}
    />
  );
}

export const PALETTE = ["#ff5fa2", "#e11d74", "#8b5cf6", "#22d3ee", "#34d399", "#fbbf24", "#f97316", "#3b2a33"];
