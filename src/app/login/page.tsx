"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { Shell, TopControls } from "@/components/Shell";
import { btnPrimary, card } from "@/components/ui";
import { auth, db, firebaseReady } from "@/lib/firebase";
import { useOnline } from "@/lib/online";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const names = useStore((s) => s.names);
  const me = useOnline((s) => s.me);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [who, setWho] = useState<string | null>(null); // ما فيه اختيار افتراضي، لازم تختارون
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Firebase يشتغل بس في المتصفح، فننتظر التحميل عشان ما يصير اختلاف بين السيرفر والمتصفح
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Shell title="تسجيل الدخول" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;
  }

  if (!firebaseReady || !auth || !db) {
    return (
      <Shell title="تسجيل الدخول" action={<TopControls />}>
        <div className={card}>
          <p className="text-sm text-muted">الأونلاين يحتاج إعداد Firebase أولاً. انظروا ملف README.</p>
        </div>
      </Shell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const cred = await signInWithEmailAndPassword(auth!, email.trim(), password);
      // الاسم المحفوظ للحساب له الأولوية. إذا الحساب جديد لازم تختارون الاسم
      const snap = await get(ref(db!, `users/${cred.user.uid}`));
      if (!snap.exists()) {
        if (!who) {
          await signOut(auth!);
          setErr("اختاروا اسمكم أول (هبة أو عمار)");
          return;
        }
        await set(ref(db!, `users/${cred.user.uid}`), { name: who });
      }
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "unknown";
      setErr(`تعذر الدخول (${code})`);
    } finally {
      setBusy(false);
    }
  };

  if (me) {
    return (
      <Shell title="تسجيل الدخول" action={<TopControls />}>
        <div className={`${card} text-center`}>
          <p className="mb-4">أنت داخل كـ <span className="font-black text-pink-400">{me.name}</span></p>
          <p className="mb-2 text-xs text-muted">إذا الاسم غلط، اختاروا الاسم الصحيح:</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {[names.a, names.b].map((n) => (
              <button
                key={n}
                onClick={async () => {
                  if (!db || !auth?.currentUser || n === me.name) return;
                  await set(ref(db, `users/${auth.currentUser.uid}`), { name: n });
                  window.location.reload();
                }}
                className={`rounded-2xl border py-2.5 font-bold ${me.name === n ? "border-pink-400 bg-pink-500/15" : "border-line bg-surface-2"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/online" className={btnPrimary}>العبوا أونلاين</Link>
            <button className="text-sm text-muted" onClick={() => signOut(auth!)}>خروج</button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="تسجيل الدخول" action={<TopControls />}>
      <form onSubmit={submit} className={`${card} space-y-3`}>
        <div className="grid grid-cols-2 gap-2">
          {[names.a, names.b].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setWho(n)}
              className={`rounded-2xl border py-3 font-bold ${who === n ? "border-pink-400 bg-pink-500/15" : "border-line bg-surface-2"}`}
            >
              {n}
            </button>
          ))}
        </div>
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
    </Shell>
  );
}
