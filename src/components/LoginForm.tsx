"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { btnPrimary, card } from "./ui";
import { auth, db } from "@/lib/firebase";
import { useOnline } from "@/lib/online";
import { useStore } from "@/lib/store";

// نموذج الدخول: يظهر أول شي قبل الموقع، وإذا الحساب مسجل بدون اسم يطلب يختار الاسم
export function LoginForm() {
  const names = useStore((s) => s.names);
  const me = useOnline((s) => s.me);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [who, setWho] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const signedNoName = !!auth?.currentUser && !me;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setBusy(true);
    setErr("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await get(ref(db, `users/${cred.user.uid}`));
      if (!snap.exists()) {
        if (!who) {
          await signOut(auth);
          setErr("اختاروا اسمكم أول (هبة أو عمار)");
          return;
        }
        await set(ref(db, `users/${cred.user.uid}`), { name: who });
      }
      window.location.reload();
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "unknown";
      setErr(`تعذر الدخول (${code})`);
    } finally {
      setBusy(false);
    }
  };

  // حساب مسجل بدون اسم محفوظ
  const chooseName = async (n: string) => {
    if (!db || !auth?.currentUser) return;
    await set(ref(db, `users/${auth.currentUser.uid}`), { name: n });
    window.location.reload();
  };

  const pickButtons = (selected: string | null, onPick: (n: string) => void) => (
    <div className="grid grid-cols-2 gap-2">
      {[names.a, names.b].map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onPick(n)}
          className={`rounded-2xl border py-3 font-bold ${selected === n ? "border-pink-400 bg-pink-500/15" : "border-line bg-surface-2"}`}
        >
          {n}
        </button>
      ))}
    </div>
  );

  if (signedNoName) {
    return (
      <div className={`${card} space-y-4 text-center`}>
        <p className="text-sm text-muted">اختاروا اسمكم عشان نعرف مين أنتم</p>
        {pickButtons(null, chooseName)}
        <button className="text-sm text-muted" onClick={() => signOut(auth!)}>تسجيل خروج</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`${card} space-y-3`}>
      <div className="text-center text-sm text-muted">سجّلوا دخول عشان تشوفون الطرف الثاني وتلعبون سوا</div>
      <p className="text-center text-xs text-muted">إذا حسابك جديد، اختاروا اسمكم:</p>
      {pickButtons(who, setWho)}
      <input
        type="email"
        required
        placeholder="البريد"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-pink-400 select-text"
      />
      <input
        type="password"
        required
        placeholder="كلمة السر"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 outline-none focus:border-pink-400 select-text"
      />
      {err && <p className="text-sm text-rose-400">{err}</p>}
      <button className={`${btnPrimary} w-full`} disabled={busy}>{busy ? "جاري الدخول…" : "دخول"}</button>
    </form>
  );
}
