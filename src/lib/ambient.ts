"use client";

// صوت محيط هادئ (ضوضاء بنية منخفضة الترددات تشبه المطر البعيد)
let ctx: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;

export function startAmbient() {
  if (source || typeof window === "undefined") return;
  try {
    ctx = ctx ?? new AudioContext();
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
    source = src;
  } catch {
    // الصوت اختياري
  }
}

export function stopAmbient() {
  try {
    source?.stop();
  } catch {
    // مُوقَف مسبقاً
  }
  source = null;
}
