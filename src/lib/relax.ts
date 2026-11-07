"use client";

// طبقات صوت محيط: كل طبقة ضوضاء بفلتر مختلف (تقريبية، مو تسجيلات حقيقية)
export type LayerId = "rain" | "ocean" | "wind" | "fire" | "white" | "pink";

export const LAYERS: { id: LayerId; name: string }[] = [
  { id: "rain", name: "مطر" },
  { id: "ocean", name: "بحر" },
  { id: "wind", name: "ريح" },
  { id: "fire", name: "نار" },
  { id: "white", name: "ضوضاء بيضاء" },
  { id: "pink", name: "ضوضاء وردية" },
];

let ctx: AudioContext | null = null;
const ac = () => (ctx = ctx ?? new AudioContext());

// يرجع دالة توقف الطبقة
export function startLayer(id: LayerId, volume: number): () => void {
  const c = ac();
  const len = c.sampleRate * 4;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let b = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (id === "pink") {
      b = 0.97 * b + 0.03 * w;
      d[i] = b * 2.5;
    } else d[i] = w;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  gain.gain.value = volume;

  switch (id) {
    case "rain": filter.type = "highpass"; filter.frequency.value = 1400; break;
    case "ocean": filter.type = "lowpass"; filter.frequency.value = 600; break;
    case "wind": filter.type = "bandpass"; filter.frequency.value = 900; filter.Q.value = 0.6; break;
    case "fire": filter.type = "bandpass"; filter.frequency.value = 350; filter.Q.value = 1.5; break;
    case "white": filter.type = "allpass"; break;
    case "pink": filter.type = "lowpass"; filter.frequency.value = 3000; break;
  }

  // موجة بطيئة تخلي البحر والريح يتنفسون
  if (id === "ocean" || id === "wind") {
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = id === "ocean" ? 0.12 : 0.25;
    depth.gain.value = volume * 0.6;
    lfo.connect(depth).connect(gain.gain);
    lfo.start();
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
    return () => {
      try { src.stop(); lfo.stop(); } catch { /* مُوقَف */ }
      gain.disconnect();
    };
  }

  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
  return () => {
    try { src.stop(); } catch { /* مُوقَف */ }
    gain.disconnect();
  };
}

