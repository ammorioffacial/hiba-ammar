"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { startOnline, trackPage } from "@/lib/online";

// يشغّل الأونلاين ويتابع الصفحة الحالية
export function OnlineBoot() {
  const path = usePathname();

  useEffect(() => {
    startOnline();
  }, []);

  useEffect(() => {
    trackPage(path);
  }, [path]);

  return null;
}
