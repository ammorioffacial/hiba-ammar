"use client";

import { ClientOnly } from "@/components/ClientOnly";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shell, TopControls } from "@/components/Shell";
import { btnPrimary, btnGhost, card, shuffle } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { SURPRISE_MESSAGES, SURPRISE_COUPONS } from "@/lib/together-data";
import { useShared } from "@/lib/shared";
import { useStore, dayKey } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { Gift, Package, Sparkles, Ticket, Heart, Star, Clock, Check } from "lucide-react";

type BoxKind = "daily" | "three" | "weekly";
interface Coupon { id: string; text: string; at: string; redeemed?: boolean; expires: string }
interface Shared { opened: Record<string, string>; coupons: Record<string, Coupon>; messages: string[] }
const EMPTY: Shared = { opened: {}, coupons: {}, messages: [] };

const BOXES: { id: BoxKind; name: string; Icon: typeof Gift; color: string }[] = [
  { id: "daily", name: "صندوق يومي", Icon: Package, color: "from-pink-500 to-rose-600" },
  { id: "three", name: "صندوق 3 أيام", Icon: Gift, color: "from-violet-500 to-fuchsia-600" },
  { id: "weekly", name: "صندوق الأسبوع", Icon: Star, color: "from-amber-400 to-orange-600" },
];

