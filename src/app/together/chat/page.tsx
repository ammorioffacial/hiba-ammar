"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Shell, TopControls } from "@/components/Shell";
import { btnPrimary, card, newId } from "@/components/ui";
import { db, firebaseReady } from "@/lib/firebase";
import { useShared } from "@/lib/shared";
import { useOnline } from "@/lib/online";
import { useStore } from "@/lib/store";
import { sfx, buzz } from "@/lib/sound";
import { PIN_COLORS } from "@/lib/together-data";
import { ref, push, onValue, query, limitToLast, update, set } from "firebase/database";
import {
  Send, Pin, PinOff, Heart, Smile, AlertCircle, Brain, ThumbsUp, Frown, Hand, Moon, Sun,
  Sparkles, Music, Cake, Gamepad2, PartyPopper, Plus, StickyNote, Check, X, type LucideIcon,
} from "lucide-react";

type Msg = { id: string; from: string; text?: string; sticker?: string; special?: "hug" | "miss" | "morning" | "night"; at: number; reactions?: Record<string, string> };
type Note = { id: string; text: string; color: string; pinned?: boolean; checklist?: { t: string; done: boolean }[] };

const REACTS: { id: string; Icon: LucideIcon }[] = [
  { id: "heart", Icon: Heart },
  { id: "laugh", Icon: Smile },
  { id: "surprised", Icon: AlertCircle },
  { id: "thinking", Icon: Brain },
  { id: "agree", Icon: ThumbsUp },
  { id: "sad", Icon: Frown },
];
const STICKERS: { set: string; items: { id: string; Icon: LucideIcon; color: string }[] }[] = [
  { set: "حب", items: [{ id: "h1", Icon: Heart, color: "bg-pink-500" }, { id: "h2", Icon: Sparkles, color: "bg-violet-500" }, { id: "h3", Icon: Sun, color: "bg-amber-400" }] },
  { set: "مرح", items: [{ id: "f1", Icon: PartyPopper, color: "bg-rose-500" }, { id: "f2", Icon: Music, color: "bg-cyan-500" }, { id: "f3", Icon: Cake, color: "bg-orange-400" }, { id: "f4", Icon: Gamepad2, color: "bg-indigo-500" }] },
  { set: "مزاج", items: [{ id: "m1", Icon: Smile, color: "bg-yellow-400" }, { id: "m2", Icon: Moon, color: "bg-slate-500" }, { id: "m3", Icon: Brain, color: "bg-emerald-500" }] },
];
const STICKER_MAP = Object.fromEntries(STICKERS.flatMap((s) => s.items.map((i) => [i.id, i])));
const SPECIALS: { id: NonNullable<Msg["special"]>; label: string; Icon: LucideIcon; text: string }[] = [
  { id: "hug", label: "حضن", Icon: Hand, text: "أرسلت لك حضن" },
  { id: "miss", label: "اشتقت لك", Icon: Heart, text: "اشتقت لك" },
  { id: "morning", label: "صباح الخير", Icon: Sun, text: "صباح الخير ☀" },
  { id: "night", label: "تصبح على خير", Icon: Moon, text: "تصبح على خير" },
];

