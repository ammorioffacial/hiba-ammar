"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { useEffect, useMemo, useState } from "react";
import { Shell, TopControls } from "@/components/Shell";
import { btnPrimary, btnGhost, card } from "@/components/ui";
import { QUESTIONS } from "@/lib/together-data";
import { useShared } from "@/lib/shared";
import { useOnline } from "@/lib/online";
import { useStore, dayKey } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { ArchiveRestore, Heart, Laugh, Lightbulb, Telescope, Clock, MessageSquare, Bookmark, Check } from "lucide-react";

type Answers = Record<string, { a?: string; b?: string; reactA?: string; reactB?: string; bookmarked?: boolean }>;

const CAT_ICON = { deep: Heart, funny: Laugh, hypo: Lightbulb, romantic: Heart, future: Telescope, nostalgia: Clock } as const;
const CAT_NAME = { deep: "عميق", funny: "مرح", hypo: "افتراضي", romantic: "رومانسي", future: "المستقبل", nostalgia: "ذكريات" } as const;
const REACTS = [
  { id: "heart", Icon: Heart },
  { id: "laugh", Icon: Laugh },
  { id: "think", Icon: Lightbulb },
];

// السؤال يتغير كل يوم، وهو نفسه على الجوالين (حسب رقم اليوم)
function questionForDay(d: Date) {
  const idx = Math.floor(d.getTime() / 86_400_000);
  return { q: QUESTIONS[idx % QUESTIONS.length], key: dayKey(d) };
}

function QuestionPageInner() {
  const names = useStore((s) => s.names);
  const me = useOnline((s) => s.me);
  const setLast = useStore((s) => s.setLast);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"today" | "archive">("today");
  const { value: answers, save, loaded } = useShared<Answers>("daily", {});
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMounted(true);
    setLast("/together/question");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = useMemo(() => questionForDay(new Date()), []);
  const past = useMemo(() => {
    const out: { key: string; q: (typeof QUESTIONS)[number] }[] = [];
    for (let i = 1; i <= 60; i++) {
      const d = new Date(Date.now() - i * 86_400_000);
      out.push({ key: dayKey(d), q: questionForDay(d).q });
    }
    return out;
  }, []);

  if (!mounted || !loaded) return <Shell title="سؤال اليوم" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;

  const mine = answers[today.key] ?? {};
  const aDone = !!mine.a, bDone = !!mine.b;
  // كل واحد يجاوب من جواله حسب حسابه المسجل
  const mySide: "a" | "b" = me?.name === names.b ? "b" : "a";
  const myDone = mySide === "a" ? aDone : bDone;
  const revealed = aDone && bDone;
  const Icon = CAT_ICON[today.q.cat];

  const submit = (who: "a" | "b") => {
    if (!draft.trim()) return;
    save((p) => ({ ...p, [today.key]: { ...(p[today.key] ?? {}), [who]: draft.trim() } }));
    setDraft("");
    sfx.win();
  };
  const react = (who: "a" | "b", r: string) => {
    save((p) => ({ ...p, [today.key]: { ...(p[today.key] ?? {}), [who === "a" ? "reactB" : "reactA"]: r } }));
    sfx.pick();
  };
  const bookmark = (key: string) =>
    save((p) => ({ ...p, [key]: { ...(p[key] ?? {}), bookmarked: !p[key]?.bookmarked } }));

  const archive = past
    .filter((p) => !search || p.q.q.includes(search) || (answers[p.key]?.a ?? "").includes(search))
    .filter((p) => answers[p.key]?.a || answers[p.key]?.b);

  return (
    <Shell title="سؤال اليوم" action={<TopControls />}>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5">
        {(["today", "archive"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-xl py-2.5 text-sm font-bold ${view === v ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "text-muted"}`}>
            {v === "today" ? "اليوم" : "الأرشيف"}
          </button>
        ))}
      </div>

      {view === "today" && (
        <div className={card}>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-pink-400">
            <Icon className="h-4 w-4" /> {CAT_NAME[today.q.cat]}
          </div>
          <div className="mb-5 text-center text-xl font-black leading-relaxed">{today.q.q}</div>

          {!revealed && (
            <>
              <div className="mb-3 text-center text-sm text-muted">
                {aDone ? `${names.a} جاوبت ✓ — بانتظار ${names.b}` : bDone ? `${names.b} جاوب ✓ — بانتظار ${names.a}` : "جاوبوا بشكل منفصل، والإجابات ما تنشاف إلا بعد ما تجاوبون الاثنين"}
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="اكتب جوابك هنا"
                className="mb-3 w-full rounded-2xl border border-line bg-surface-2 p-3 outline-none focus:border-pink-400 select-text"
              />
              <div className="flex justify-center gap-2">
                <button className={btnPrimary} disabled={!draft.trim() || myDone} onClick={() => submit(mySide)}>أرسل جوابي</button>
              </div>
            </>
          )}

          {revealed && (
            <div className="space-y-3">
              <div className="text-center font-bold text-pink-400">الإجابات ظهرت!</div>
              {(["a", "b"] as const).map((w) => {
                const name = w === "a" ? names.a : names.b;
                const reactKey = w === "a" ? "reactA" : "reactB";
                return (
                  <div key={w} className="rounded-2xl border border-line bg-surface-2 p-4">
                    <div className="mb-1 text-xs font-bold text-muted">{name}</div>
                    <div className="leading-relaxed">{mine[w]}</div>
                    <div className="mt-3 flex gap-2">
                      {REACTS.map(({ id, Icon: RI }) => (
                        <button key={id} onClick={() => react(w === "a" ? "b" : "a", id)} className={`grid h-9 w-9 place-items-center rounded-xl border ${mine[reactKey] === id ? "border-pink-400 bg-pink-500/20" : "border-line"}`}>
                          <RI className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-center">
                <button className={btnGhost + " flex items-center gap-2"} onClick={() => bookmark(today.key)}>
                  <Bookmark className={`h-4 w-4 ${mine.bookmarked ? "fill-pink-500 text-pink-500" : ""}`} /> حفظ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === "archive" && (
        <div className="space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحثوا بالسؤال أو الجواب"
            className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-pink-400 select-text"
          />
          {archive.length === 0 && <p className="py-8 text-center text-muted">ما فيه أجوبة بعد</p>}
          {archive.map((p) => (
            <div key={p.key} className={card}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="font-bold">{p.q.q}</div>
                <button onClick={() => bookmark(p.key)} aria-label="حفظ">
                  <Bookmark className={`h-4 w-4 ${answers[p.key]?.bookmarked ? "fill-pink-500 text-pink-500" : "text-muted"}`} />
                </button>
              </div>
              <div className="space-y-1 text-sm text-muted">
                <div><span className="font-bold text-pink-400">{names.a}:</span> {answers[p.key]?.a ?? "—"}</div>
                <div><span className="font-bold text-pink-400">{names.b}:</span> {answers[p.key]?.b ?? "—"}</div>
              </div>
            </div>
          ))}
          <div className="flex justify-center text-xs text-muted"><ArchiveRestore className="mr-1 h-4 w-4" /> آخر 60 يوم</div>
        </div>
      )}
      <div className="mt-4 flex justify-center text-xs text-muted"><Check className="mr-1 h-3 w-3" /> الأسئلة تتغير كل يوم، وتوصلون لنفس السؤال من أي جهاز</div>
    </Shell>
  );
}

export default function QuestionPage() {
  return (
    <ClientOnly>
      <QuestionPageInner />
    </ClientOnly>
  );
}
