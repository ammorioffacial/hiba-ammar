"use client";

import { useEffect, useRef, useState } from "react";
import { Shell, TopControls } from "@/components/Shell";
import { btnPrimary, card } from "@/components/ui";
import { LAYERS, startLayer, type LayerId } from "@/lib/relax";
import { useStore } from "@/lib/store";
import { CloudRain, Waves, Trees, Flame, Radio, Music, Maximize, Minimize, Moon, Timer, Volume2, type LucideIcon } from "lucide-react";

const ICON: Record<LayerId, LucideIcon> = { rain: CloudRain, ocean: Waves, wind: Trees, fire: Flame, white: Radio, pink: Music };
const MAX = 3;
const TIMERS = [0, 15, 30, 60, 120];

export default function RelaxPage() {
  const setLast = useStore((s) => s.setLast);
  const [active, setActive] = useState<Partial<Record<LayerId, { vol: number }>>>({});
  const [master, setMaster] = useState(0.8);
  const [timer, setTimer] = useState(0);
  const [left, setLeft] = useState(0);
  const [zen, setZen] = useState(false);
  const stops = useRef<Partial<Record<LayerId, () => void>>>({});

  useEffect(() => {
    setLast("/together/relax");
    return () => Object.values(stops.current).forEach((s) => s?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تطبيق الطبقات: أي تغيير يعيد تشغيل الطبقة بالحجم الجديد
  const apply = (id: LayerId, vol: number | null) => {
    stops.current[id]?.();
    delete stops.current[id];
    if (vol !== null) stops.current[id] = startLayer(id, vol * master);
  };

  const toggle = (id: LayerId) => {
    if (active[id]) {
      apply(id, null);
      setActive((a) => { const n = { ...a }; delete n[id]; return n; });
      return;
    }
    if (Object.keys(active).length >= MAX) return;
    apply(id, 0.5);
    setActive((a) => ({ ...a, [id]: { vol: 0.5 } }));
  };

  const setVol = (id: LayerId, vol: number) => {
    apply(id, vol);
    setActive((a) => ({ ...a, [id]: { vol } }));
  };

  // المؤقت للنوم: يخفت تدريجياً في آخر 20 ثانية
  useEffect(() => {
    if (!left) return;
    if (left <= 0) {
      Object.keys(active).forEach((id) => apply(id as LayerId, null));
      setActive({});
      setLeft(0);
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const startTimer = (min: number) => {
    setTimer(min);
    setLeft(min * 60);
  };

  return (
    <Shell title="مود الاسترخاء" action={<TopControls />}>
      <div className={`${card} mb-4`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="font-black">الأصوات ({Object.keys(active).length}/{MAX})</div>
          <button onClick={() => setZen(true)} className="flex items-center gap-1 text-sm font-bold text-pink-400"><Maximize className="h-4 w-4" /> وضع الزن</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {LAYERS.map(({ id, name }) => {
            const Icon = ICON[id];
            const on = !!active[id];
            return (
              <button key={id} onClick={() => toggle(id)} className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition ${on ? "border-pink-400 bg-pink-500/20" : "border-line bg-surface-2"}`}>
                <Icon className={`h-6 w-6 ${on ? "text-pink-400" : "text-muted"}`} />
                <span className="text-xs font-bold">{name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {Object.keys(active).length > 0 && (
        <div className={`${card} mb-4 space-y-4`}>
          {(Object.keys(active) as LayerId[]).map((id) => (
            <label key={id} className="flex items-center gap-3 text-sm">
              <span className="w-20 font-bold">{LAYERS.find((l) => l.id === id)?.name}</span>
              <input type="range" min={0} max={1} step={0.05} value={active[id]!.vol} onChange={(e) => setVol(id, Number(e.target.value))} className="flex-1 accent-pink-500" />
            </label>
          ))}
          <label className="flex items-center gap-3 text-sm">
            <Volume2 className="h-4 w-4 text-muted" />
            <span className="w-20 font-bold">الكل</span>
            <input type="range" min={0} max={1} step={0.05} value={master} onChange={(e) => { setMaster(Number(e.target.value)); (Object.keys(active) as LayerId[]).forEach((id) => apply(id, active[id]!.vol)); }} className="flex-1 accent-pink-500" />
          </label>
        </div>
      )}

      <div className={card}>
        <div className="mb-3 flex items-center gap-2 font-black"><Timer className="h-4 w-4" /> مؤقت النوم</div>
        <div className="grid grid-cols-5 gap-1.5">
          {TIMERS.map((m) => (
            <button key={m} onClick={() => (m === 0 ? (setLeft(0), setTimer(0)) : startTimer(m))} className={`rounded-xl py-2 text-xs font-bold ${timer === m ? "bg-pink-500 text-white" : "bg-surface-2 text-muted"}`}>
              {m === 0 ? "إيقاف" : m >= 60 ? `${m / 60} س` : `${m} د`}
            </button>
          ))}
        </div>
        {left > 0 && <div className="mt-3 text-center text-sm font-bold text-pink-400">يتوقف بعد {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>}
      </div>

      {zen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[#0b0410]" onClick={() => setZen(false)}>
          <div className="flex flex-col items-center gap-6">
            <div className="h-40 w-40 animate-pulse rounded-full bg-gradient-to-br from-pink-500/40 to-violet-600/40 blur-sm" />
            <Moon className="h-6 w-6 text-pink-200/60" />
            <div className="text-sm text-pink-100/60">اضغطوا في أي مكان للخروج</div>
          </div>
        </div>
      )}
      <div className="mt-4 flex justify-center">
        {zen ? null : <button className={btnPrimary + " text-sm"} onClick={() => { Object.keys(active).forEach((id) => apply(id as LayerId, null)); setActive({}); setLeft(0); }}>إيقاف الكل</button>}
      </div>
    </Shell>
  );
}
