"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { ArtThumb } from "@/components/coloring/ArtThumb";
import { TEMPLATES_BY_ID } from "@/lib/coloring/templates";
import { useStore } from "@/lib/store";

export default function MyArtworks() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const drawings = useStore((s) => s.coloring.drawings);
  const streak = useStore((s) => s.coloring.streak);
  const points = useStore((s) => s.points);

  const items = mounted
    ? Object.entries(drawings)
        .filter(([id, a]) => TEMPLATES_BY_ID[id] && Object.keys(a.colors).length > 0)
        .map(([id, a]) => ({ id, a, t: TEMPLATES_BY_ID[id] }))
        .sort((x, y) => (y.a.completedAt ?? "").localeCompare(x.a.completedAt ?? ""))
    : [];
  const done = items.filter((i) => i.a.completedAt).length;

  return (
    <Shell title="معرضي">
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="تحف مكتملة" value={done} />
        <Stat label="أيام متتالية" value={streak} />
        <Stat label="النقاط" value={points} />
      </div>

      {items.length === 0 ? (
        <p className="py-10 text-center text-muted">ما عندكم رسمات بعد. ابدأوا من كتاب التلوين</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map(({ id, a, t }) => {
            const pct = Math.round((Object.keys(a.colors).length / t.regions.length) * 100);
            return (
              <Link key={id} href={`/coloring/${id}`} className="rounded-3xl border border-line bg-surface p-3 transition hover:border-pink-400">
                <div className="aspect-square overflow-hidden rounded-2xl bg-[#fffaf5] p-2">
                  <ArtThumb template={t} colors={a.colors} className="h-full w-full" />
                </div>
                <div className="mt-2 text-sm font-black">{t.name}</div>
                <div className="text-[11px] text-muted">
                  {a.completedAt
                    ? new Date(a.completedAt).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" })
                    : `قيد التلوين · ${pct}%`}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 text-center">
      <div className="text-xl font-black text-pink-500">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}
