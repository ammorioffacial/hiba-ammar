"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db, firebaseReady } from "@/lib/firebase";
import { useOnline } from "@/lib/online";
import { useStore } from "@/lib/store";

type Presence = { online: boolean; game: string | null; at?: number };

// حالة الطرف الثاني: الحالة من Firebase مباشرة (Firebase يحدّثها لحاله عند انقطاع الاتصال)
export function PresenceBoard() {
  const names = useStore((s) => s.names);
  const me = useOnline((s) => s.me);
  const [data, setData] = useState<Record<string, Presence>>({});

  useEffect(() => {
    if (!firebaseReady || !db) return;
    return onValue(ref(db, "presence"), (snap) => setData(snap.val() ?? {}));
  }, []);

  if (!firebaseReady || !me) return null;

  const other = me.name === names.a ? names.b : names.a;
  const info = (n: string) => {
    const p = data[n];
    const online = p?.online === true;
    const seen = p?.at ? new Date(p.at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) : null;
    return { online, game: online ? p?.game ?? null : null, seen };
  };
  const o = info(other);
  const m = info(me.name);

  return (
    <div className="space-y-2">
      <div className={`flex items-center justify-between rounded-2xl border p-4 ${o.online ? "border-emerald-400/60 bg-emerald-500/10" : "border-line bg-surface"}`}>
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${o.online ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" : "bg-muted"}`} />
          <div>
            <div className="font-black">{other}</div>
            <div className="text-xs text-muted">
              {o.online ? (o.game ? `يلعب ${o.game} الحين` : "متصل الحين") : o.seen ? `آخر ظهور ${o.seen}` : "غير متصل"}
            </div>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${o.online ? "bg-emerald-500/20 text-emerald-400" : "bg-surface-2 text-muted"}`}>
          {o.online ? "متصل" : "غير متصل"}
        </span>
      </div>
      <div className="text-center text-[11px] text-muted">
        أنت ({me.name}): {m.online ? "متصل" : "غير متصل"}
      </div>
    </div>
  );
}
