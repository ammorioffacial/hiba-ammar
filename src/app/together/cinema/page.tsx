"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell, TopControls } from "@/components/Shell";
import { ModeTabs, btnPrimary, btnGhost, card, newId, shuffle } from "@/components/ui";
import { MOVIES, MOODS, GENRES } from "@/lib/together-data";
import { useShared } from "@/lib/shared";
import { useOnline } from "@/lib/online";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { Film, Star, Heart, Bookmark, Eye, Plus, Search, Popcorn, Clapperboard, Smile, Zap, CloudMoon, Droplet, Skull, Drama, Sparkles, type LucideIcon } from "lucide-react";

type Movie = { id: string; title: string; en: string; year: number; genre: string; desc: string };
type Shared = {
  watch: Record<string, { when?: "tonight" | "weekend" | "sometime" }>;
  watched: Record<string, { date: string; ratings?: { a?: number; b?: number }; notes?: { a?: string; b?: string } }>;
  custom: Record<string, Movie>;
};
const EMPTY: Shared = { watch: {}, watched: {}, custom: {} };
const MOOD_ICON: Record<string, LucideIcon> = { Smile, Zap, CloudMoon, Droplet };
const GENRE_ICON: Record<string, LucideIcon> = { Heart: Heart, Smile, Skull, Zap, Drama, Film, Sparkles };
const WHEN = [
  { v: "tonight", label: "الليلة" },
  { v: "weekend", label: "نهاية الأسبوع" },
  { v: "sometime", label: "بوقت ما" },
] as const;