function streakDays(days: Record<string, number>) {
  let n = 0;
  const d = new Date();
  while (days[dayKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function SurprisePageInner() {
  const days = useStore((s) => s.days);
  const setLast = useStore((s) => s.setLast);
  const { value, save, loaded } = useShared<Shared>("surprise", EMPTY);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"boxes" | "wallet">("boxes");
  const [shaking, setShaking] = useState<BoxKind | null>(null);
  const [reward, setReward] = useState<{ kind: "msg" | "coupon"; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    setLast("/together/surprise");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = dayKey(new Date());
  const streak = useMemo(() => streakDays(days), [days]);
  const weekDays = useMemo(() => {
    let n = 0;
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      if (days[dayKey(d)]) n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [days]);
  const isSunday = new Date().getDay() === 0;

  if (!mounted || !loaded) return <Shell title="صندوق المفاجآت" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;

  // شروط كل صندوق
  const status = (k: BoxKind): { ok: boolean; text: string; lastOpened?: string } => {
    const last = value.opened[k];
    if (k === "daily") {
      const ok = !!days[today] && last !== today;
      return { ok, text: ok ? "جاهز! افتحوه" : last === today ? "فتحتوه اليوم، ارجعوا بكرة" : "العبوا جولة اليوم عشان يفتح", lastOpened: last };
    }
    if (k === "three") {
      const ok = streak >= 3 && (!last || dayKey(new Date(Date.now() - 2 * 864e5)) >= last);
      return { ok, text: ok ? "جاهز! افتحوه" : `${Math.min(streak, 3)}/3 أيام متتالية`, lastOpened: last };
    }
    const ok = isSunday && weekDays >= 5 && (!last || last < dayKey(new Date(Date.now() - 6 * 864e5)));
    return { ok, text: ok ? "جاهز! افتحوه اليوم" : `يفتح يوم الأحد إذا لعبتوا 5 أيام (${weekDays}/5)`, lastOpened: last };
  };

  const open = async (k: BoxKind) => {
    if (!status(k).ok) return;
    setShaking(k);
    sfx.click();
    await new Promise((r) => setTimeout(r, 900));
    setShaking(null);
    const roll = Math.random();
    const isCoupon = k === "weekly" || (k === "three" && roll < 0.6) || (k === "daily" && roll < 0.25);
    if (isCoupon) {
      const text = shuffle(SURPRISE_COUPONS)[0];
      const id = Math.random().toString(36).slice(2, 10);
      const expires = new Date(Date.now() + 30 * 864e5).toISOString();
      save((p) => ({ ...p, opened: { ...p.opened, [k]: today }, coupons: { ...p.coupons, [id]: { id, text, at: new Date().toISOString(), expires } } }));
      setReward({ kind: "coupon", text });
    } else {
      const text = shuffle(SURPRISE_MESSAGES)[0];
      save((p) => ({ ...p, opened: { ...p.opened, [k]: today }, messages: [text, ...p.messages].slice(0, 50) }));
      setReward({ kind: "msg", text });
    }
    sfx.win();
    celebrate(90);
  };

  const redeem = (id: string) => save((p) => ({ ...p, coupons: { ...p.coupons, [id]: { ...p.coupons[id], redeemed: true } } }));

  const coupons = Object.values(value.coupons).sort((a, b) => b.at.localeCompare(a.at));
  const available = coupons.filter((c) => !c.redeemed && new Date(c.expires).getTime() > Date.now());

  return (
    <Shell title="صندوق المفاجآت" action={<TopControls />}>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5">
        {(["boxes", "wallet"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2.5 text-sm font-bold ${tab === t ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "text-muted"}`}>
            {t === "boxes" ? "الصناديق" : `محفظتي (${available.length})`}
          </button>
        ))}
      </div>

      {tab === "boxes" && (
        <div className="space-y-3">
          {BOXES.map(({ id, name, Icon, color }) => {
            const st = status(id);
            return (
              <div key={id} className={`${card} flex items-center gap-4 p-4`}>
                <motion.button
                  onClick={() => open(id)}
                  disabled={!st.ok}
                  animate={shaking === id ? { rotate: [0, -8, 8, -8, 8, 0] } : st.ok ? { scale: [1, 1.05, 1] } : {}}
                  transition={st.ok && shaking !== id ? { repeat: Infinity, duration: 2 } : { duration: 0.6 }}
                  className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg disabled:opacity-40`}
                >
                  <Icon className="h-7 w-7" />
                </motion.button>
                <div className="min-w-0 flex-1">
                  <div className="font-black">{name}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                    {st.ok ? <Sparkles className="h-3 w-3 text-pink-400" /> : <Clock className="h-3 w-3" />} {st.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="text-center text-xs text-muted">الصناديق تفتح بشروط تحددها أيام اللعب</div>
        </div>
      )}

      {tab === "wallet" && (
        <div className="space-y-3">
          {available.map((c) => (
            <div key={c.id} className={`${card} flex items-center gap-3 p-4`}>
              <Ticket className="h-6 w-6 shrink-0 text-pink-400" />
              <div className="min-w-0 flex-1">
                <div className="font-bold">{c.text}</div>
                <div className="text-xs text-muted">ينتهي {new Date(c.expires).toLocaleDateString("ar")}</div>
              </div>
              <button onClick={() => redeem(c.id)} className={`${btnGhost} text-xs`}>استخدمت</button>
            </div>
          ))}
          {coupons.filter((c) => c.redeemed).length > 0 && (
            <div className="pt-2 text-xs font-bold text-muted">المستخدمة</div>
          )}
          {coupons.filter((c) => c.redeemed).map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-2xl border border-line p-3 text-sm text-muted line-through">
              <Check className="h-4 w-4" /> {c.text}
            </div>
          ))}
          {value.messages.length > 0 && (
            <>
              <div className="pt-2 text-xs font-bold text-muted">رسائل حلوة</div>
              {value.messages.slice(0, 10).map((m, i) => (
                <div key={i} className="flex items-center gap-2 rounded-2xl bg-black/20 p-3 text-sm"><Heart className="h-4 w-4 shrink-0 text-pink-400" /> {m}</div>
              ))}
            </>
          )}
          {available.length === 0 && value.messages.length === 0 && <p className="py-8 text-center text-muted">المحفظة فاضية. افتحوا صندوق</p>}
        </div>
      )}

      <AnimatePresence>
        {reward && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-6" onClick={() => setReward(null)}>
            <motion.div initial={{ rotateY: 90, scale: 0.8 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: "spring" }} className={`${card} w-full max-w-sm text-center`} onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 text-xs font-bold text-pink-400">{reward.kind === "coupon" ? "كوبون جديد في محفظتكم" : "رسالة لكم"}</div>
              <div className="text-xl font-black leading-relaxed">{reward.text}</div>
              <button className={`${btnPrimary} mt-5`} onClick={() => setReward(null)}>حلو</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

export default function SurprisePage() {
  return (
    <ClientOnly>
      <SurprisePageInner />
    </ClientOnly>
  );
}
