"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Flame, Lock, Trophy, Zap, Sparkles, Gamepad2, Star, Shield, Crown, Medal } from "lucide-react";
import { ACHIEVEMENTS, useStore } from "@/lib/store";
import { DAILY_POOL, GAMES } from "@/lib/games";
import { TopControls } from "@/components/Shell";
import { PresenceBoard } from "@/components/PresenceBoard";

const LOVE_LINES = [
  "اللعب معك أحلى من الفوز",
  "كل جولة معكم قصة تنحفظ",
  "الضحك يكفي وين ما تكونون",
  "الحب يحب اللعب الخفيف",
];

const BADGE_ICONS = [Crown, Flame, Star, Medal, Zap, Shield] as const;

function greeting(h: number) {
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء النور";
  if (h < 21) return "مساء الفل";
  return "ليلة سعيدة";
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [hour, setHour] = useState(12);
  useEffect(() => {
    // الوقت يُقرأ بعد التحميل في المتصفح فقط
    setDayIndex(Math.floor(Date.now() / 86_400_000));
    setHour(new Date().getHours());
    setMounted(true);
  }, []);

  const names = useStore((s) => s.names);
  const stats = useStore((s) => s.stats);
  const achievements = useStore((s) => s.achievements);
  const last = useStore((s) => s.last);
  const theme = useStore((s) => s.theme);

  // تحدي اليوم: لعبة تتغير كل يوم
  const daily = DAILY_POOL[dayIndex % DAILY_POOL.length];
  const loveLine = LOVE_LINES[dayIndex % LOVE_LINES.length];
  const lastGame = mounted && last ? GAMES.find((g) => g.href === last) : null;
  const unlockedCount = Object.keys(achievements).length;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-20" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}>
      <div className="mb-2 flex justify-end">
        <TopControls />
      </div>

      {/* ===== الترحيب والشعار ===== */}
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pb-6 pt-2 text-center">
        <div className="text-sm font-semibold text-muted">{greeting(hour)}</div>
        <h1 className="mt-1 font-script text-6xl leading-tight">
          <span className="bg-gradient-to-l from-pink-300 via-pink-500 to-rose-600 bg-clip-text text-transparent">
            {names.a}
          </span>
          <Heart className="mx-2 inline-block h-7 w-7 fill-pink-500 text-pink-500 animate-pulse" />
          <span className="bg-gradient-to-l from-pink-300 via-pink-500 to-rose-600 bg-clip-text text-transparent">
            {names.b}
          </span>
        </h1>
        <p className="mt-3 font-script text-xl text-blush">{loveLine}</p>
      </motion.header>

      {/* ===== من يلعب الحين ===== */}
      <div className="mb-4">
        <PresenceBoard />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Link href="/online" className="block rounded-2xl border border-line bg-surface-2 px-4 py-3 text-center font-bold">
            العبوا أونلاين
          </Link>
          <Link href="/together" className="block rounded-2xl border border-line bg-surface-2 px-4 py-3 text-center font-bold">
            سوا
          </Link>
        </div>
      </div>

      {/* ===== تحدي اليوم ===== */}
      <Link href={daily.href} className="block">
        <motion.div
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-pink-400 via-pink-500 to-rose-600 p-5 text-white shadow-[0_20px_50px_-20px_rgba(255,40,130,.6)]"
        >
          <Sparkles className="absolute -left-2 -top-2 h-28 w-28 opacity-15" />
          <div className="text-xs font-bold opacity-90">تحدي اليوم · نقاط مضاعفة</div>
          <div className="mt-1 text-2xl font-black">{daily.name}</div>
          <div className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold">العبوها الحين</div>
        </motion.div>
      </Link>

      {/* ===== كمّل من وين وقفتوا ===== */}
      {lastGame && (
        <Link href={lastGame.href} className="mt-3 flex items-center justify-between gap-3 rounded-3xl border border-line bg-surface p-4 backdrop-blur">
          <div>
            <div className="font-black">كمّلوا من وين وقفتوا</div>
            <div className="text-sm text-muted">{lastGame.name}</div>
          </div>
          <span className="rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-4 py-2 text-sm font-bold text-white">كمّل</span>
        </Link>
      )}

      {/* ===== الإحصائيات ===== */}
      <div className="mt-5 grid grid-cols-4 gap-2">
        <Stat label="فوز إكس أو" value={mounted ? stats.xoWins : 0} />
        <Stat label="أقل حركات" value={mounted && stats.memoBest !== null ? stats.memoBest : "—"} />
        <Stat label="أفضل رد فعل" value={mounted && stats.speedBest !== null ? `${stats.speedBest}` : "—"} />
        <Stat label="جولات لعب" value={mounted ? stats.plays : 0} />
      </div>

      {/* ===== الألعاب ===== */}
      <SectionTitle>الألعاب</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {GAMES.map((g, i) => {
          const body = (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={`relative flex min-h-[130px] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br ${g.tone} p-4 text-white shadow-lg ${g.status === "soon" ? "opacity-70" : ""}`}
            >
              <Gamepad2 className="absolute -left-3 -top-3 h-20 w-20 opacity-15" />
              <div>
                <div className="font-black leading-snug">{g.name}</div>
                <div className="mt-1 text-xs opacity-90">{g.desc}</div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-bold">{g.mode}</span>
                {g.status === "soon" && (
                  <span className="flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[11px] font-bold">
                    <Lock className="h-3 w-3" /> قريباً
                  </span>
                )}
              </div>
            </motion.div>
          );
          return g.status === "ready" ? (
            <Link key={g.id} href={g.href} className={g.id === "speed" ? "col-span-2" : ""}>
              {body}
            </Link>
          ) : (
            <div key={g.id}>{body}</div>
          );
        })}
      </div>

      {/* ===== الألقاب ===== */}
      <SectionTitle>
        الألقاب <span className="text-sm font-normal text-muted">({mounted ? unlockedCount : 0}/{ACHIEVEMENTS.length})</span>
      </SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {ACHIEVEMENTS.map((a, i) => {
          const Icon = BADGE_ICONS[i % BADGE_ICONS.length];
          const got = mounted && !!achievements[a.id];
          return (
            <div
              key={a.id}
              className={`rounded-2xl border border-line bg-surface p-3 text-center transition ${got ? "shadow-[0_0_0_1px_var(--pink)]" : "opacity-50 grayscale"}`}
            >
              <Icon className={`mx-auto h-7 w-7 ${got ? "text-pink-500" : "text-muted"}`} />
              <div className="mt-2 text-xs font-bold leading-snug">{a.name}</div>
              <div className="mt-1 text-[10px] leading-snug text-muted">{a.desc}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted">
        <Trophy className="h-3.5 w-3.5" />
        الوضع الحالي: {theme === "dark" ? "داكن" : "فاتح"}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-1 py-3 text-center">
      <div className="text-xl font-black text-pink-500">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted">{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-black">
      <span className="h-5 w-1 rounded-full bg-gradient-to-b from-pink-400 to-rose-600" />
      {children}
    </h2>
  );
}