export default function CinemaPage() {
  const names = useStore((s) => s.names);
  const me = useOnline((s) => s.me);
  const setLast = useStore((s) => s.setLast);
  const { value, save, loaded } = useShared<Shared>("cinema", EMPTY);
  const [tab, setTab] = useState<"discover" | "watchlist" | "watched" | "stats">("discover");
  const [mood, setMood] = useState<string | null>(null);
  const [pick, setPick] = useState<Movie | null>(null);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<string>("all");
  const [mounted, setMounted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", en: "", year: "", genre: "comedy" });
  const mySide: "a" | "b" = me?.name === names.b ? "b" : "a";

  useEffect(() => {
    setMounted(true);
    setLast("/together/cinema");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all: Movie[] = useMemo(() => [...MOVIES, ...Object.values(value.custom ?? {})], [value.custom]);
  const byId = useMemo(() => Object.fromEntries(all.map((m) => [m.id, m])), [all]);

  if (!mounted || !loaded) return <Shell title="مود السينما" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;

  const list = all.filter((m) =>
    (genre === "all" || m.genre === genre) &&
    (!q || m.title.includes(q) || m.en.toLowerCase().includes(q.toLowerCase()))
  );

  const suggest = (mid: string) => {
    const m = MOODS.find((x) => x.id === mid);
    if (!m) return;
    const pool = all.filter((x) => (m.genres as readonly string[]).includes(x.genre) && !value.watched?.[x.id]);
    const choice = shuffle(pool)[0] ?? all[0];
    setMood(mid);
    setPick(choice);
    sfx.pick();
  };

  const addWatch = (id: string) => {
    save((p) => ({ ...p, watch: { ...p.watch, [id]: { when: "sometime" } } }));
    sfx.click();
  };
  const removeWatch = (id: string) => save((p) => { const w = { ...p.watch }; delete w[id]; return { ...p, watch: w }; });
  const setWhen = (id: string, when: "tonight" | "weekend" | "sometime") => save((p) => ({ ...p, watch: { ...p.watch, [id]: { when } } }));

  const markWatched = (id: string) => {
    const w = { ...value.watched, [id]: { date: new Date().toISOString(), ratings: {}, notes: {} } };
    const watch = { ...value.watch };
    delete watch[id];
    save((p) => ({ ...p, watched: w, watch }));
    sfx.win();
  };

  const rate = (id: string, n: number) => {
    const cur = value.watched[id];
    if (!cur) return;
    save((p) => ({ ...p, watched: { ...p.watched, [id]: { ...cur, ratings: { ...cur.ratings, [mySide]: n } } } }));
    sfx.pick();
  };
  const note = (id: string, text: string) => {
    const cur = value.watched[id];
    if (!cur) return;
    save((p) => ({ ...p, watched: { ...p.watched, [id]: { ...cur, notes: { ...cur.notes, [mySide]: text } } } }));
  };

  const addCustom = () => {
    if (!form.title.trim()) return;
    const id = newId();
    const m: Movie = { id, title: form.title.trim(), en: form.en.trim(), year: Number(form.year) || new Date().getFullYear(), genre: form.genre, desc: "" };
    save((p) => ({ ...p, custom: { ...p.custom, [id]: m } }));
    setForm({ title: "", en: "", year: "", genre: "comedy" });
    setAdding(false);
  };

  const watchIds = Object.keys(value.watch);
  const watchedIds = Object.keys(value.watched);
  const ratedAvg = (id: string) => {
    const r = value.watched[id]?.ratings ?? {};
    const vals = [r.a, r.b].filter((x): x is number => typeof x === "number");
    return vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : null;
  };
  const genreCounts = watchedIds.reduce<Record<string, number>>((acc, id) => {
    const g = byId[id]?.genre;
    if (g) acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <Shell title="مود السينما" action={<TopControls />}>
      <div className="mb-4 grid grid-cols-4 gap-1.5 rounded-2xl bg-black/20 p-1.5">
        {(["discover", "watchlist", "watched", "stats"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2 text-xs font-bold ${tab === t ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "text-muted"}`}>
            {{ discover: "اكتشف", watchlist: "نبي نشوفه", watched: "شفناه", stats: "إحصائيات" }[t]}
          </button>
        ))}
      </div>

      {tab === "discover" && (
        <>
          <div className={`${card} mb-4`}>
            <div className="mb-3 text-center font-black">وش مزاجكم الليلة؟</div>
            <div className="grid grid-cols-2 gap-2">
              {MOODS.map((m) => {
                const Icon = MOOD_ICON[m.icon] ?? Smile;
                return (
                  <button key={m.id} onClick={() => suggest(m.id)} className={`flex items-center gap-2 rounded-2xl border p-3 font-bold transition ${mood === m.id ? "border-pink-400 bg-pink-500/15" : "border-line bg-surface-2"}`}>
                    <Icon className="h-5 w-5 text-pink-400" /> {m.label}
                  </button>
                );
              })}
            </div>
            {pick && (
              <div className="mt-4 rounded-2xl bg-black/25 p-4">
                <div className="text-xs text-muted">نقترح عليكم</div>
                <div className="text-lg font-black">{pick.title}</div>
                <div className="text-xs text-muted">{pick.en} · {pick.year}</div>
                <div className="mt-2 text-sm">{pick.desc}</div>
                <div className="mt-3 flex gap-2">
                  <button className={btnPrimary + " text-sm"} onClick={() => addWatch(pick.id)}>ضيفوه للقائمة</button>
                  <button className={btnGhost + " text-sm"} onClick={() => suggest(mood ?? MOODS[0].id)}>اقترح ثاني</button>
                </div>
              </div>
            )}
          </div>

          <div className="relative mb-3">
            <Search className="absolute right-3 top-3.5 h-4 w-4 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحثوا عن فلم" className="w-full rounded-2xl border border-line bg-surface-2 py-3 pl-4 pr-10 outline-none focus:border-pink-400 select-text" />
          </div>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setGenre("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${genre === "all" ? "bg-pink-500 text-white" : "bg-surface-2 text-muted"}`}>الكل</button>
            {GENRES.map((g) => (
              <button key={g.id} onClick={() => setGenre(g.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${genre === g.id ? "bg-pink-500 text-white" : "bg-surface-2 text-muted"}`}>{g.label}</button>
            ))}
          </div>

          <div className="space-y-2">
            {list.map((m) => {
              const GI = GENRE_ICON[GENRES.find((g) => g.id === m.genre)?.icon ?? "Film"] ?? Film;
              const inList = !!value.watch[m.id];
              const seen = !!value.watched[m.id];
              return (
                <div key={m.id} className={`${card} flex items-start gap-3 p-4`}>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500/30 to-rose-600/30"><GI className="h-5 w-5 text-pink-400" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black">{m.title}</div>
                    <div className="text-xs text-muted">{m.en} · {m.year}</div>
                    {m.desc && <div className="mt-1 text-xs text-muted">{m.desc}</div>}
                  </div>
                  {!seen && (
                    <button onClick={() => (inList ? removeWatch(m.id) : addWatch(m.id))} aria-label="قائمة" className={`grid h-9 w-9 place-items-center rounded-xl border ${inList ? "border-pink-400 bg-pink-500/20 text-pink-400" : "border-line"}`}>
                      <Bookmark className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={() => setAdding(true)} className={`${btnGhost} mt-4 flex w-full items-center justify-center gap-2`}><Plus className="h-4 w-4" /> فلم مو في القائمة</button>
        </>
      )}

      {tab === "watchlist" && (
        <div className="space-y-2">
          {watchIds.map((id) => {
            const m = byId[id];
            if (!m) return null;
            const when = value.watch[id]?.when ?? "sometime";
            return (
              <div key={id} className={`${card} p-4`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-black">{m.title}</div>
                    <div className="text-xs text-muted">{m.year} · {GENRES.find((g) => g.id === m.genre)?.label}</div>
                  </div>
                  <button onClick={() => removeWatch(id)} className="text-xs text-muted">حذف</button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {WHEN.map((w) => (
                    <button key={w.v} onClick={() => setWhen(id, w.v)} className={`rounded-xl py-1.5 text-xs font-bold ${when === w.v ? "bg-pink-500 text-white" : "bg-surface-2 text-muted"}`}>{w.label}</button>
                  ))}
                </div>
                <button onClick={() => markWatched(id)} className={`${btnPrimary} mt-3 w-full text-sm`}>شفناه</button>
              </div>
            );
          })}
          {watchIds.length === 0 && <p className="py-8 text-center text-muted">القائمة فاضية. اختاروا فلم من "اكتشف"</p>}
        </div>
      )}

      {tab === "watched" && (
        <div className="space-y-3">
          {watchedIds.map((id) => {
            const m = byId[id];
            if (!m) return null;
            const r = value.watched[id].ratings ?? {};
            const avg = ratedAvg(id);
            const mineRating = mySide === "a" ? r.a : r.b;
            return (
              <div key={id} className={`${card} p-4`}>
                <div className="flex items-center justify-between">
                  <div className="font-black">{m.title}</div>
                  {avg !== null && <div className="flex items-center gap-1 text-sm font-bold text-pink-400"><Star className="h-4 w-4 fill-pink-400" /> {avg.toFixed(1)}</div>}
                </div>
                <div className="mt-1 text-xs text-muted">شفناه بتاريخ {new Date(value.watched[id].date).toLocaleDateString("ar")}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-black/20 p-2 text-center">{names.a}: {r.a ?? "—"}/5</div>
                  <div className="rounded-xl bg-black/20 p-2 text-center">{names.b}: {r.b ?? "—"}/5</div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 text-xs text-muted">تقييمك</div>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => rate(id, n)} aria-label={`${n} نجوم`} className={`grid h-9 w-9 place-items-center rounded-xl border ${mineRating && n <= mineRating ? "border-pink-400 bg-pink-500/20 text-pink-400" : "border-line text-muted"}`}>
                        {n === 5 ? <Heart className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  defaultValue={value.watched[id].notes?.[mySide] ?? ""}
                  onBlur={(e) => note(id, e.target.value)}
                  placeholder="تعليقك القصير"
                  className="mt-3 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-pink-400 select-text"
                />
              </div>
            );
          })}
          {watchedIds.length === 0 && <p className="py-8 text-center text-muted">ما شفتوا شي بعد</p>}
        </div>
      )}

      {tab === "stats" && (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="أفلام شفتوها" value={watchedIds.length} />
          <Stat label="بالقائمة" value={watchIds.length} />
          <Stat label="متوسط التقييم" value={(() => { const v = watchedIds.map(ratedAvg).filter((x): x is number => x !== null); return v.length ? (v.reduce((s, x) => s + x, 0) / v.length).toFixed(1) : "—"; })()} />
          <Stat label="النوع المفضل" value={topGenre ? GENRES.find((g) => g.id === topGenre)?.label ?? "—" : "—"} />
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setAdding(false)}>
          <div className={`${card} w-full max-w-sm space-y-3`} onClick={(e) => e.stopPropagation()}>
            <div className="font-black">فلم جديد</div>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="الاسم بالعربي" className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none select-text" />
            <input value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} placeholder="الاسم بالإنجليزي" className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none select-text" />
            <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="السنة" inputMode="numeric" className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none select-text" />
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button key={g.id} onClick={() => setForm({ ...form, genre: g.id })} className={`rounded-full px-3 py-1.5 text-xs font-bold ${form.genre === g.id ? "bg-pink-500 text-white" : "bg-surface-2 text-muted"}`}>{g.label}</button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button className={btnGhost} onClick={() => setAdding(false)}>إلغاء</button>
              <button className={btnPrimary} onClick={addCustom}>أضف</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={`${card} text-center`}>
      <div className="text-2xl font-black text-pink-500">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}
