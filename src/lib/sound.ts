"use client";

import { useStore } from "./store";

let ctx: AudioContext | null = null;

function tone(freq: number, dur: number, type: OscillatorType = "sine", delay = 0) {
  if (!useStore.getState().sound || typeof window === "undefined") return;
  try {
    ctx = ctx ?? new AudioContext();
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur);
  } catch {
    // الصوت اختياري، نتجاهل أي خطأ
  }
}

export const sfx = {
  click: () => tone(520, 0.06),
  pick: () => tone(700, 0.08, "triangle"),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "triangle", i * 0.11)),
  lose: () => [392, 311].forEach((f, i) => tone(f, 0.22, "sawtooth", i * 0.16)),
  draw: () => tone(440, 0.1),
  go: () => tone(990, 0.08, "triangle"),
};

export function buzz(ms = 20) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // غير مدعوم على هذا الجهاز
  }
}
