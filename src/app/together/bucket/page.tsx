"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Shell, TopControls } from "@/components/Shell";
import { btnPrimary, btnGhost, card, newId } from "@/components/ui";
import { useShared } from "@/lib/shared";
import { celebrate } from "@/components/Providers";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { Check, Circle, Trash2, Trophy, Plus, MapPin, UtensilsCrossed, Compass, Sparkles, BookOpen, House, Dumbbell, Tag } from "lucide-react";

type Cat = "travel" | "food" | "adventure" | "experience" | "learning" | "home" | "fitness" | "custom";
interface Dream { id: string; title: string; desc?: string; cat: Cat; target?: string; done?: boolean; doneAt?: string }

const CATS: { id: Cat; name: string; Icon: typeof MapPin }[] = [
  { id: "travel", name: "سفر", Icon: MapPin },
  { id: "food", name: "أكل", Icon: UtensilsCrossed },
  { id: "adventure", name: "مغامرة", Icon: Compass },
  { id: "experience", name: "تجربة", Icon: Sparkles },
  { id: "learning", name: "تعلّم", Icon: BookOpen },
  { id: "home", name: "البيت", Icon: House },
  { id: "fitness", name: "رياضة", Icon: Dumbbell },
  { id: "custom", name: "أخرى", Icon: Tag },
];
const catOf = (id: Cat) => CATS.find((c) => c.id === id) ?? CATS[7];

export default function BucketPage() {
  const setLast = useStore((s) => s.setLast);
  const { value, save, loaded } = useShared<Record<string, Dream>>("bucket", {});
  const [tab, setTab] = useState<"active" | "done">("active");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ title: string; desc: string; cat: Cat; target: string }>({ title: "", desc: "", cat: "travel", target: "" });
  const [filter, setFilter] = useState<Cat | "all">("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setLast("/together/bucket");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = useMemo(() => Object.values(value).sort((a, b) => (a.target ?? "9999").localeCompare(b.target ?? "9999")), [value]);
  const active = all.filter((d) => !d.done && (filter === "all" || d.cat === filter));
  const done = all.filter((d) => d.done).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
  const pct = all.length ? Math.round((done.length / all.length) * 100) : 0;
  const latest = done[0];

  if (!mounted || !loaded) return <Shell title="قائمة الأمنيات" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;

  const add = () => {
    if (!form.title.trim()) return;
    const id = newId();
    save((p) => ({ ...p, [id]: { id, title: form.title.trim(), desc: form.desc.trim(), cat: form.cat, target: form.target || undefined } }));
    setForm({ title: "", desc: "", cat: "travel", target: "" });
    setAdding(false);
    sfx.click();
  };

  const toggle = (d: Dream) => {
    if (d.done) {
      save((p) => ({ ...p, [d.id]: { ...d, done: false, doneAt: undefined } }));
      return;
    }
    save((p) => ({ ...p, [d.id]: { ...d, done: true, doneAt: new Date().toISOString() } }));
    sfx.win();
    celebrate(90);
  };

  const remove = (id: string) => save((p) => { const n = { ...p }; delete n[id]; return n; });

  return (
    <Shell title="قائمة الأمنيات" action={<TopControls />}>
      {latest && (
        <div className={`${card} mb-4 flex items-center gap-3`}>
          <Trophy className="h-8 w-8 text-gold" />
          <div>
            <div className="text-xs text-muted">آخر إنجاز</div>
            <div className="font-black">{latest.title}</div>
          </div>
        </div>
      )}

      <div className={`${card} mb-4`}>
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-bold">{done.length} من {all.length} حلم</span>
          <span className="font-black text-pink-400">{pct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-black/25">
          <motion.div className="h-full rounded-full bg-gradient-to-l from-pink-500 to-rose-600" animate={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5">
        {(["active", "done"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2.5 text-sm font-bold ${tab === t ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "text-muted"}`}>
            {t === "active" ? "أحلامنا" : "تحققت"}
          </button>
        ))}
      </div>

      {tab === "active" && (
        <>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setFilter("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${filter === "all" ? "bg-pink-500 text-white" : "bg-surface-2 text-muted"}`}>الكل</button>
            {CATS.map(({ id, name }) => (
              <button key={id} onClick={() => setFilter(id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${filter === id ? "bg-pink-500 text-white" : "bg-surface-2 text-muted"}`}>{name}</button>
            ))}
          </div>
          <div className="space-y-2">
            {active.map((d) => {
              const { Icon, name } = catOf(d.cat);
              return (
                <div key={d.id} className={`${card} flex items-center gap-3 p-4`}>
                  <button onClick={() => toggle(d)} aria-label="تم" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-pink-400 text-pink-400">
                    <Circle className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{d.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <Icon className="h-3 w-3" /> {name}
                      {d.target && <span>· {d.target}</span>}
                    </div>
                    {d.desc && <div className="mt-1 text-xs text-muted">{d.desc}</div>}
                  </div>
                  <button onClick={() => remove(d.id)} aria-label="حذف" className="text-muted"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
            {active.length === 0 && <p className="py-8 text-center text-muted">ما فيه أحلام بهالقسم. أضيفوا أول حلم</p>}
          </div>
        </>
      )}

      {tab === "done" && (
        <div className="space-y-2">
          {done.map((d) => (
            <div key={d.id} className={`${card} flex items-center gap-3 p-4`}>
              <button onClick={() => toggle(d)} aria-label="رجّع" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white">
                <Check className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="font-bold line-through decoration-pink-400">{d.title}</div>
                <div className="text-xs text-muted">{d.doneAt ? new Date(d.doneAt).toLocaleDateString("ar") : ""}</div>
              </div>
            </div>
          ))}
          {done.length === 0 && <p className="py-8 text-center text-muted">لسا ما تحقق شي. يلا نبدأ</p>}
        </div>
      )}

      <button onClick={() => setAdding(true)} aria-label="حلم جديد" className="fixed bottom-6 left-1/2 z-30 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-2xl">
        <Plus className="h-6 w-6" />
      </button>

      {adding && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setAdding(false)}>
          <div className={`${card} w-full max-w-sm space-y-3`} onClick={(e) => e.stopPropagation()}>
            <div className="font-black">حلم جديد</div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="شنو الحلم؟" className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-pink-400 select-text" />
            <textarea value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="تفاصيل (اختياري)" rows={2} className="w-full rounded-2xl border border-line bg-surface-2 p-3 outline-none focus:border-pink-400 select-text" />
            <input type="date" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none select-text" />
            <div className="flex flex-wrap gap-2">
              {CATS.map(({ id, name }) => (
                <button key={id} onClick={() => setForm({ ...form, cat: id })} className={`rounded-full px-3 py-1.5 text-xs font-bold ${form.cat === id ? "bg-pink-500 text-white" : "bg-surface-2 text-muted"}`}>{name}</button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button className={btnGhost} onClick={() => setAdding(false)}>إلغاء</button>
              <button className={btnPrimary} onClick={add}>أضف</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
