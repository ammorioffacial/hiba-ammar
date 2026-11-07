export const PALETTE_SETS = [
  { id: "pastel", name: "باستيل", colors: ["#FFD1DC", "#FFE5B4", "#FFF5BA", "#C1F0C1", "#BDE7FF", "#D5C6FF", "#FFC6E7", "#E0F7FA"] },
  { id: "vibrant", name: "حيوي", colors: ["#FF1744", "#FF9100", "#FFEA00", "#00E676", "#00B0FF", "#2979FF", "#D500F9", "#FF4081"] },
  { id: "earth", name: "ترابي", colors: ["#6D4C41", "#A1887F", "#8D6E63", "#558B2F", "#33691E", "#D7CCC8", "#BF360C", "#F9A825"] },
  { id: "sunset", name: "غروب", colors: ["#FF5E62", "#FF9966", "#FFC371", "#F7971E", "#FF6A88", "#FF99AC", "#8E2DE2", "#4A00E0"] },
];

// الشفافية تُخزَّن كـ rgba، واللون الأساسي دائماً hex
export function toCss(hex: string, alpha: number): string {
  if (alpha >= 1) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha.toFixed(2)})`;
}

export function parseColor(s: string): { hex: string; alpha: number } {
  if (s.startsWith("#")) return { hex: s.slice(0, 7), alpha: 1 };
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return { hex: "#ffffff", alpha: 1 };
  const [r, g, b] = [m[1], m[2], m[3]].map((v) => Number(v));
  const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  return { hex, alpha: m[4] ? Number(m[4]) : 1 };
}
