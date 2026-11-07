"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { ArtThumb } from "@/components/coloring/ArtThumb";
import { CATEGORIES, DIFF_LABEL, TEMPLATES, difficultyOf, type Category, type Difficulty } from "@/lib/coloring/templates";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";

const chip = (active: boolean) =>
  `shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
    active ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "bg-surface-2 text-muted"
  }`;

export default function ColoringGallery() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const drawings = useStore((s) => s.coloring.drawings);
  const [cat, setCat] = useState<Category | "all">("all");
  const [diff, setDiff] = useState<Difficulty | "all">("all");

  const list = TEMPLATES.filter(
    (t) =>
      (cat === "all" || t.category === cat) &&
      (diff === "all" || difficultyOf(t.regions.length) === diff)
  );
  const doneCount = mounted ? Object.values(drawings).filter((d) => d.completedAt).length : 0;

  return (
    <Shell
      title="كتاب التلوين"
      action={
        <Link href="/coloring/mine" className="rounded-2xl border border-line bg-surface-2 px-3 py-2 text-sm font-bold">
          معرضي ({doneCount})
        </Link>
      }
    >
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button className={chip(cat === "all")} onClick={() => { sfx.click(); setCat("all"); }}>الكل</button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className={chip(cat === c.id)} onClick={() => { sfx.click(); setCat(c.id); }}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(["all", "simple", "medium", "complex"] as const).map((d) => (
          <button key={d} className={chip(diff === d)} onClick={() => { sfx.click(); setDiff(d); }}>
            {d === "all" ? "كل المستويات" : DIFF_LABEL[d]}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-center text-muted">ما فيه رسمات بهالفلتر</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {list.map((t) => {
            const saved = mounted ? drawings[t.id] : undefined;
            const colored = Object.keys(saved?.colors ?? {}).length;
            const pct = Math.round((colored / t.regions.length) * 100);
            return (
              <Link
                key={t.id}
                href={`/coloring/${t.id}`}
                onClick={() => sfx.click()}
                className="rounded-3xl border border-line bg-surface p-3 transition hover:border-pink-400"
              >
                <div className="aspect-square overflow-hidden rounded-2xl bg-[#fffaf5] p-2">
                  <ArtThumb template={t} colors={saved?.colors ?? {}} className="h-full w-full" />
                </div>
                <div className="mt-2 text-sm font-black">{t.name}</div>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>{DIFF_LABEL[difficultyOf(t.regions.length)]} · {t.regions.length} منطقة</span>
                  {saved?.completedAt && <span className="font-bold text-pink-500">مكتملة</span>}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/20">
                  <div className="h-full rounded-full bg-gradient-to-l from-pink-500 to-rose-600" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
