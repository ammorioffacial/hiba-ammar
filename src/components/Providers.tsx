"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { ACHIEVEMENTS, useStore, type AchievementId } from "@/lib/store";
import { OnlineBoot } from "@/components/OnlineBoot";

export function celebrate(count = 120) {
  confetti({
    particleCount: count,
    spread: 90,
    origin: { y: 0.6 },
    colors: ["#ff5fa2", "#ff8cc0", "#ffd166", "#ffffff", "#f472b6", "#c084fc"],
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme);
  const [current, setCurrent] = useState<AchievementId | null>(null);

  // تطبيق الثيم على الصفحة
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // إشعار اللقب الجديد
  useEffect(() => {
    const onAch = (e: Event) => {
      setCurrent((e as CustomEvent<AchievementId>).detail);
      celebrate(90);
      setTimeout(() => setCurrent(null), 3000);
    };
    window.addEventListener("achievement", onAch);
    return () => window.removeEventListener("achievement", onAch);
  }, []);

  const badge = ACHIEVEMENTS.find((a) => a.id === current);

  return (
    <>
      <OnlineBoot />
      {children}
      <AnimatePresence>
        {badge && (
          <motion.div
            key={badge.id}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-5 py-3 font-bold text-white shadow-2xl"
          >
            <Trophy className="h-6 w-6" />
            <div>
              <div className="text-xs opacity-90">لقب جديد!</div>
              <div>{badge.name}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
