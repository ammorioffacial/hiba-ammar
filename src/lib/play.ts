"use client";

import { useEffect, useState } from "react";
import { ref, onValue, set, update, push, get, type DatabaseReference } from "firebase/database";
import { db } from "./firebase";

export type GameKey = "skribbl" | "quiz" | "words" | "battle";
export type Side = "a" | "b";
export interface Player { uid: string; name: string }
export interface Meta {
  game: GameKey;
  host: string;
  players: { a?: Player | null; b?: Player | null };
  createdAt: number;
}

export const PLAY_GAMES: { key: GameKey; name: string; desc: string; tone: string; mode: string }[] = [
  { key: "skribbl", name: "الرسم والتخمين", desc: "واحد يرسم والثاني يخمّن قبل الوقت", tone: "from-[#ff7fb6] to-[#c2185b]", mode: "رسم مباشر" },
  { key: "quiz", name: "سباق الأسئلة", desc: "أسئلة ثقافة، أسرع واحد يجاوب صح يكسب", tone: "from-[#c084fc] to-[#7e22ce]", mode: "سرعة وذكاء" },
  { key: "words", name: "سلسلة الكلمات", desc: "المدينة، الحيوان، النبات... آخر حرف يحدد الكلمة الجاية", tone: "from-[#fbbf24] to-[#db2777]", mode: "تفكير وسرعة" },
  { key: "battle", name: "معركة السفن", desc: "خبّي سفنك واضرب سفن الثاني قبله", tone: "from-[#22d3ee] to-[#2563eb]", mode: "استراتيجية" },
];

export const GAME_NAME: Record<GameKey, string> = {
  skribbl: "الرسم والتخمين",
  quiz: "سباق الأسئلة",
  words: "سلسلة الكلمات",
  battle: "معركة السفن",
};

export const sideOf = (meta: Meta | null | undefined, uid: string): Side | null => {
  if (!meta) return null;
  if (meta.players.a?.uid === uid) return "a";
  if (meta.players.b?.uid === uid) return "b";
  return null;
};
export const other = (s: Side): Side => (s === "a" ? "b" : "a");
export const nameOf = (meta: Meta | null | undefined, s: Side) => meta?.players[s]?.name ?? "—";

// تطبيع الكلمات العربية للمقارنة (بدون تشكيل، والألف والتاء المربوطة متساوية)
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

export async function createGame(game: GameKey, uid: string, name: string, init: object): Promise<string> {
  let code = String(1000 + Math.floor(Math.random() * 9000));
  for (let i = 0; i < 5; i++) {
    const s = await get(gref(code, "meta"));
    if (!s.exists()) break;
    code = String(1000 + Math.floor(Math.random() * 9000));
  }
  const meta: Meta = { game, host: uid, players: { a: { uid, name }, b: null }, createdAt: Date.now() };
  await set(gref(code, "meta"), meta);
  await set(gref(code, "state"), init);
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

// حالة اللعبة العامة (تتزامن للطرفين)
export function useRoom<S>(code: string) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [state, setState] = useState<S | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!db) return;
    const offMeta = onValue(gref(code, "meta"), (s) => {
      setMeta(s.val());
      setLoaded(true);
    }, () => setLoaded(true));
    const offState = onValue(gref(code, "state"), (s) => setState(s.val()));
    return () => { offMeta(); offState(); };
  }, [code]);
  return { meta, state, loaded };
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
