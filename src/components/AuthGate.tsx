"use client";

import { useEffect, useState } from "react";
import { firebaseReady } from "@/lib/firebase";
import { useOnline } from "@/lib/online";
import { LoginForm } from "./LoginForm";
import { card } from "./ui";

// الموقع ما يفتح إلا بعد تسجيل الدخول (إذا Firebase مفعّل)
export function AuthGate({ children }: { children: React.ReactNode }) {
  const me = useOnline((s) => s.me);
  const authReady = useOnline((s) => s.authReady);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!firebaseReady) return <>{children}</>;

  if (!mounted || !authReady) {
    return <div className="grid min-h-[60vh] place-items-center text-muted">جاري التحميل…</div>;
  }

  if (!me) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-10 pb-10">
        <div className="mb-6 text-center font-script text-5xl text-pink-400">هبة وعمار</div>
        <LoginForm />
        <p className={`${card} mt-4 text-center text-xs text-muted`}>الحسابات تنعمل من Firebase Console</p>
      </div>
    );
  }

  return <>{children}</>;
}
