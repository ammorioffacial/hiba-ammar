"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set, update, push, get, type DatabaseReference } from "firebase/database";
import { db } from "./firebase";
import { QUIZ_QUESTIONS } from "./game-data";

export type GameKey = "xo" | "skribbl" | "quiz" | "words" | "battle";
export type Side = "a" | "b";
export interface Player { uid: string; name: string }
// الغرفة: اللاعبين + اللعبة الحالية. كل لعبة لها حالتها الخاصة تحت "الكود_اسمها"
export interface Meta {
  host: string;
  players: { a?: Player | null; b?: Player | null };
  active?: GameKey | null;
  createdAt: number;
}

export const PLAY_GAMES: { key: GameKey; name: string; desc: string; tone: string }[] = [
  { key: "xo", name: "إكس أو", desc: "ثلاث بثلاث، أسرع من يسبق يكسب", tone: "from-[#ff7fb6] to-[#c2185b]" },
  { key: "skribbl", name: "الرسم والتخمين", desc: "واحد يرسم والثاني يخمّن قبل الوقت", tone: "from-[#f472b6] to-[#9d174d]" },
  { key: "quiz", name: "سباق الأسئلة", desc: "أسئلة ثقافة، أسرع إجابة صحيحة تكسب", tone: "from-[#c084fc] to-[#7e22ce]" },
  { key: "words", name: "سلسلة الكلمات", desc: "آخر حرف يحدد الكلمة الجاية", tone: "from-[#fbbf24] to-[#db2777]" },
  { key: "battle", name: "معركة السفن", desc: "اضرب سفن الثاني قبل ما يضرب سفنك", tone: "from-[#22d3ee] to-[#2563eb]" },
];

export const GAME_NAME: Record<GameKey, string> = {
  xo: "إكس أو",
  skribbl: "الرسم والتخمين",
  quiz: "سباق الأسئلة",
  words: "سلسلة الكلمات",
  battle: "معركة السفن",
};

// الحالة الأولية لكل لعبة (تُكتب أول ما تختارونها)
export function initFor(game: GameKey, cat?: string): object {
  if (game === "xo") return { board: Array(9).fill(""), turn: "X", win: null, line: null, sc: { a: 0, b: 0, d: 0 } };
  if (game === "skribbl") return { phase: "wait", round: 0, rounds: 4, drawer: "a", scores: { a: 0, b: 0 } };
  if (game === "quiz") {
    const qs = shuffle(QUIZ_QUESTIONS).slice(0, 8).map((x) => ({ q: x.q, o: x.o, a: x.a }));
    return { phase: "wait", i: 0, qs, ans: null, sc: { a: 0, b: 0 }, reveal: null };
  }
  if (game === "words") return { phase: "wait", cat: cat ?? "مدينة", turn: "a", out: null, challenge: null };
  return { phase: "wait", ready: { a: false, b: false }, turn: null, pending: null, winner: null };
}

export const sideOf = (meta: Meta | null | undefined, uid: string): Side | null => {
  if (!meta) return null;
  if (meta.players.a?.uid === uid) return "a";
  if (meta.players.b?.uid === uid) return "b";
  return null;
};
export const other = (s: Side): Side => (s === "a" ? "b" : "a");
export const nameOf = (meta: Meta | null | undefined, s: Side) => meta?.players[s]?.name ?? "—";

// مسار حالة اللعبة داخل الغرفة
export const subCode = (code: string, game: GameKey) => `${code}_${game}`;

// تطبيع الكلمات العربية للمقارنة
export const normAr = (s: string) =>
  s
    .trim()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase();

export const shuffle = <T,>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const gref = (code: string, sub: string): DatabaseReference => ref(db!, `games/${code}/${sub}`);

// إنشاء غرفة جديدة وإرجاع الكود
export async function createRoom(uid: string, name: string): Promise<string> {
  let code = String(1000 + Math.floor(Math.random() * 9000));
  for (let i = 0; i < 5; i++) {
    const s = await get(gref(code, "meta"));
    if (!s.exists()) break;
    code = String(1000 + Math.floor(Math.random() * 9000));
  }
  const meta: Meta = { host: uid, players: { a: { uid, name }, b: null }, active: null, createdAt: Date.now() };
  await set(gref(code, "meta"), meta);
  return code;
}

export async function joinGame(code: string, uid: string, name: string): Promise<"ok" | "full" | "missing"> {
  const snap = await get(gref(code, "meta"));
  if (!snap.exists()) return "missing";
  const meta = snap.val() as Meta;
  if (sideOf(meta, uid)) return "ok";
  if (meta.players.b) return "full";
  await update(gref(code, "meta/players"), { b: { uid, name } });
  return "ok";
}

export const setActive = (code: string, game: GameKey) => update(gref(code, "meta"), { active: game });

// بيانات الغرفة (اللاعبين واللعبة الحالية)
export function useMeta(code: string) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!db) return;
    return onValue(gref(code, "meta"), (s) => {
      setMeta(s.val());
      setLoaded(true);
    }, () => setLoaded(true));
  }, [code]);
  return { meta, loaded };
}

// حالة لعبة داخل الغرفة
export function useRoom<S>(code: string) {
  const [state, setState] = useState<S | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!db) return;
    return onValue(gref(code, "state"), (s) => {
      setState(s.val());
      setLoaded(true);
    }, () => setLoaded(true));
  }, [code]);
  return { state, loaded };
}

// قائمة متزامنة (رسومات، رسائل، كلمات) مرتبة حسب الوقت
export function useCollection<T extends object>(code: string, sub: string) {
  const [items, setItems] = useState<(T & { id: string })[]>([]);
  useEffect(() => {
    if (!db) return;
    return onValue(gref(code, sub), (s) => {
      const v = (s.val() ?? {}) as Record<string, T>;
      setItems(Object.entries(v).map(([id, x]) => ({ id, ...x })));
    }, () => setItems([]));
  }, [code, sub]);
  return items;
}

// أسرار اللاعب (الكلمة، ترتيب السفن): يقرأها هو فقط حسب القواعد
export function useSecret<T>(code: string, uid: string | null) {
  const [v, setV] = useState<T | null>(null);
  useEffect(() => {
    if (!db || !uid) return;
    return onValue(gref(code, `secret/${uid}`), (s) => setV(s.val()), () => setV(null));
  }, [code, uid]);
  return v;
}

export const patchState = (code: string, patch: object) => update(gref(code, "state"), patch);
export const setStateAll = (code: string, value: object) => set(gref(code, "state"), value);
export const addTo = (code: string, sub: string, value: object) => push(gref(code, sub), value);
export const setSecret = (code: string, uid: string, value: object) => set(gref(code, `secret/${uid}`), value);
export const clearSub = (code: string, sub: string) => set(gref(code, sub), null);
