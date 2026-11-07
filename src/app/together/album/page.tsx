"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shell, TopControls } from "@/components/Shell";
import { ModeTabs, btnPrimary, btnGhost, card, newId } from "@/components/ui";
import { supa, supabaseReady, compressImage, BUCKET } from "@/lib/supabase";
import { useShared } from "@/lib/shared";
import { useOnline } from "@/lib/online";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { Camera, Heart, Plane, Award, Sun, Utensils, PartyPopper, Smile, Image as ImageIcon, LayoutGrid, Rows3, Play, Pause, Trash2, Upload, X, type LucideIcon } from "lucide-react";

type Cat = "dates" | "trips" | "milestones" | "everyday" | "food" | "celebrations" | "funny";
interface Memory {
  id: string;
  url: string;
  path: string;
  caption: string;
  date: string;
  cat: Cat;
  comments?: Record<string, string>; // كل واحد يكتب تعليق
}

const CATS: { id: Cat; name: string; Icon: LucideIcon }[] = [
  { id: "dates", name: "مواعيد", Icon: Heart },
  { id: "trips", name: "رحلات", Icon: Plane },
  { id: "milestones", name: "إنجازات", Icon: Award },
  { id: "everyday", name: "يومي", Icon: Sun },
  { id: "food", name: "أكل", Icon: Utensils },
  { id: "celebrations", name: "احتفالات", Icon: PartyPopper },
  { id: "funny", name: "مواقف مضحكة", Icon: Smile },
];
const catOf = (c: Cat) => CATS.find((x) => x.id === c) ?? CATS[3];

