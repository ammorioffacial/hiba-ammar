"use client";

import { useStore } from "./store";

// أصوات مُولَّدة بالكود (ما فيه ملفات صوتية)، تقريبية وليست تسجيلات حقيقية
let ctx: AudioContext | null = null;
const ac = () => (ctx = ctx ?? new AudioContext());

function tone(type: OscillatorType, f0: number, t: number, dur: number, f1 = f0, peak = 0.25) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(type: BiquadFilterType, f0: number, f1: number, t: number, dur: number, peak = 0.2) {
  const c = ac();
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const flt = c.createBiquadFilter();
  flt.type = type;
  flt.frequency.setValueAtTime(f0, t);
  flt.frequency.linearRampToValueAtTime(f1, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(flt).connect(g).connect(c.destination);
  src.start(t);
}

export interface SoundDef {
  id: string;
  name: string;
  cat: "nature" | "instrument" | "daily" | "animal";
  play: (t: number) => void;
}

export const SOUNDS: SoundDef[] = [
  { id: "rain", name: "مطر", cat: "nature", play: (t) => noise("highpass", 1800, 1500, t, 2.2, 0.25) },
  { id: "sea", name: "موج البحر", cat: "nature", play: (t) => { noise("lowpass", 400, 700, t, 1.4, 0.3); noise("lowpass", 500, 350, t + 1.4, 1.6, 0.3); } },
  { id: "wind", name: "هبوب الريح", cat: "nature", play: (t) => noise("bandpass", 300, 1400, t, 2.4, 0.3) },
  { id: "birds", name: "عصافير", cat: "nature", play: (t) => [0, 0.28, 0.56].forEach((d) => tone("sine", 2100, t + d, 0.12, 3400, 0.15)) },
  { id: "piano", name: "بيانو", cat: "instrument", play: (t) => tone("triangle", 523, t, 1.2, 523, 0.3) },
  { id: "drum", name: "طبل", cat: "instrument", play: (t) => tone("sine", 160, t, 0.4, 40, 0.7) },
  { id: "bell", name: "جرس", cat: "instrument", play: (t) => { tone("sine", 1318, t, 2, 1318, 0.25); tone("sine", 2637, t, 1.2, 2637, 0.08); } },
  { id: "doorbell", name: "جرس الباب", cat: "daily", play: (t) => { tone("sine", 880, t, 0.6, 880, 0.3); tone("sine", 660, t + 0.6, 0.9, 660, 0.3); } },
  { id: "phone", name: "رنين الجوال", cat: "daily", play: (t) => [0, 0.5, 1, 1.5].forEach((d) => { tone("square", 440, t + d, 0.22, 440, 0.12); tone("square", 480, t + d, 0.22, 480, 0.12); }) },
  { id: "clock", name: "تكتكة الساعة", cat: "daily", play: (t) => [0, 0.5, 1, 1.5].forEach((d) => noise("bandpass", 3000, 3000, t + d, 0.03, 0.4)) },
  { id: "cat", name: "مواء قطة", cat: "animal", play: (t) => { tone("sine", 600, t, 0.5, 900, 0.3); tone("sine", 900, t + 0.5, 0.5, 500, 0.3); } },
  { id: "dog", name: "نباح كلب", cat: "animal", play: (t) => [0, 0.3].forEach((d) => tone("square", 320, t + d, 0.16, 180, 0.2)) },
];

export const SOUND_CATS = [
  { id: "nature", name: "طبيعة" },
  { id: "instrument", name: "آلات" },
  { id: "daily", name: "أصوات يومية" },
  { id: "animal", name: "حيوانات" },
] as const;

export function playSound(s: SoundDef) {
  if (!useStore.getState().sound || typeof window === "undefined") return;
  try {
    s.play(ac().currentTime + 0.02);
  } catch {
    // الصوت اختياري
  }
}
