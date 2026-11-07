"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { useEffect, useMemo, useState } from "react";
import { Shell, TopControls } from "@/components/Shell";
import { card, btnGhost } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { CHALLENGES } from "@/lib/together-data";
import { useShared } from "@/lib/shared";
import { useOnline } from "@/lib/online";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { ClipboardCheck, Utensils, Compass, Heart, MessageCircle, Palette, Footprints, Gift, Camera, BookOpen, Coffee, Flame, Calendar, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { Utensils, Compass, Heart, MessageCircle, Palette, Footprints, Gift, Camera, BookOpen, Coffee };

// أسبوع يبدأ الأحد. نفس التحديات على كل الأجهزة لأن الاختيار حسب رقم الأسبوع
function weekStart(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}
const weekKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

function pickWeek(seed: number) {
  const list = [...CHALLENGES];
  let x = seed;
  for (let i = list.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, 6);
}

type Done = Record<string, { a?: boolean; b?: boolean }>;

function ChallengesPageInner() {
  const names = useStore((s) => s.names);
  const me = useOnline((s) => s.me);
  const setLast = useStore((s) => s.setLast);
  const [tab, setTab] = useState<"week" | "archive">("week");
  const [mounted, setMounted] = useState(false);
  const { value: all, save, loaded } = useShared<Record<string, Done>>("challenges", {});

  useEffect(() => {
    setMounted(true);
    setLast("/together/challenges");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useMemo(() => weekStart(), []);
  const seed = Math.floor(start.getTime() / 604_800_000);
  const week = useMemo(() => pickWeek(seed), [seed]);
  const key = weekKey(start);
  const mySide: "a" | "b" = me?.name === names.b ? "b" : "a";
  const done = all[key] ?? {};

  if (!mounted || !loaded) return <Shell title="تحديات الأسبوع" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;

  // كل واحد يأكد إنه سوّاه، والتحدي يكتمل لما يأكد الاثنين
  const confirm = (id: string) => {
    const prev = done[id] ?? {};
    const next = { ...prev, [mySide]: !prev[mySide] };
    save((p) => ({ ...p, [key]: { ...(p[key] ?? {}), [id]: next } }));
    if (next.a && next.b && !(prev.a && prev.b)) {
      sfx.win();
      celebrate(100);
    } else sfx.pick();
  };

  const completedCount = week.filter((c) => done[c.id]?.a && done[c.id]?.b).length;
  const pts = week.filter((c) => done[c.id]?.a && done[c.id]?.b).reduce((s, c) => s + c.pts, 0);
  const perfect = completedCount === week.length;

  const weeks = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start.getTime() - (i + 1) * 604_800_000);
    const k = weekKey(d);
    const ws = pickWeek(Math.floor(d.getTime() / 604_800_000));
    const count = ws.filter((c) => all[k]?.[c.id]?.a && all[k]?.[c.id]?.b).length;
    return { k, d, ws, count };
  });


  return (
    <Shell title="تحديات الأسبوع" action={<TopControls />}>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5">
        {(["week", "archive"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2.5 text-sm font-bold ${tab === t ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "text-muted"}`}>
            {t === "week" ? "هالأسبوع" : "الأرشيف"}
          </button>
        ))}
      </div>

      {tab === "week" && (
        <>
          <div className={`${card} mb-4`}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-bold"><Calendar className="h-4 w-4" /> {start.toLocaleDateString("ar", { day: "numeric", month: "short" })}</span>
              <span className="font-black text-pink-400">{completedCount}/{week.length}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-black/25">
              <div className="h-full rounded-full bg-gradient-to-l from-pink-500 to-rose-600 transition-all" style={{ width: `${(completedCount / week.length) * 100}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>النقاط: <b className="text-pink-400">{pts}</b></span>
              {perfect ? <span className="flex items-center gap-1 font-bold text-gold"><Flame className="h-3.5 w-3.5" /> أسبوع مثالي</span> : <span>أكملوا الكل لنقاط إضافية</span>}
            </div>
          </div>

          <div className="space-y-3">
            {week.map((c) => {
              const Icon = ICONS[c.icon] ?? ClipboardCheck;
              const st = done[c.id] ?? {};
              const full = st.a && st.b;
              const mine = !!st[mySide];
              return (
                <div key={c.id} className={`${card} p-4 ${full ? "border-pink-400/60" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500/30 to-rose-600/30">
                      <Icon className="h-5 w-5 text-pink-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-black">{c.title}</div>
                        <span className="text-xs font-bold text-pink-400">{c.pts} نقطة</span>
                      </div>
                      <div className="mt-1 text-sm text-muted">{c.desc}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 font-bold ${st.a ? "bg-emerald-500/20 text-emerald-400" : "bg-surface-2 text-muted"}`}>{names.a} {st.a ? "✓" : ""}</span>
                        <span className={`rounded-full px-2.5 py-1 font-bold ${st.b ? "bg-emerald-500/20 text-emerald-400" : "bg-surface-2 text-muted"}`}>{names.b} {st.b ? "✓" : ""}</span>
                        <button onClick={() => confirm(c.id)} className={`mr-auto ${mine ? btnGhost : "rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-4 py-2 font-bold text-white"} text-sm`}>
                          {mine ? "ألغِ تأكيدي" : "سويناه"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "archive" && (
        <div className="space-y-3">
          {weeks.map((w) => (
            <div key={w.k} className={card}>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-bold">أسبوع {w.d.toLocaleDateString("ar", { day: "numeric", month: "short" })}</span>
                <span className="font-black text-pink-400">{Math.round((w.count / w.ws.length) * 100)}%</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs text-muted">
                {w.ws.map((c) => (
                  <span key={c.id} className={`rounded-full px-2 py-1 ${all[w.k]?.[c.id]?.a && all[w.k]?.[c.id]?.b ? "bg-emerald-500/20 text-emerald-400" : "bg-surface-2"}`}>{c.title}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

export default function ChallengesPage() {
  return (
    <ClientOnly>
      <ChallengesPageInner />
    </ClientOnly>
  );
}
