"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shell, TopControls } from "@/components/Shell";
import { ModeTabs, btnPrimary, btnGhost, card, newId } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { useShared } from "@/lib/shared";
import { useOnline } from "@/lib/online";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { Lock, LockOpen, Mail, MailOpen, Plus, Gift, Sparkles, Key, Dices, CalendarDays, Trophy } from "lucide-react";

type Cond = { type: "date"; value: string } | { type: "games"; value: number } | { type: "streak"; value: number } | { type: "random"; value: string };
interface Capsule {
  id: string;
  hint: string;
  text: string;
  from: "a" | "b";
  createdAt: string;
  cond: Cond;
  openedBy?: { a?: boolean; b?: boolean };
  randomAt?: string; // وقت عشوائي محسوب مسبقاً
}

function CapsulesPageInner() {
  const names = useStore((s) => s.names);
  const plays = useStore((s) => s.stats.plays);
  const days = useStore((s) => s.days);
  const me = useOnline((s) => s.me);
  const setLast = useStore((s) => s.setLast);
  const { value, save, loaded } = useShared<Record<string, Capsule>>("capsules", {});
  const [tab, setTab] = useState<"locked" | "open">("locked");
  const [mounted, setMounted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ text: "", hint: "", kind: "date" as Cond["type"], date: "", games: 10, streak: 3, from: 0 });
  const mySide: "a" | "b" = me?.name === names.b ? "b" : "a";

  useEffect(() => {
    setMounted(true);
    setLast("/together/capsules");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const streak = useMemo(() => {
    let n = 0;
    const d = new Date();
    while (days[`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`]) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [days]);

  if (!mounted || !loaded) return <Shell title="رسائل مخفية" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;

  const now = Date.now();
  const isUnlocked = (c: Capsule) => {
    switch (c.cond.type) {
      case "date": return now >= new Date(c.cond.value).getTime();
      case "games": return plays >= c.cond.value;
      case "streak": return streak >= c.cond.value;
      case "random": return !!c.randomAt && now >= new Date(c.randomAt).getTime();
    }
  };

  const all = Object.values(value).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unlocked = all.filter(isUnlocked);
  const locked = all.filter((c) => !isUnlocked(c));

  const create = () => {
    if (!form.text.trim()) return;
    let cond: Cond;
    if (form.kind === "date") cond = { type: "date", value: form.date || new Date().toISOString() };
    else if (form.kind === "games") cond = { type: "games", value: form.games };
    else if (form.kind === "streak") cond = { type: "streak", value: form.streak };
    else {
      // عشوائي: بين بعد يوم وبعد 30 يوم
      const days = 1 + Math.floor(Math.random() * 30);
      cond = { type: "random", value: "" };
      const id = newId();
      save((p) => ({ ...p, [id]: { id, hint: form.hint, text: form.text.trim(), from: mySide, createdAt: new Date().toISOString(), cond, randomAt: new Date(Date.now() + days * 864e5).toISOString() } }));
      finish();
      return;
    }
    const id = newId();
    save((p) => ({ ...p, [id]: { id, hint: form.hint, text: form.text.trim(), from: mySide, createdAt: new Date().toISOString(), cond } }));
    finish();
  };

  const finish = () => {
    setForm({ text: "", hint: "", kind: "date", date: "", games: 10, streak: 3, from: 0 });
    setAdding(false);
    sfx.win();
  };

  // لازم الاثنين يفتحونها، كل واحد يضغط بدوره
  const openFor = (c: Capsule) => {
    const next = { ...(c.openedBy ?? {}), [mySide]: true };
    save((p) => ({ ...p, [c.id]: { ...c, openedBy: next } }));
    if (next.a && next.b) {
      sfx.win();
      celebrate(120);
    } else sfx.pick();
  };

  const describeCond = (c: Cond) => {
    if (c.type === "date") return `تنفتح يوم ${new Date(c.value).toLocaleDateString("ar")}`;
    if (c.type === "games") return `بعد ${c.value} جولة لعب (الحالي: ${Math.min(plays, c.value)})`;
    if (c.type === "streak") return `بعد ${c.value} أيام متتالية (الحالي: ${Math.min(streak, c.value)})`;
    return "تنفتح بوقت عشوائي";
  };

  return (
    <Shell title="رسائل مخفية" action={<TopControls />}>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5">
        {(["locked", "open"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2.5 text-sm font-bold ${tab === t ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "text-muted"}`}>
            {t === "locked" ? `مقفولة (${locked.length})` : `مفتوحة (${unlocked.length})`}
          </button>
        ))}
      </div>

      {tab === "locked" && (
        <div className="space-y-3">
          {locked.map((c) => (
            <div key={c.id} className={`${card} text-center`}>
              <motion.div animate={{ rotate: [0, -4, 4, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-black/30">
                <Lock className="h-6 w-6 text-pink-300" />
              </motion.div>
              <div className="text-sm text-muted">تلميح</div>
              <div className="mb-2 font-black">{c.hint || "—"}</div>
              <div className="text-xs text-muted">{describeCond(c.cond)}</div>
            </div>
          ))}
          {locked.length === 0 && <p className="py-8 text-center text-muted">ما فيه رسائل مقفولة</p>}
        </div>
      )}

      {tab === "open" && (
        <div className="space-y-3">
          {unlocked.map((c) => {
            const mineOpened = !!c.openedBy?.[mySide];
            const both = !!(c.openedBy?.a && c.openedBy?.b);
            const showText = both;
            return (
              <div key={c.id} className={card}>
                <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                  {showText ? <MailOpen className="h-4 w-4 text-pink-400" /> : <Mail className="h-4 w-4 text-pink-400" />}
                  {c.from === "a" ? names.a : names.b} كتب لكم · {new Date(c.createdAt).toLocaleDateString("ar")}
                </div>
                <AnimatePresence mode="wait">
                  {showText ? (
                    <motion.div key="t" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-black/25 p-4 leading-relaxed">
                      {c.text}
                    </motion.div>
                  ) : (
                    <motion.div key="l" className="rounded-2xl bg-black/25 p-4 text-center text-sm text-muted">
                      {mineOpened ? `بانتظار ${(mySide === "a" ? names.b : names.a)} يفتحها معكم` : "الاثنين لازم يفتحونها سوا"}
                    </motion.div>
                  )}
                </AnimatePresence>
                {!showText && !mineOpened && (
                  <button onClick={() => openFor(c)} className={`${btnPrimary} mt-3 w-full flex items-center justify-center gap-2 text-sm`}>
                    <Key className="h-4 w-4" /> افتحها الحين
                  </button>
                )}
                {showText && (
                  <div className="mt-2 flex items-center justify-center gap-1 text-xs font-bold text-pink-400"><Trophy className="h-3.5 w-3.5" /> انفتحت للاثنين</div>
                )}
              </div>
            );
          })}
          {unlocked.length === 0 && <p className="py-8 text-center text-muted">ما فيه رسائل مفتوحة بعد</p>}
        </div>
      )}

      <button onClick={() => setAdding(true)} aria-label="رسالة جديدة" className="fixed bottom-6 left-1/2 z-30 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-2xl">
        <Plus className="h-6 w-6" />
      </button>

      {adding && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setAdding(false)}>
          <div className={`${card} max-h-[85vh] w-full max-w-sm space-y-3 overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <div className="font-black">رسالة مخفية جديدة</div>
            <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={4} placeholder="اكتبوا الرسالة" className="w-full rounded-2xl border border-line bg-surface-2 p-3 outline-none focus:border-pink-400 select-text" />
            <input value={form.hint} onChange={(e) => setForm({ ...form, hint: e.target.value })} placeholder="تلميح يظهر قبل الفتح" className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-pink-400 select-text" />
            <div className="text-xs text-muted">شرط الفتح</div>
            <ModeTabs
              value={form.kind}
              options={[
                { v: "date", label: "تاريخ" },
                { v: "games", label: "جولات" },
                { v: "streak", label: "سلسلة" },
                { v: "random", label: "عشوائي" },
              ]}
              onChange={(v) => setForm({ ...form, kind: v as Cond["type"] })}
            />
            {form.kind === "date" && <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none select-text" />}
            {form.kind === "games" && <input type="number" min={1} value={form.games} onChange={(e) => setForm({ ...form, games: Number(e.target.value) })} className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none select-text" />}
            {form.kind === "streak" && <input type="number" min={1} value={form.streak} onChange={(e) => setForm({ ...form, streak: Number(e.target.value) })} className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none select-text" />}
            {form.kind === "random" && <div className="flex items-center gap-2 text-xs text-muted"><Dices className="h-4 w-4" /> تنفتح بعد يوم إلى 30 يوم بشكل عشوائي</div>}
            <div className="flex justify-end gap-2">
              <button className={btnGhost} onClick={() => setAdding(false)}>إلغاء</button>
              <button className={btnPrimary} onClick={create}>اقفلها</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

export default function CapsulesPage() {
  return (
    <ClientOnly>
      <CapsulesPageInner />
    </ClientOnly>
  );
}