export default function ChatPage() {
  const names = useStore((s) => s.names);
  const me = useOnline((s) => s.me);
  const setLast = useStore((s) => s.setLast);
  const { value: notes, save: saveNotes, loaded } = useShared<Record<string, Note>>("pinboard", {});
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"chat" | "pins">("chat");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [typing, setTyping] = useState<Record<string, number>>({});
  const [now, setNow] = useState(0);
  const lastTyping = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const myName = me?.name ?? names.a;
  const otherName = myName === names.a ? names.b : names.a;

  useEffect(() => {
    setMounted(true);
    setLast("/together/chat");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // الرسائل مباشرة من Firebase
  useEffect(() => {
    if (!firebaseReady || !db || !me) return;
    return onValue(query(ref(db, "chat/messages"), limitToLast(80)), (snap) => {
      const v = (snap.val() ?? {}) as Record<string, Omit<Msg, "id">>;
      setMsgs(Object.entries(v).map(([id, m]) => ({ id, ...m })).sort((a, b) => a.at - b.at));
    });
  }, [me?.uid]);

  // مؤشر الكتابة
  useEffect(() => {
    if (!firebaseReady || !db || !me) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    // القواعد تسمح بقراءة كل اسم لحاله، فنقرأ الاسمين بشكل منفصل
    const offs = [names.a, names.b].map((n) =>
      onValue(ref(db!, `typing/${n}`), (snap) => setTyping((d) => ({ ...d, [n]: snap.val() ?? 0 })))
    );
    return () => { clearInterval(t); offs.forEach((off) => off()); };
  }, [me?.uid]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  if (!mounted || !loaded) return <Shell title="الدردشة" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;

  if (!firebaseReady || !db) {
    return <Shell title="الدردشة" action={<TopControls />}><div className={card}><p className="text-sm text-muted">الدردشة تحتاج Firebase. انظروا إعدادات الأونلاين.</p></div></Shell>;
  }
  if (!me) {
    return <Shell title="الدردشة" action={<TopControls />}><div className={`${card} text-center`}><p className="mb-3 text-muted">سجّلوا دخول عشان تدردشون</p><a href="/login" className={btnPrimary}>تسجيل الدخول</a></div></Shell>;
  }

  const send = (payload: Omit<Msg, "id" | "from" | "at">) => {
    push(ref(db!, "chat/messages"), { from: myName, at: Date.now(), ...payload });
    sfx.click();
  };

  const sendText = () => {
    const t = text.trim();
    if (!t) return;
    send({ text: t });
    setText("");
    set(ref(db!, `typing/${myName}`), 0);
  };

  const onTyping = (v: string) => {
    setText(v);
    const t = Date.now();
    if (t - lastTyping.current > 2000) {
      lastTyping.current = t;
      set(ref(db!, `typing/${myName}`), t);
    }
  };

  const react = (m: Msg, r: string) => {
    const cur = m.reactions?.[myName];
    update(ref(db!, `chat/messages/${m.id}/reactions`), { [myName]: cur === r ? null : r });
    setReactFor(null);
    sfx.pick();
  };

  const otherTyping = typing[otherName] && now - typing[otherName] < 4000;
  const pinned = Object.values(notes).filter((n) => n.pinned);

  const addNote = (color: string) => {
    const id = newId();
    saveNotes((p) => ({ ...p, [id]: { id, text: "", color, checklist: [] } }));
  };

  return (
    <Shell title="الدردشة" action={<TopControls />}>
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5">
        {(["chat", "pins"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2.5 text-sm font-bold ${tab === t ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "text-muted"}`}>
            {t === "chat" ? "الرسائل" : `اللوحة (${Object.keys(notes).length})`}
          </button>
        ))}
      </div>

      {tab === "chat" && (
        <div className="flex flex-col" style={{ height: "calc(100dvh - 230px)", minHeight: 360 }}>
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${otherTyping ? "bg-emerald-400" : "bg-muted"}`} /> {otherName} {otherTyping ? "يكتب…" : ""}</span>
            <span>{names.a} و {names.b}</span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto rounded-3xl border border-line bg-surface p-3">
            {msgs.map((m) => {
              const mine = m.from === myName;
              const sticker = m.sticker ? STICKER_MAP[m.sticker] : undefined;
              const special = m.special ? SPECIALS.find((s) => s.id === m.special) : undefined;
              const reactions = Object.values(m.reactions ?? {}).filter(Boolean);
              return (
                <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                  <div className="relative max-w-[78%]">
                    <motion.button
                      onContextMenu={(e) => { e.preventDefault(); setReactFor(m.id); }}
                      onPointerDown={(e) => { if (e.pointerType === "touch") { const id = m.id; const t = setTimeout(() => setReactFor(id), 450); const up = () => { clearTimeout(t); window.removeEventListener("pointerup", up); }; window.addEventListener("pointerup", up); } }}
                      className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${mine ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "bg-surface-2"}`}
                    >
                      {sticker ? (
                        <span className={`grid h-16 w-16 place-items-center rounded-2xl ${sticker.color} text-white`}><sticker.Icon className="h-8 w-8" /></span>
                      ) : special ? (
                        <span className="flex items-center gap-2 font-bold"><special.Icon className="h-4 w-4" /> {special.text}</span>
                      ) : m.text}
                      <div className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>{new Date(m.at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</div>
                    </motion.button>
                    {reactions.length > 0 && (
                      <div className="absolute -bottom-2 right-2 flex gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-xs">
                        {reactions.map((r, i) => { const R = REACTS.find((x) => x.id === r)?.Icon ?? Heart; return <R key={i} className="h-3 w-3 text-pink-400" />; })}
                      </div>
                    )}
                    {reactFor === m.id && (
                      <div className="absolute z-20 mt-1 flex gap-1 rounded-2xl border border-line bg-surface-2 p-1.5 shadow-xl">
                        {REACTS.map(({ id, Icon }) => (
                          <button key={id} onClick={() => react(m, id)} className="grid h-8 w-8 place-items-center rounded-xl hover:bg-pink-500/20"><Icon className="h-4 w-4" /></button>
                        ))}
                        <button onClick={() => setReactFor(null)} className="grid h-8 w-8 place-items-center rounded-xl text-muted"><X className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottom} />
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {SPECIALS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => send({ special: id })} className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold"><Icon className="h-3.5 w-3.5 text-pink-400" /> {label}</button>
            ))}
          </div>

          {showStickers && (
            <div className="mt-2 space-y-2 rounded-2xl border border-line bg-surface p-3">
              {STICKERS.map((set) => (
                <div key={set.set}>
                  <div className="mb-1 text-[11px] font-bold text-muted">{set.set}</div>
                  <div className="flex gap-2">
                    {set.items.map((it) => (
                      <button key={it.id} onClick={() => { send({ sticker: it.id }); setShowStickers(false); }} className={`grid h-12 w-12 place-items-center rounded-2xl ${it.color} text-white`}><it.Icon className="h-6 w-6" /></button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => setShowStickers((v) => !v)} aria-label="ملصقات" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line bg-surface-2"><Sparkles className="h-5 w-5 text-pink-400" /></button>
            <input
              value={text}
              onChange={(e) => onTyping(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendText()}
              placeholder="اكتبوا رسالة"
              className="min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-pink-400 select-text"
            />
            <button onClick={sendText} aria-label="أرسل" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white"><Send className="h-5 w-5" /></button>
          </div>
        </div>
      )}

      {tab === "pins" && (
        <div className="space-y-4">
          {pinned.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted"><Pin className="h-3.5 w-3.5" /> مثبّت</div>
              <div className="grid grid-cols-2 gap-2">{pinned.map((n) => <NoteCard key={n.id} note={n} save={saveNotes} />)}</div>
            </div>
          )}
          <div>
            <div className="mb-2 text-xs font-bold text-muted">ملاحظة جديدة</div>
            <div className="mb-3 flex gap-2">
              {PIN_COLORS.map((c) => <button key={c} onClick={() => addNote(c)} aria-label="ملاحظة" style={{ background: c }} className="h-8 w-8 rounded-full border-2 border-white/30" />)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(notes).filter((n) => !n.pinned).map((n) => <NoteCard key={n.id} note={n} save={saveNotes} />)}
            </div>
            {Object.keys(notes).length === 0 && <p className="py-8 text-center text-muted"><StickyNote className="mx-auto mb-2 h-6 w-6" /> اللوحة فاضية. اختاروا لون واكتبوا ملاحظة</p>}
          </div>
        </div>
      )}
      <div className="hidden"><Check /><Plus /></div>
    </Shell>
  );
}

function NoteCard({ note, save }: { note: Note; save: (v: (p: Record<string, Note>) => Record<string, Note>) => void }) {
  const [t, setT] = useState(note.text);
  const set = (patch: Partial<Note>) => save((p) => ({ ...p, [note.id]: { ...p[note.id], ...patch } }));
  const del = () => save((p) => { const n = { ...p }; delete n[note.id]; return n; });
  return (
    <div className="rounded-2xl p-3 text-slate-900 shadow-md" style={{ background: note.color }}>
      <textarea
        value={t}
        onChange={(e) => setT(e.target.value)}
        onBlur={() => set({ text: t })}
        rows={4}
        placeholder="اكتبوا..."
        className="w-full resize-none bg-transparent text-sm outline-none select-text placeholder:text-slate-700/60"
      />
      <div className="mt-2 flex justify-between text-slate-900/70">
        <button onClick={() => set({ pinned: !note.pinned })} aria-label="ثبّت">{note.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}</button>
        <button onClick={del} aria-label="حذف"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
