"use client";

import { useEffect, useState } from "react";

// يرسم الأبناء بعد التحميل في المتصفح فقط (للصفحات اللي تعتمد على الوقت أو التخزين المحلي)
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="py-10 text-center text-muted">جاري التحميل…</div>;
  return <>{children}</>;
}
