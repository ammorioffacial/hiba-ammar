"use client";

import { useEffect, useRef, useState } from "react";
import { Shell, TopControls } from "@/components/Shell";
import { btnPrimary, card } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";

const DEFAULT = ["تحدي: رقصة 30 ثانية", "هدية: تختار الفيلم الليلة", "سؤال: وش أول شي حبيته فيني؟", "مهمة: تسوون قهوة لبعض", "مفاجأة: قبلة", "دور مجاني: اختر لعبة"];
const COLORS = ["#ff5fa2", "#c084fc", "#fb7185", "#f472b6", "#a855f7", "#fda4af", "#e879f9", "#f9a8d4"];
const R = 150;
const C = 160;

function arc(a0: number, a1: number) {
  const p = (a: number) => [C + R * Math.cos(a), C + R * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${C} ${C} L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
}

export default function WheelPage() {
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [text, setText] = useState(DEFAULT.join("\n"));
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const wheelRef = useRef<SVGGElement>(null);
  const rot = useRef(0);

  useEffect(() => {
    recordPlay();
    setLast("/wheel");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = text.split("\n").map((s) => s.trim()).filter(Boolean);
  const n = Math.max(items.length, 2);
  const seg = (Math.PI * 2) / n;

  // الفهرس تحت المؤشر (المؤشر أعلى الدولاب)
  const indexAt = (deg: number) => {
    const phi = (((360 - (deg % 360)) % 360) * Math.PI) / 180;
    return Math.floor(phi / seg) % n;
  };

  const spin = () => {
    if (spinning || items.length < 2) return;
    sfx.click();
    setSpinning(true);
    setResult(null);
    const start = rot.current;
    const target = start + 360 * 6 + Math.random() * 360;
    const dur = 4200;
    const t0 = performance.now();
    let lastIdx = indexAt(start);

    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = start + (target - start) * eased;
      rot.current = cur;
      if (wheelRef.current) wheelRef.current.style.transform = `rotate(${cur}deg)`;
      const idx = indexAt(cur);
      if (idx !== lastIdx) {
        lastIdx = idx;
        sfx.pick();
      }
      if (t < 1) requestAnimationFrame(frame);
      else {
        const label = items[indexAt(cur)];
        setSpinning(false);
        setResult(label);
        setHistory((h) => [label, ...h].slice(0, 8));
        sfx.win();
        celebrate(70);
      }
    };
    requestAnimationFrame(frame);
  };

  return (
    <Shell title="دولاب الحظ" action={<TopControls />}>
      <div className={`${card} text-center`}>
        <div className="relative mx-auto mb-4 aspect-square w-full max-w-[320px]">
          {/* المؤشر */}
          <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[12px] border-b-0 border-t-[22px] border-x-transparent border-t-gold drop-shadow" />
          <svg viewBox="0 0 320 320" className="h-full w-full">
            <g ref={wheelRef} style={{ transformOrigin: "160px 160px" }}>
              {items.map((label, i) => {
                const a0 = -Math.PI / 2 + i * seg;
                const a1 = a0 + seg;
                const mid = a0 + seg / 2;
                const tx = C + R * 0.62 * Math.cos(mid);
                const ty = C + R * 0.62 * Math.sin(mid);
                return (
                  <g key={i}>
                    <path d={arc(a0, a1)} fill={COLORS[i % COLORS.length]} stroke="#1d0716" strokeWidth={2} />
                    <text
                      x={tx}
                      y={ty}
                      fill="#fff"
                      fontSize={label.length > 18 ? 10 : 12}
                      fontWeight={800}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${(mid * 180) / Math.PI + 90} ${tx} ${ty})`}
                    >
                      {label.length > 22 ? label.slice(0, 21) + "…" : label}
                    </text>
                  </g>
                );
              })}
            </g>
            <circle cx={C} cy={C} r={18} fill="#1d0716" stroke="#ff5fa2" strokeWidth={3} />
          </svg>
        </div>

        <button className={btnPrimary} disabled={spinning || items.length < 2} onClick={spin}>
          {spinning ? "يدور…" : "لفّوا الدولاب"}
        </button>

        <div className="mt-4 min-h-[2.5rem] text-lg font-black text-pink-400">{result ?? ""}</div>
      </div>

      <div className={`${card} mt-4`}>
        <div className="mb-2 font-black">عدّلوا الخيارات (سطر لكل خيار)</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          disabled={spinning}
          className="w-full rounded-2xl border border-line bg-surface-2 p-3 text-sm outline-none focus:border-pink-400 select-text"
        />
        {items.length < 2 && <p className="mt-2 text-xs text-rose-400">لازم خيارين على الأقل</p>}
      </div>

      {history.length > 0 && (
        <div className={`${card} mt-4`}>
          <div className="mb-2 font-black">آخر النتائج</div>
          <ul className="space-y-1 text-sm text-muted">
            {history.map((h, i) => <li key={i}>• {h}</li>)}
          </ul>
        </div>
      )}
    </Shell>
  );
}
