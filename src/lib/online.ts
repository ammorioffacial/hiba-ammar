"use client";

import { create } from "zustand";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, set, update, onValue, onDisconnect, serverTimestamp } from "firebase/database";
import { auth, db, firebaseReady } from "./firebase";
import { GAMES } from "./games";

export interface Me {
  uid: string;
  name: string; // "هبة" أو "عمار"
}

interface OnlineState {
  me: Me | null;
  authReady: boolean;
}

export const useOnline = create<OnlineState>(() => ({ me: null, authReady: false }));

let started = false;
let unsubConn: (() => void) | null = null;
let currentGame: string | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;

// اسم اللعبة من الرابط، عشان يظهر "عمار يلعب إكس أو"
function gameFromPath(path: string): string | null {
  if (path.startsWith("/online")) return "إكس أو (أونلاين)";
  const g = GAMES.find((x) => x.href !== "#" && path === x.href);
  return g?.name ?? null;
}

function attachPresence(name: string) {
  if (!db) return;
  const p = ref(db, `presence/${name}`);
  unsubConn?.();
  if (heartbeat) clearInterval(heartbeat);
  unsubConn = onValue(ref(db, ".info/connected"), (snap) => {
    if (snap.val() !== true) return;
    // لما ينقطع الاتصال يصير غير متصل تلقائياً
    onDisconnect(p).set({ online: false, game: null, at: serverTimestamp() });
    set(p, { online: true, game: currentGame, at: serverTimestamp() });
  });
  // إشارة تتحدث كل دقيقة، فأي حالة قديمة تصير "غير متصل" تلقائياً
  heartbeat = setInterval(() => {
    if (useOnline.getState().me) update(p, { at: serverTimestamp() });
  }, 60_000);
}

export function startOnline() {
  if (started || !firebaseReady || !auth || !db) return;
  started = true;
  onAuthStateChanged(auth, async (user) => {
    if (!user || !db) {
      useOnline.setState({ me: null, authReady: true });
      return;
    }
    const snap = await get(ref(db, `users/${user.uid}`));
    const name = snap.val()?.name as string | undefined;
    useOnline.setState({ me: name ? { uid: user.uid, name } : null, authReady: true });
    if (name) attachPresence(name);
  });
}

// يُستدعى مع كل تغيير صفحة
export function trackPage(path: string) {
  currentGame = gameFromPath(path);
  const me = useOnline.getState().me;
  if (db && me) update(ref(db, `presence/${me.name}`), { game: currentGame, at: serverTimestamp() });
}
