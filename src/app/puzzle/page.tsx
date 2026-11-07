"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Shell, TopControls } from "@/components/Shell";
import { ScoreBox, ModeTabs, btnPrimary, btnGhost, card, shuffle } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { ImagePlus } from "lucide-react";

const SIZE = 320;

// صورة افتراضية تتولد بالكانفس لو ما رفعتوا صورة
function defaultImage(): string {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 600;
  const x = c.getContext("2d");
  if (!x) return "";
  const g = x.createLinearGradient(0, 0, 600, 600);
  g.addColorStop(0, "#ff7fb6");
  g.addColorStop(0.5, "#ff3d8b");
  g.addColorStop(1, "#7e22ce");
  x.fillStyle = g;
  x.fillRect(0, 0, 600, 600);
  x.fillStyle = "rgba(255,255,255,.85)";
  x.font = "bold 220px sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText("♥", 300, 300);
  return c.toDataURL("image/png");
}

export default function PuzzlePage() {
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);
  const fileRef = useRef<HTMLInputElement>(null);

  const [grid, setGrid] = useState<3 | 4 | 5>(3);
  const [src, setSrc] = useState<string>("");
  const [order, setOrder] = useState<number[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    recordPlay();
    setLast("/puzzle");
    setSrc(defaultImage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const n = grid * grid;

  const newGame = (g = grid, image = src) => {
    const base = Array.from({ length: g * g }, (_, i) => i);
    let o = shuffle(base);
    while (o.every((v, i) => v === i)) o = shuffle(base);
    setGrid(g as 3 | 4 | 5);
    setSrc(image);
    setOrder(o);
    setSel(null);
    setMoves(0);
    setSeconds(0);
    setSolved(false);
    setPlaying(true);
    sfx.click();
  };

  // المؤقت
  useEffect(() => {
    if (!playing || solved) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [playing, solved]);

  // التبديل بالنقر: اختاروا قطعتين وتتبدل مكانهم
  const tap = (i: number) => {
    if (!playing || solved) return;
    if (sel === null) {
      setSel(i);
      sfx.click();
      return;
    }
    if (sel === i) {
      setSel(null);
      return;
    }
    const next = [...order];
    [next[sel], next[i]] = [next[i], next[sel]];
    setOrder(next);
    setSel(null);
    setMoves((m) => m + 1);
    if (next.every((v, k) => v === k)) {
      setSolved(true);
      setPlaying(false);
      sfx.win();
      celebrate(150);
    }
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    newGame(grid, url);
  };

  // نسب مئوية حتى تتكيف مع عرض الجوال
  const pos = useMemo(() => (v: number) => {
    const r = Math.floor(v / grid);
    const c = v % grid;
    return {
      backgroundImage: `url(${src})`,
      backgroundSize: `${grid * 100}% ${grid * 100}%`,
      backgroundPosition: `${(c * 100) / (grid - 1)}% ${(r * 100) / (grid - 1)}%`,
    };
  }, [src, grid]);

  return (
    <Shell title="أحجية الصور" action={<TopControls />}>
      <div className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <ModeTabs
            value={String(grid) as "3" | "4" | "5"}
            options={[
              { v: "3", label: "3×3" },
              { v: "4", label: "4×4" },
              { v: "5", label: "5×5" },
            ]}
            onChange={(v) => newGame(Number(v) as 3 | 4 | 5)}
          />
        </div>

        <div className="mb-3 flex gap-2">
          <ScoreBox label="الحركات" value={moves} />
          <ScoreBox label="الوقت (ث)" value={seconds} />
        </div>

        {!playing && !solved ? (
          <div className="py-10 text-center">
            <p className="mb-5 text-muted">ابدأوا اللعبة، أو ارفعوا صورة لكم</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button className={btnPrimary} onClick={() => newGame()}>ابدأوا</button>
              <button className={btnGhost + " flex items-center gap-2"} onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-4 w-4" /> صورتنا
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid gap-1 rounded-2xl bg-black/30 p-1" style={{ width: SIZE, maxWidth: "100%", gridTemplateColumns: `repeat(${grid}, 1fr)` }}>
            {order.map((v, i) => (
              <button
                key={i}
                onClick={() => tap(i)}
                aria-label={`قطعة ${i + 1}`}
                className={`aspect-square rounded-md transition ${sel === i ? "scale-95 ring-4 ring-gold" : ""} ${v === i && !solved ? "opacity-90" : ""}`}
                style={pos(v)}
              />
            ))}
          </div>
        )}

        {solved && (
          <div className="mt-4 text-center">
            <div className="font-script text-3xl text-pink-400">كملتوها!</div>
            <p className="text-muted">{moves} حركة في {seconds} ثانية</p>
            <button className={`${btnPrimary} mt-3`} onClick={() => newGame()}>صورة جديدة</button>
          </div>
        )}

        {playing && (
          <p className="mt-4 text-center text-xs text-muted">اضغطوا قطعة ثم قطعة ثانية لتبديلهم</p>
        )}

        {playing && (
          <div className="mt-3 flex justify-center">
            <button className={btnGhost + " text-sm"} onClick={() => newGame()}>خلط من جديد</button>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
    </Shell>
  );
}
