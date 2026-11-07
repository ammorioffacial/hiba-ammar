"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shell, TopControls } from "@/components/Shell";
import { btnPrimary, btnGhost, card, newId } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { useShared } from "@/lib/shared";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { Heart, Calendar, Sparkles, Award, Plus, Trash2, Share2 } from "lucide-react";

interface LoveDate { id: string; label: string; date: string }
const MILESTONES = [100, 180, 365, 500, 730, 1000, 1500, 2000, 3000, 5000];

function diffParts(from: Date, to: Date) {
  let y = to.getFullYear() - from.getFullYear();
  let m = to.getMonth() - from.getMonth();
  let d = to.getDate() - from.getDate();
  if (d < 0) {
    m -= 1;
    d += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  const days = Math.floor((to.getTime() - from.getTime()) / 864e5);
  return { y, m, d, days, hours: Math.floor((to.getTime() - from.getTime()) / 36e5) % 24 };
}

function LovePageInner() {
  const setLast = useStore((s) => s.setLast);
  const { value, save, loaded } = useShared<Record<string, LoveDate>>("lovedates", {});
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date(0));
  const [form, setForm] = useState({ label: "", date: "" });
  const [adding, setAdding] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    setLast("/together/love");
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(() => Object.values(value).sort((a, b) => a.date.localeCompare(b.date)), [value]);
  const current = items.find((i) => i.id === active) ?? items[0];

  // اكتشاف الإنجاز: أي مرحلة وصلنا لها اليوم
  useEffect(() => {
    if (!current) return;
    const from = new Date(current.date);
    const days = Math.floor((now.getTime() - from.getTime()) / 864e5);
    const hit = MILESTONES.includes(days) || (days > 0 && days % 365 === 0);
    if (hit) {
      sfx.win();
      celebrate(200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, now.toDateString()]);

  if (!mounted || !loaded) return <Shell title="عداد الحب" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;

  const add = () => {
    if (!form.date) return;
    const id = newId();
    save((p) => ({ ...p, [id]: { id, label: form.label.trim() || "يوم خاص", date: form.date } }));
    setForm({ label: "", date: "" });
    setAdding(false);
    setActive(id);
  };

  const remove = (id: string) => save((p) => { const n = { ...p }; delete n[id]; return n; });

  const parts = current ? diffParts(new Date(current.date), now) : null;
  const milestone = current && parts ? MILESTONES.filter((m) => m <= parts.days).pop() : undefined;
  const nextMilestone = current && parts ? MILESTONES.find((m) => m > parts.days) : undefined;
  const yearMark = parts && parts.y >= 1 && parts.m === 0 && parts.d === 0;

  return (
    <Shell title="عداد الحب" action={<TopControls />}>
      {!current ? (
        <div className={`${card} text-center`}>
          <Heart className="mx-auto mb-3 h-12 w-12 text-pink-500" />
          <p className="mb-4 text-muted">حطوا تاريخ مميز، مثل يوم زواجكم أو أول لقاء</p>
          <button className={btnPrimary} onClick={() => setAdding(true)}>أضيفوا تاريخ</button>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500 via-rose-600 to-violet-700 p-6 text-center text-white shadow-2xl">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-white/25"
                style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
                animate={{ y: [0, -18, 0], opacity: [0.2, 0.6, 0.2] }}
                transition={{ repeat: Infinity, duration: 3 + (i % 4), delay: i * 0.2 }}
              >
                <Heart className="h-4 w-4 fill-current" />
              </motion.span>
            ))}
            <div className="relative">
              <div className="text-sm opacity-90">{current.label}</div>
              <div className="mt-1 text-xs opacity-75">منذ {new Date(current.date).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" })}</div>
              <div className="mt-5 text-sm font-bold">أنتم سوا منذ</div>
              {parts && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <Unit value={parts.y} label="سنة" />
                  <Unit value={parts.m} label="شهر" />
                  <Unit value={parts.d} label="يوم" />
                  <Unit value={parts.hours} label="ساعة" />
                </div>
              )}
              <div className="mt-4 text-sm opacity-90">مجموع: {parts?.days ?? 0} يوم</div>
              {(milestone || yearMark) && (
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold">
                  <Award className="h-4 w-4" /> {yearMark ? `ذكرى ${parts?.y} سنة` : `إنجاز: ${milestone} يوم`}
                </motion.div>
              )}
            </div>
          </div>

          {nextMilestone && parts && (
            <div className={`${card} mt-4 text-center text-sm`}>
              <Calendar className="mx-auto mb-1 h-5 w-5 text-pink-400" />
              باقي <b className="text-pink-400">{nextMilestone - parts.days}</b> يوم للإنجاز القادم ({nextMilestone} يوم)
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button className={btnGhost + " flex-1 flex items-center justify-center gap-2 text-sm"} onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> تاريخ ثاني</button>
            <button className={btnGhost + " flex items-center gap-2 text-sm"} onClick={() => shareCard(current.label, parts?.days ?? 0)}><Share2 className="h-4 w-4" /> صورة</button>
            <button className={btnGhost + " text-sm"} onClick={() => remove(current.id)} aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
          </div>

          {items.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {items.map((i) => (
                <button key={i.id} onClick={() => setActive(i.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${current.id === i.id ? "bg-pink-500 text-white" : "bg-surface-2 text-muted"}`}>{i.label}</button>
              ))}
            </div>
          )}
        </>
      )}

      {adding && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setAdding(false)}>
          <div className={`${card} w-full max-w-sm space-y-3`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 font-black"><Sparkles className="h-4 w-4" /> تاريخ مميز</div>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="مثلا: يوم زواجنا" className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-pink-400 select-text" />
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none select-text" />
            <div className="flex justify-end gap-2">
              <button className={btnGhost} onClick={() => setAdding(false)}>إلغاء</button>
              <button className={btnPrimary} onClick={add}>احفظ</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-2">
      <div className="text-2xl font-black">{value}</div>
      <div className="text-[10px] opacity-80">{label}</div>
    </div>
  );
}

// بطاقة الذكرى كصورة PNG للتحميل والمشاركة
function shareCard(label: string, days: number) {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1080;
  const x = c.getContext("2d");
  if (!x) return;
  const g = x.createLinearGradient(0, 0, 1080, 1080);
  g.addColorStop(0, "#ff5fa2");
  g.addColorStop(0.55, "#c2185b");
  g.addColorStop(1, "#6d28d9");
  x.fillStyle = g;
  x.fillRect(0, 0, 1080, 1080);
  x.fillStyle = "#fff";
  x.textAlign = "center";
  x.font = "bold 60px sans-serif";
  x.fillText(label, 540, 380);
  x.font = "bold 200px sans-serif";
  x.fillText(String(days), 540, 620);
  x.font = "bold 56px sans-serif";
  x.fillText("يوم سوا", 540, 720);
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = "love-counter.png";
  a.click();
}

export default function LovePage() {
  return (
    <ClientOnly>
      <LovePageInner />
    </ClientOnly>
  );
}
