"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db, firebaseReady } from "@/lib/firebase";
import { useStore } from "@/lib/store";

type Presence = { online: boolean; game: string | null; at?: number };

// بطاقات الحالة: "عمار يلعب إكس أو الحين" أو "غير متصل"
export function PresenceBoard() {
  const names = useStore((s) => s.names);
  const [data, setData] = useState<Record<string, Presence>>({});
  const [, tick] = useState(0);

  useEffect(() => {
    if (!firebaseReady || !db) return;
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    const off = onValue(ref(db, "presence"), (snap) => setData(snap.val() ?? {}));
    return () => { clearInterval(t); off(); };
  }, []);

  if (!firebaseReady) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {[names.a, names.b].map((n) => {
        const p = data[n];
        // متصل فقط إذا الإشارة حديثة (آخر دقيقتين)
        const fresh = !!p?.at && Date.now() - p.at < 120_000;
        const online = !!p?.online && fresh;
        const playing = online && p?.game;
        return (
          <div key={n} className="rounded-2xl border border-line bg-surface p-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-400" : "bg-muted"}`} />
              <span className="font-black">{n}</span>
            </div>
            <div className="mt-1 text-xs text-muted">
              {online ? (playing ? `يلعب ${p.game} الحين` : "متصل ومو في لعبة") : "غير متصل"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
