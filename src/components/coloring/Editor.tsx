"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight, Download, Eye, EyeOff, Headphones, Maximize2, Minimize2, Paintbrush,
  Pipette, Eraser, Redo2, Share2, Timer, Trophy, Undo2, ZoomIn, ZoomOut,
} from "lucide-react";
import { TEMPLATES_BY_ID, DIFF_LABEL, difficultyOf, svgMarkup, VIEW, type Colors } from "@/lib/coloring/templates";
import { PALETTE_SETS, parseColor, toCss } from "@/lib/coloring/palettes";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { startAmbient, stopAmbient } from "@/lib/ambient";
import { celebrate } from "@/components/Providers";

type Tool = "fill" | "pick" | "erase";
type Hist = { past: Colors[]; present: Colors; future: Colors[] };

const CUSTOM = "custom";
const BONUS_SECONDS = 180;

function renderPng(svg: string, cb: (blob: Blob) => void) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 1200;
    const x = c.getContext("2d");
    if (x) {
      x.fillStyle = "#fffaf5";
      x.fillRect(0, 0, 1200, 1200);
      x.drawImage(img, 0, 0, 1200, 1200);
    }
    URL.revokeObjectURL(url);
    c.toBlob((b) => b && cb(b), "image/png");
  };
  img.src = url;
}

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function Editor({ id }: { id: string }) {
  const template = TEMPLATES_BY_ID[id];
  const saveArt = useStore((s) => s.saveArt);
  const completeArt = useStore((s) => s.completeArt);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);
  const completed = useStore((s) => !!s.coloring.drawings[id]?.completedAt);

  const [ready, setReady] = useState(false);
  const [hist, setHist] = useState<Hist>({ past: [], present: {}, future: [] });
  const [tool, setTool] = useState<Tool>("fill");
  const [setId, setSetId] = useState<string>(PALETTE_SETS[0].id);
  const [color, setColor] = useState(PALETTE_SETS[0].colors[0]);
  const [alpha, setAlpha] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showColors, setShowColors] = useState(true);
  const [zen, setZen] = useState(false);
  const [timed, setTimed] = useState(false);
  const [ambient, setAmbient] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [bonus, setBonus] = useState(false);
  const startedAt = useRef(0);

  // تحميل التقدم المحفوظ بعد التحميل في المتصفح فقط
  useEffect(() => {
    if (!template) return;
    recordPlay();
    setLast("/coloring");
    const saved = useStore.getState().coloring.drawings[id];
    setHist({ past: [], present: saved?.colors ?? {}, future: [] });
    startedAt.current = Date.now();
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // المؤقت (يتوقف بعد الإكمال)
  useEffect(() => {
    if (!ready || completed) return;
    const t = setInterval(() => setSeconds(Math.round((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [ready, completed]);

  // الحفظ التلقائي
  useEffect(() => {
    if (ready && template) saveArt(id, hist.present, template.regions.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hist.present, ready]);

  // الإكمال: كل المناطق ملونة
  useEffect(() => {
    if (!ready || !template || completed) return;
    if (Object.keys(hist.present).length < template.regions.length) return;
    const colorsUsed = new Set(Object.values(hist.present)).size;
    const isBonus = timed && seconds <= BONUS_SECONDS;
    const points = template.regions.length * 2 + (isBonus ? 50 : 0);
    completeArt(id, { seconds, colorsUsed, regions: template.regions.length, points });
    setBonus(isBonus);
    sfx.win();
    celebrate(140);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hist.present, ready]);

  // الموسيقى المحيطة
  useEffect(() => {
    if (ambient) startAmbient();
    else stopAmbient();
    return () => stopAmbient();
  }, [ambient]);

  const commit = (next: Colors) =>
    setHist((h) => ({ past: [...h.past.slice(-99), h.present], present: next, future: [] }));

  const undo = () =>
    setHist((h) =>
      h.past.length
        ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
        : h
    );

  const redo = () =>
    setHist((h) =>
      h.future.length
        ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
        : h
    );

  if (!template) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <p className="mb-3 text-muted">هذا الرسم غير موجود</p>
          <Link href="/coloring" className="font-bold text-pink-500">ارجعوا للمعرض</Link>
        </div>
      </div>
    );
  }

  if (!ready) {
    return <div className="grid min-h-[60vh] place-items-center text-muted">جاري التحميل…</div>;
  }

  const present = hist.present;
  const total = template.regions.length;
  const colored = Object.keys(present).length;
  const pct = Math.round((colored / total) * 100);
  const palette = PALETTE_SETS.find((p) => p.id === setId);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  const onRegion = (rid: string) => {
    if (tool === "pick") {
      const c = present[rid];
      if (c) {
        const p = parseColor(c);
        setColor(p.hex);
        setAlpha(p.alpha);
      }
      setTool("fill");
      sfx.click();
      return;
    }
    if (tool === "erase") {
      if (!present[rid]) return;
      const next = { ...present };
      delete next[rid];
      commit(next);
      sfx.click();
      return;
    }
    const fill = toCss(color, alpha);
    if (present[rid] === fill) return;
    sfx.pick();
    commit({ ...present, [rid]: fill });
  };

  const exportSvg = () => svgMarkup(template, present);

  const downloadPng = () =>
    renderPng(exportSvg(), (blob) => download(blob, `${template.id}.png`));

  const downloadSvg = () =>
    download(new Blob([exportSvg()], { type: "image/svg+xml" }), `${template.id}.svg`);

  const share = () =>
    renderPng(exportSvg(), async (blob) => {
      const file = new File([blob], `${template.id}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: template.name });
          return;
        } catch {
          // المستخدم ألغى المشاركة
        }
      }
      download(blob, `${template.id}.png`);
    });

  return (
    <div className="mx-auto w-full max-w-xl px-3 pb-8" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
      {!zen && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <Link href="/coloring" onClick={() => sfx.click()} className="flex items-center gap-1.5 rounded-2xl border border-line bg-surface-2 px-3 py-2 text-sm font-bold">
            <ArrowRight className="h-4 w-4" /> المعرض
          </Link>
          <div className="text-center">
            <div className="font-black">{template.name}</div>
            <div className="text-[11px] text-muted">
              {DIFF_LABEL[difficultyOf(total)]} · {colored}/{total} · {pct}%
            </div>
          </div>
          <div className="flex gap-1.5">
            <ToggleBtn label="مؤقت المكافأة" active={timed} onClick={() => setTimed((v) => !v)}><Timer className="h-4 w-4" /></ToggleBtn>
            <ToggleBtn label="موسيقى محيطة" active={ambient} onClick={() => setAmbient((v) => !v)}><Headphones className="h-4 w-4" /></ToggleBtn>
            <ToggleBtn label="وضع الزن" active={zen} onClick={() => setZen(true)}><Maximize2 className="h-4 w-4" /></ToggleBtn>
          </div>
        </header>
      )}

      {zen && (
        <button
          aria-label="إظهار الأدوات"
          onClick={() => setZen(false)}
          className="fixed left-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-line bg-surface-2"
          style={{ top: "max(12px, env(safe-area-inset-top))" }}
        >
          <Minimize2 className="h-4 w-4" />
        </button>
      )}

      {timed && !zen && (
        <div className="mb-2 text-center text-sm font-bold text-pink-500">
          الوقت {mm}:{ss} · خلّصوها قبل 3 دقايق وتاخذون مكافأة
        </div>
      )}

      {/* ===== اللوحة ===== */}
      <div className="overflow-auto rounded-3xl border border-line bg-[#fffaf5] p-2 shadow-lg" style={{ maxHeight: zen ? "78vh" : "52vh" }}>
        <div className="mx-auto" style={{ width: `${zoom * 100}%` }}>
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="block h-auto w-full select-none" style={{ touchAction: "manipulation" }}>
            {template.regions.map((r) => (
              <path
                key={r.id}
                d={r.d}
                fill={showColors ? (present[r.id] ?? "#ffffff") : "#ffffff"}
                stroke="#3b2a33"
                strokeWidth={1.8}
                strokeLinejoin="round"
                className="cursor-pointer hover:brightness-95"
                style={{ transition: "fill .35s ease" }}
                onClick={() => onRegion(r.id)}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* ===== الأدوات ===== */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <IconBtn label="تراجع" disabled={!hist.past.length} onClick={undo}><Undo2 className="h-4 w-4" /></IconBtn>
          <IconBtn label="إعادة" disabled={!hist.future.length} onClick={redo}><Redo2 className="h-4 w-4" /></IconBtn>
        </div>
        <div className="flex gap-1.5">
          <ToggleBtn label="تلوين" active={tool === "fill"} onClick={() => setTool("fill")}><Paintbrush className="h-4 w-4" /></ToggleBtn>
          <ToggleBtn label="قطّارة الألوان" active={tool === "pick"} onClick={() => setTool("pick")}><Pipette className="h-4 w-4" /></ToggleBtn>
          <ToggleBtn label="ممحاة" active={tool === "erase"} onClick={() => setTool("erase")}><Eraser className="h-4 w-4" /></ToggleBtn>
        </div>
        <div className="flex gap-1.5">
          <IconBtn label="تصغير" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - 0.5))}><ZoomOut className="h-4 w-4" /></IconBtn>
          <IconBtn label="تكبير" disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, z + 0.5))}><ZoomIn className="h-4 w-4" /></IconBtn>
          <ToggleBtn label="قبل وبعد" active={!showColors} onClick={() => setShowColors((v) => !v)}>
            {showColors ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </ToggleBtn>
        </div>
      </div>

      {/* ===== الشفافية ===== */}
      <label className="mt-3 flex items-center gap-3 text-xs font-bold text-muted">
        الشفافية
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.05}
          value={alpha}
          onChange={(e) => setAlpha(Number(e.target.value))}
          className="flex-1 accent-pink-500"
        />
        <span className="w-10 text-left">{Math.round(alpha * 100)}%</span>
      </label>

      {/* ===== الألوان ===== */}
      <div className="mt-3 rounded-3xl border border-line bg-surface p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {PALETTE_SETS.map((p) => (
            <Chip key={p.id} active={setId === p.id} onClick={() => { sfx.click(); setSetId(p.id); setColor(p.colors[0]); }}>
              {p.name}
            </Chip>
          ))}
          <Chip active={setId === CUSTOM} onClick={() => { sfx.click(); setSetId(CUSTOM); }}>مخصص</Chip>
        </div>

        {setId === CUSTOM || !palette ? (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="اختاروا لون"
              className="h-10 w-16 cursor-pointer rounded-lg border-0 bg-transparent"
            />
            <span className="text-sm text-muted">اختاروا أي لون تبونه</span>
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1.5">
            {palette.colors.map((c) => (
              <button
                key={c}
                aria-label={c}
                onClick={() => {
                  sfx.click();
                  setColor(c);
                  if (tool !== "fill") setTool("fill");
                }}
                style={{ background: c }}
                className={`aspect-square rounded-full border-2 transition ${
                  color === c ? "scale-110 border-white ring-2 ring-pink-500" : "border-transparent"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===== التصدير ===== */}
      {!zen && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button onClick={() => { sfx.click(); downloadPng(); }} className="flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface-2 py-2.5 text-sm font-bold">
            <Download className="h-4 w-4" /> PNG
          </button>
          <button onClick={() => { sfx.click(); downloadSvg(); }} className="flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface-2 py-2.5 text-sm font-bold">
            <Download className="h-4 w-4" /> SVG
          </button>
          <button onClick={() => { sfx.click(); share(); }} className="flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface-2 py-2.5 text-sm font-bold">
            <Share2 className="h-4 w-4" /> مشاركة
          </button>
        </div>
      )}

      {completed && !zen && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-4 flex items-center justify-center gap-2 rounded-3xl bg-gradient-to-l from-pink-500 to-rose-600 p-4 text-center font-black text-white"
        >
          <Trophy className="h-5 w-5" />
          {bonus ? "تحفة مكتملة مع مكافأة السرعة!" : "تحفة مكتملة!"}
        </motion.div>
      )}
    </div>
  );
}

function ToggleBtn({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={() => { sfx.click(); onClick(); }}
      className={`grid h-10 w-10 place-items-center rounded-xl border transition ${
        active ? "border-pink-400 bg-pink-500/20 text-pink-500" : "border-line bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface-2 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white" : "bg-surface-2 text-muted"
      }`}
    >
      {children}
    </button>
  );
}
