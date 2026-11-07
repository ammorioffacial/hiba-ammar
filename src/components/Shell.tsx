"use client";

import Link from "next/link";
import { ArrowRight, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";

// الهيدر المشترك: زر رجوع + عنوان + أزرار الوضع والصوت
export function Shell({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-16 pt-4" style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}>
      <header className="mb-5 flex items-center justify-between gap-2">
        <Link
          href="/"
          onClick={() => sfx.click()}
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-2 text-sm font-bold"
        >
          <ArrowRight className="h-4 w-4" />
          الرئيسية
        </Link>
        <h1 className="text-lg font-black">{title}</h1>
        <div className="flex items-center gap-2">{action}</div>
      </header>
      {children}
    </div>
  );
}

export function TopControls() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const ThemeIcon = theme === "dark" ? Sun : Moon;

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="الصوت"
        onClick={toggleSound}
        className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface-2"
      >
        {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </button>
      <button
        aria-label="تغيير الوضع"
        onClick={() => {
          sfx.click();
          setTheme(theme === "dark" ? "light" : "dark");
        }}
        className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface-2"
      >
        <ThemeIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
