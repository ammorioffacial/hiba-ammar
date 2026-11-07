"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db, firebaseReady } from "@/lib/firebase";
import { useOnline } from "@/lib/online";
import { useStore } from "@/lib/store";

type Presence = { online: boolean; game: string | null; at?: number };

// حالة الطرف الثاني بشكل واضح، وحالتك أنت بسطر صغير
export function PresenceBoard() {
  const names = useStore((s) => s.names);
  const me = useOnline((s) => s.me);
  const [data, setData] = useState<Record<string, Presence>>({});
  const [, tick] = useState(0);
  const [offset, setOffset] = useState(0); // فرق الساعة بين جوالكم وساعة Firebase

  useEffect(() => {
    if (!firebaseReady || !db) return;
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    const offPresence = onValue(ref(db, "presence"), (snap) => setData(snap.val() ?? {}));
    const offTime = onValue(ref(db, ".info/serverTimeOffset"), (snap) => setOffset(Number(snap.val()) || 0));
    return () => { clearInterval(t); offPresence(); offTime(); };
  }, []);

  if (!firebaseReady || !me) return null;

  const other = me.name === names.a ? names.b : names.a;
  const status = (n: string) => {
    const p = data[n];
    // متصل فقط إذا الإشارة حديثة (آخر دقيقتين)
    const fresh = !!p?.at && Date.now() + offset - p.at < 120_000;
    const online = !!p?.online && fresh;
    return { online, game: online ? p?.game ?? null : null };
  };
  const o = status(other);
  const m = status(me.name);

  return (
    <div className="space-y-2">
      <div className={`flex items-center justify-between rounded-2xl border p-4 ${o.online ? "border-emerald-400/60 bg-emerald-500/10" : "border-line bg-surface"}`}>
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${o.online ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" : "bg-muted"}`} />
          <div>
            <div className="font-black">{other}</div>
            <div className="text-xs text-muted">{o.online ? (o.game ? `يلعب ${o.game} الحين` : "متصل الحين") : "غير متصل"}</div>
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
