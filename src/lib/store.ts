"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Colors } from "./coloring/templates";

export type Theme = "dark" | "light";

export const ACHIEVEMENTS = [
  { id: "xo1", name: "ملك إكس أو", desc: "فوز واحد في إكس أو" },
  { id: "streak5", name: "سلسلة الانتصار", desc: "5 انتصارات متتالية في إكس أو" },
  { id: "memo12", name: "عين الصقر", desc: "الذاكرة في 12 حركة أو أقل" },
  { id: "rps3", name: "قارئ الأيدي", desc: "3 فوزات في حجر ورقة مقص" },
  { id: "speed200", name: "سريع البرق", desc: "رد فعل أقل من 200 ms" },
  { id: "plays10", name: "عشاق الألعاب", desc: "10 جولات لعب" },
  { id: "art1", name: "أول تحفة", desc: "أكملوا أول رسمة تلوين" },
  { id: "harmony", name: "تناغم الألوان", desc: "أكثر من 10 ألوان في رسمة" },
  { id: "speedart", name: "فنان سريع", desc: "أكملوا رسمة بأقل من 3 دقايق" },
  { id: "perfect", name: "الكمال", desc: "أكملوا رسمة معقدة (50 منطقة أو أكثر)" },
  { id: "daily7", name: "رسام يومي", desc: "لونوا 7 أيام متتالية" },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"];

export interface Stats {
  xoWins: number;
  xoStreak: number;
  memoBest: number | null;
  rpsWins: number;
  speedBest: number | null;
  plays: number;
}

export interface Artwork {
  colors: Colors;
  regions: number;
  completedAt?: string;
  colorsUsed?: number;
  seconds?: number;
  points?: number;
}

export interface ColoringState {
  drawings: Record<string, Artwork>;
  streak: number;
  lastDay: string | null;
}

const DEFAULT_STATS: Stats = {
  xoWins: 0,
  xoStreak: 0,
  memoBest: null,
  rpsWins: 0,
  speedBest: null,
  plays: 0,
};

const DEFAULT_COLORING: ColoringState = { drawings: {}, streak: 0, lastDay: null };

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

interface AppState {
  names: { a: string; b: string };
  theme: Theme;
  sound: boolean;
  stats: Stats;
  achievements: Partial<Record<AchievementId, string>>;
  last: string | null;
  counters: Record<string, number>;
  points: number;
  coloring: ColoringState;

  incr: (key: string, by?: number) => void;
  setTheme: (t: Theme) => void;
  toggleSound: () => void;
  setLast: (href: string) => void;
  recordPlay: () => void;
  recordXo: (won: boolean) => void;
  recordMemo: (moves: number) => void;
  recordRps: (won: boolean) => void;
  recordSpeed: (ms: number) => void;
  saveArt: (id: string, colors: Colors, regions: number) => void;
  completeArt: (
    id: string,
    info: { seconds: number; colorsUsed: number; regions: number; points: number }
  ) => void;
  unlock: (id: AchievementId) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      const unlock = (id: AchievementId) => {
        if (get().achievements[id]) return;
        set((s) => ({ achievements: { ...s.achievements, [id]: new Date().toISOString() } }));
        window.dispatchEvent(new CustomEvent<AchievementId>("achievement", { detail: id }));
      };

      // سلسلة الأيام: تُحدَّث عند أي نشاط تلوين في اليوم
      const touchDay = (): number => {
        const today = dayKey(new Date());
        const yesterday = dayKey(new Date(Date.now() - 864e5));
        const c = get().coloring;
        if (c.lastDay === today) return c.streak;
        const streak = c.lastDay === yesterday ? c.streak + 1 : 1;
        set((s) => ({ coloring: { ...s.coloring, streak, lastDay: today } }));
        return streak;
      };

      return {
        names: { a: "هبة", b: "عمار" },
        theme: "dark",
        sound: true,
        stats: DEFAULT_STATS,
        achievements: {},
        last: null,
        counters: {},
        points: 0,
        coloring: DEFAULT_COLORING,

        incr: (key, by = 1) =>
          set((s) => ({ counters: { ...s.counters, [key]: (s.counters[key] ?? 0) + by } })),
        setTheme: (theme) => set({ theme }),
        toggleSound: () => set((s) => ({ sound: !s.sound })),
        setLast: (last) => set({ last }),

        recordPlay: () => {
          set((s) => ({ stats: { ...s.stats, plays: s.stats.plays + 1 } }));
          if (get().stats.plays >= 10) unlock("plays10");
        },

        recordXo: (won) => {
          const streak = won ? get().stats.xoStreak + 1 : 0;
          set((s) => ({
            stats: { ...s.stats, xoWins: s.stats.xoWins + (won ? 1 : 0), xoStreak: streak },
          }));
          if (won) unlock("xo1");
          if (streak >= 5) unlock("streak5");
        },

        recordMemo: (moves) => {
          const best = get().stats.memoBest;
          if (best === null || moves < best) {
            set((s) => ({ stats: { ...s.stats, memoBest: moves } }));
          }
          if (moves <= 12) unlock("memo12");
        },

        recordRps: (won) => {
          if (!won) return;
          set((s) => ({ stats: { ...s.stats, rpsWins: s.stats.rpsWins + 1 } }));
          if (get().stats.rpsWins >= 3) unlock("rps3");
        },

        recordSpeed: (ms) => {
          const best = get().stats.speedBest;
          if (best === null || ms < best) {
            set((s) => ({ stats: { ...s.stats, speedBest: ms } }));
          }
          if (ms < 200) unlock("speed200");
        },

        saveArt: (id, colors, regions) => {
          const streak = touchDay();
          set((s) => ({
            coloring: {
              ...s.coloring,
              drawings: { ...s.coloring.drawings, [id]: { ...s.coloring.drawings[id], colors, regions } },
            },
          }));
          if (streak >= 7) unlock("daily7");
        },

        completeArt: (id, info) => {
          set((s) => ({
            points: s.points + info.points,
            coloring: {
              ...s.coloring,
              drawings: {
                ...s.coloring.drawings,
                [id]: {
                  ...s.coloring.drawings[id],
                  colors: s.coloring.drawings[id]?.colors ?? {},
                  regions: info.regions,
                  colorsUsed: info.colorsUsed,
                  seconds: info.seconds,
                  points: info.points,
                  completedAt: new Date().toISOString(),
                },
              },
            },
          }));
          unlock("art1");
          if (info.colorsUsed > 10) unlock("harmony");
          if (info.seconds < 180) unlock("speedart");
          if (info.regions >= 50) unlock("perfect");
        },

        unlock,
      };
    },
    {
      name: "hiba-ammar-v1",
      // يدمج البيانات القديمة مع الحقول الجديدة (مثل coloring) بدون ما يمسح شي
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<AppState>) }),
    }
  )
);
