"use client";

import { signOut } from "firebase/auth";
import Link from "next/link";
import { Shell, TopControls } from "@/components/Shell";
import { LoginForm } from "@/components/LoginForm";
import { btnPrimary, card } from "@/components/ui";
import { auth, firebaseReady } from "@/lib/firebase";
import { useOnline } from "@/lib/online";

export default function LoginPage() {
  const me = useOnline((s) => s.me);

  if (!firebaseReady) {
    return (
      <Shell title="تسجيل الدخول" action={<TopControls />}>
        <div className={card}><p className="text-sm text-muted">الأونلاين يحتاج إعداد Firebase أولاً.</p></div>
      </Shell>
    );
  }

  return (
    <Shell title="تسجيل الدخول" action={<TopControls />}>
      {me ? (
        <div className={`${card} text-center`}>
          <p className="mb-4">أنت داخل كـ <span className="font-black text-pink-400">{me.name}</span></p>
          <div className="flex flex-col gap-3">
            <Link href="/" className={btnPrimary}>الرئيسية</Link>
            <button className="text-sm text-muted" onClick={() => signOut(auth!)}>تسجيل خروج</button>
          </div>
        </div>
      ) : (
        <LoginForm />
      )}
    </Shell>
  );
}