function AlbumPageInner() {
  const names = useStore((s) => s.names);
  const me = useOnline((s) => s.me);
  const setLast = useStore((s) => s.setLast);
  const { value, save, loaded } = useShared<Record<string, Memory>>("album", {});
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"timeline" | "grid" | "category" | "slideshow">("timeline");
  const [filter, setFilter] = useState<Cat | "all">("all");
  const [open, setOpen] = useState<Memory | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [cat, setCat] = useState<Cat>("everyday");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slideIdx, setSlideIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const fileRef = useRef<HTMLInputElement>(null);
  const mySide: "a" | "b" = me?.name === names.b ? "b" : "a";

  useEffect(() => {
    setMounted(true);
    setLast("/together/album");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(
    () => Object.values(value).filter((m) => filter === "all" || m.cat === filter).sort((a, b) => b.date.localeCompare(a.date)),
    [value, filter]
  );

  // شرائح العرض
  useEffect(() => {
    if (!playing || items.length === 0) return;
    const t = setTimeout(() => setSlideIdx((i) => (i + 1) % items.length), speed * 1000);
    return () => clearTimeout(t);
  }, [playing, slideIdx, speed, items.length]);

  if (!mounted || !loaded) return <Shell title="ألبوم الذكريات" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;

  if (!supabaseReady || !supa) {
    return (
      <Shell title="ألبوم الذكريات" action={<TopControls />}>
        <div className={card}>
          <p className="text-sm text-muted">الألبوم يحتاج Supabase. أضيفوا NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY في .env.local (وفي Vercel)، وأنشئوا bucket عام اسمه memories.</p>
        </div>
      </Shell>
    );
  }

  const upload = async (files: FileList | null) => {
    if (!files || !supa) return;
    setUploading(true);
    setErr("");
    try {
      for (const f of Array.from(files)) {
        const blob = await compressImage(f);
        const id = newId();
        const path = `${me?.uid ?? "anon"}/${id}.jpg`;
        const { error } = await supa.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        const { data } = supa.storage.from(BUCKET).getPublicUrl(path);
        save((p) => ({ ...p, [id]: { id, url: data.publicUrl, path, caption, date, cat } }));
      }
      setCaption("");
      sfx.win();
    } catch (e) {
      setErr(`تعذر الرفع: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (m: Memory) => {
    if (!confirm("تبون تحذفون هالصورة؟")) return;
    if (supa) await supa.storage.from(BUCKET).remove([m.path]);
    save((p) => { const n = { ...p }; delete n[m.id]; return n; });
    setOpen(null);
  };

  const updateMemory = (id: string, patch: Partial<Memory>) =>
    save((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const addComment = (m: Memory, text: string) => {
    if (!text.trim()) return;
    updateMemory(m.id, { comments: { ...(m.comments ?? {}), [mySide]: text.trim() } });
  };

  const stats = (() => {
    const list = Object.values(value);
    const byMonth: Record<string, number> = {};
    list.forEach((m) => { const k = m.date.slice(0, 7); byMonth[k] = (byMonth[k] ?? 0) + 1; });
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const top = Object.entries(byMonth).sort((a, b) => b[1] - a[1])[0];
    return { total: list.length, first: sorted[0], last: sorted[sorted.length - 1], top };
  })();

  const groups = items.reduce<Record<string, Memory[]>>((acc, m) => {
    const k = new Date(m.date).toLocaleDateString("ar", { month: "long", year: "numeric" });
    (acc[k] ??= []).push(m);
    return acc;
  }, {});

  const Card = ({ m }: { m: Memory }) => (
    <button onClick={() => setOpen(m)} className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={m.url} alt={m.caption} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
    </button>
  );

  return (
    <Shell title="ألبوم الذكريات" action={<TopControls />}>
      <div className="mb-3 grid grid-cols-4 gap-1.5 rounded-2xl bg-black/20 p-1.5">
        {([
          { v: "timeline", Icon: Rows3, label: "زمني" },
          { v: "grid", Icon: LayoutGrid, label: "شبكة" },
          { v: "category", Icon: ImageIcon, label: "فئات" },
          { v: "slideshow", Icon: Play, label: "عرض" },
        ] as const).map(({ v, Icon, label }) => (
          <button key={v} onClick={() => setView(v)} className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-bold ${view === v ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "text-muted"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className={`${card} mb-4 space-y-3`}>
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-xl bg-black/20 p-2"><div className="text-lg font-black text-pink-400">{stats.total}</div>ذكرى</div>
          <div className="rounded-xl bg-black/20 p-2"><div className="text-lg font-black text-pink-400">{stats.top ? stats.top[0].slice(5) : "—"}</div>أنشط شهر</div>
        </div>
        <div className="grid gap-2">
          <select value={cat} onChange={(e) => setCat(e.target.value as Cat)} className="rounded-2xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none select-text">
            {CATS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-2xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none select-text" />
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="وش القصة؟" className="rounded-2xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-pink-400 select-text" />
          <button className={btnPrimary + " flex items-center justify-center gap-2 text-sm"} disabled={uploading} onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> {uploading ? "جاري الرفع…" : "ارفعوا صور"}
          </button>
          {err && <p className="text-xs text-rose-400">{err}</p>}
        </div>
      </div>

      {view !== "slideshow" && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setFilter("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${filter === "all" ? "bg-pink-500 text-white" : "bg-surface-2 text-muted"}`}>الكل</button>
          {CATS.map(({ id, name }) => (
            <button key={id} onClick={() => setFilter(id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${filter === id ? "bg-pink-500 text-white" : "bg-surface-2 text-muted"}`}>{name}</button>
          ))}
        </div>
      )}

      {view === "timeline" && (
        <div className="space-y-5">
          {Object.entries(groups).map(([month, list]) => (
            <div key={month}>
              <div className="mb-2 text-sm font-black text-pink-400">{month}</div>
              <div className="grid grid-cols-3 gap-2">{list.map((m) => <Card key={m.id} m={m} />)}</div>
            </div>
          ))}
        </div>
      )}

      {view === "grid" && <div className="grid grid-cols-3 gap-2">{items.map((m) => <Card key={m.id} m={m} />)}</div>}

      {view === "category" && (
        <div className="space-y-5">
          {CATS.filter((c) => filter === "all" || c.id === filter).map((c) => {
            const list = items.filter((m) => m.cat === c.id);
            if (!list.length) return null;
            return (
              <div key={c.id}>
                <div className="mb-2 flex items-center gap-2 text-sm font-black"><c.Icon className="h-4 w-4 text-pink-400" /> {c.name}</div>
                <div className="grid grid-cols-3 gap-2">{list.map((m) => <Card key={m.id} m={m} />)}</div>
              </div>
            );
          })}
        </div>
      )}

      {view === "slideshow" && (
        <div className="space-y-3">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-line bg-black">
            <AnimatePresence mode="wait">
              {items[slideIdx % Math.max(items.length, 1)] && (
                <motion.img
                  key={items[slideIdx % items.length].id}
                  src={items[slideIdx % items.length].url}
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 h-full w-full object-cover"
                  alt=""
                />
              )}
            </AnimatePresence>
            {items.length === 0 && <div className="grid h-full place-items-center text-muted">ما فيه صور بعد</div>}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setPlaying((p) => !p)} className={btnPrimary + " flex items-center gap-2 text-sm"}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "وقف" : "شغّل"}
            </button>
            <ModeTabs value={String(speed)} options={[{ v: "3", label: "3ث" }, { v: "5", label: "5ث" }, { v: "8", label: "8ث" }]} onChange={(v) => setSpeed(Number(v))} />
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />

      {open && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/85 p-4" onClick={() => setOpen(null)}>
          <div className="mx-auto max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end"><button onClick={() => setOpen(null)} aria-label="إغلاق" className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.url} alt={open.caption} className="w-full rounded-2xl" />
            <div className={card}>
              <div className="flex items-center gap-2 text-xs text-muted">{(() => { const C = catOf(open.cat).Icon; return <C className="h-3.5 w-3.5 text-pink-400" />; })()} {catOf(open.cat).name} · {new Date(open.date).toLocaleDateString("ar")}</div>
              <input defaultValue={open.caption} onBlur={(e) => updateMemory(open.id, { caption: e.target.value })} placeholder="الوصف" className="mt-2 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none select-text" />
              <input type="date" defaultValue={open.date} onChange={(e) => updateMemory(open.id, { date: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none select-text" />
              <div className="mt-3 space-y-1.5 text-sm">
                {open.comments?.a && <div><span className="font-bold text-pink-400">{names.a}:</span> {open.comments.a}</div>}
                {open.comments?.b && <div><span className="font-bold text-pink-400">{names.b}:</span> {open.comments.b}</div>}
              </div>
              <CommentBox onSend={(t) => addComment(open, t)} />
              <button onClick={() => remove(open)} className={`${btnGhost} mt-3 flex w-full items-center justify-center gap-2 text-sm text-rose-400`}><Trash2 className="h-4 w-4" /> احذف</button>
            </div>
          </div>
        </div>
      )}

      {stats.total > 0 && view !== "slideshow" && (
        <div className="mt-6 grid grid-cols-2 gap-2 text-center text-xs text-muted">
          <div className={card}>أول ذكرى<div className="mt-1 font-bold text-pink-400">{stats.first ? new Date(stats.first.date).toLocaleDateString("ar") : "—"}</div></div>
          <div className={card}>آخر ذكرى<div className="mt-1 font-bold text-pink-400">{stats.last ? new Date(stats.last.date).toLocaleDateString("ar") : "—"}</div></div>
        </div>
      )}
    </Shell>
  );
}

function CommentBox({ onSend }: { onSend: (t: string) => void }) {
  const [t, setT] = useState("");
  return (
    <div className="mt-3 flex gap-2">
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="تعليقك" className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none select-text" />
      <button className={btnGhost + " text-sm"} onClick={() => { onSend(t); setT(""); }}>أرسل</button>
    </div>
  );
}

export default function AlbumPage() {
  return (
    <ClientOnly>
      <AlbumPageInner />
    </ClientOnly>
  );
}
