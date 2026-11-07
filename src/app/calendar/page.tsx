"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shell, TopControls } from "@/components/Shell";
import { card } from "@/components/ui";
import { useStore, dayKey } from "@/lib/store";
import { ChevronRight, ChevronLeft, Flame, Trophy, Sprout, Crown, BarChart3, Calendar, Clock } from "lucide-react";

const STREAK_BADGES = [
  { n: 3, name: "بداية", Icon: Sprout },
  { n: 7, name: "أسبوع", Icon: Flame },
  { n: 14, name: "أسبوعين", Icon: Flame },
  { n: 30, name: "شهر", Icon: Trophy },
  { n: 100, name: "لا يتوقف", Icon: Crown },
];
const WEEKDAYS = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

function level(n: number) {
  if (n === 0) return "bg-surface-2";
  if (n === 1) return "bg-pink-300/40";
  if (n <= 3) return "bg-pink-400/70";
  return "bg-pink-600";
}

function CalendarInner() {
  const days = useStore((s) => s.days);
  const plays = useStore((s) => s.stats.plays);
  const setLast = useStore((s) => s.setLast);
  const [mounted, setMounted] = useState(false);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setLast("/calendar");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const streak = useMemo(() => {
    let n = 0;
    const d = new Date();
    while (days[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }, [days]);

  const best = useMemo(() => {
    const keys = Object.keys(days).sort();
    let best = 0, cur = 0, prev: Date | null = null;
    for (const k of keys) {
      const [y, m, d] = k.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      cur = prev && (dt.getTime() - prev.getTime()) / 864e5 === 1 ? cur + 1 : 1;
      best = Math.max(best, cur);
      prev = dt;
    }
    return best;
  }, [days]);

  const monthStats = useMemo(() => {
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    let active = 0, games = 0, mostDay: Record<number, number> = {};
    for (let i = 1; i <= total; i++) {
      const k = dayKey(new Date(month.getFullYear(), month.getMonth(), i));
      const c = days[k] ?? 0;
      if (c) { active++; games += c; }
    }
    for (const k of Object.keys(days)) {
      const [y, m, d] = k.split("-").map(Number);
      if (y === month.getFullYear() && m - 1 === month.getMonth()) {
        const wd = new Date(y, m - 1, d).getDay();
        mostDay[wd] = (mostDay[wd] ?? 0) + days[k];
      }
    }
    const top = Object.entries(mostDay).sort((a, b) => b[1] - a[1])[0];
    return { total, active, games, pct: Math.round((active / total) * 100), topWeekday: top ? WEEKDAYS[Number(top[0])] : "—" };
  }, [days, month]);

  const yearStats = useMemo(() => {
    const y = new Date().getFullYear();
    const keys = Object.keys(days).filter((k) => k.startsWith(`${y}-`));
    return { activeDays: keys.length, games: keys.reduce((s, k) => s + days[k], 0) };
  }, [days]);

  // خريطة السنة (شبكة أيام)
  const heat = useMemo(() => {
    const out: { k: string; c: number }[] = [];
    const d = new Date();
    d.setDate(d.getDate() - 364);
    for (let i = 0; i < 365; i++) {
      const k = dayKey(d);
      out.push({ k, c: days[k] ?? 0 });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [days]);

  if (!mounted) return <Shell title="تقويم الذكريات" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;

  const firstWeekday = month.getDay();
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  const todayKey = dayKey(new Date());
  const pickedCount = picked ? days[picked] ?? 0 : 0;

  const nextBadge = STREAK_BADGES.find((b) => b.n > streak);

  return (
    <Shell title="تقويم الذكريات" action={<TopControls />}>
      <div className={`${card} mb-4 text-center`}>
        <div className="flex items-center justify-center gap-2 text-sm text-muted"><Flame className="h-4 w-4 text-pink-400" /> السلسلة الحالية</div>
        <div className="my-1 text-5xl font-black text-pink-500">{streak}</div>
        <div className="text-sm text-muted">أيام متتالية · الأفضل: {best}</div>
        {nextBadge && <div className="mt-3 text-xs text-muted">باقي {nextBadge.n - streak} يوم لوسام "{nextBadge.name}"</div>}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {STREAK_BADGES.map((b) => {
            const got = streak >= b.n || best >= b.n;
            return (
              <div key={b.n} className={`flex flex-col items-center gap-1 rounded-2xl border p-2 ${got ? "border-pink-400 bg-pink-500/15" : "border-line opacity-40 grayscale"}`}>
                <b.Icon className={`h-5 w-5 ${got ? "text-pink-400" : "text-muted"}`} />
                <span className="text-[10px] font-bold">{b.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${card} mb-4`}>
        <div className="mb-3 flex items-center justify-between">
          <button aria-label="الشهر اللي قبل" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2"><ChevronRight className="h-4 w-4" /></button>
          <div className="font-black">{month.toLocaleDateString("ar", { month: "long", year: "numeric" })}</div>
          <button aria-label="الشهر اللي بعد" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2"><ChevronLeft className="h-4 w-4" /></button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
          {WEEKDAYS.map((w) => <div key={w}>{w.slice(0, 2)}</div>)}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={month.toISOString()} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const k = dayKey(new Date(month.getFullYear(), month.getMonth(), d));
              const c = days[k] ?? 0;
              return (
                <button
                  key={i}
                  onClick={() => setPicked(k)}
                  className={`relative grid aspect-square place-items-center rounded-xl text-xs font-bold transition ${level(c)} ${c ? "text-white" : "text-muted"} ${k === todayKey ? "ring-2 ring-pink-400" : ""} ${picked === k ? "scale-95 ring-2 ring-white/60" : ""}`}
                >
                  {d}
                  {c >= 4 && <Flame className="absolute -top-1 -left-1 h-3 w-3 text-amber-300" />}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted">
          أقل <span className="h-3 w-3 rounded bg-pink-300/40" /> <span className="h-3 w-3 rounded bg-pink-400/70" /> <span className="h-3 w-3 rounded bg-pink-600" /> أكثر
        </div>

        {picked && (
          <div className="mt-3 rounded-2xl bg-black/25 p-3 text-sm">
            <div className="font-bold">{new Date(picked).toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" })}</div>
            <div className="mt-1 text-muted">{pickedCount ? `لعبتوا ${pickedCount} جولة هذا اليوم` : "ما فيه لعب هذا اليوم"}</div>
          </div>
        )}
      </div>

      <div className="mb-2 flex items-center gap-2 font-black"><BarChart3 className="h-4 w-4" /> إحصائيات الشهر</div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Stat label="أيام نشطة" value={`${monthStats.active}/${monthStats.total}`} />
        <Stat label="نسبة النشاط" value={`${monthStats.pct}%`} />
        <Stat label="جولات الشهر" value={monthStats.games} />
        <Stat label="أنشط يوم بالأسبوع" value={monthStats.topWeekday} />
      </div>

      <div className="mb-2 flex items-center gap-2 font-black"><Calendar className="h-4 w-4" /> السنة</div>
      <div className={`${card} mb-4`}>
        <div className="mb-3 grid grid-cols-2 gap-2 text-center">
          <Stat label="أيام نشطة هالسنة" value={yearStats.activeDays} />
          <Stat label="جولات هالسنة" value={yearStats.games} />
        </div>
        <div className="grid grid-cols-[repeat(26,minmax(0,1fr))] gap-[3px]" dir="ltr">
          {heat.map((h) => <div key={h.k} title={`${h.k}: ${h.c}`} className={`aspect-square rounded-[3px] ${level(h.c)}`} />)}
        </div>
      </div>

      <div className={`${card} flex items-center justify-between`}>
        <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-pink-400" /> إجمالي الجولات كلها</div>
        <div className="text-xl font-black text-pink-500">{plays}</div>
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={`${card} p-3 text-center`}>
      <div className="text-lg font-black text-pink-500">{value}</div>
      <div className="mt-1 text-[11px] text-muted">{label}</div>
    </div>
  );
}

// التقويم يعتمد على التاريخ الحالي، فيرسم بعد التحميل في المتصفح فقط
export default function CalendarPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <Shell title="تقويم الذكريات" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;
  return <CalendarInner />;
}
