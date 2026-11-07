export type Category = "romantic" | "nature" | "animals" | "mandala" | "seasons" | "food" | "fantasy";
export type Difficulty = "simple" | "medium" | "complex";
export type Colors = Record<string, string>;

export interface Region {
  id: string;
  d: string; // مسار SVG مغلق
}

export interface Template {
  id: string;
  name: string;
  category: Category;
  regions: Region[];
}

export const VIEW = 400;

export const CATEGORIES: { id: Category; name: string }[] = [
  { id: "romantic", name: "رومانسي" },
  { id: "nature", name: "طبيعة" },
  { id: "animals", name: "حيوانات" },
  { id: "mandala", name: "ماندالا وأنماط" },
  { id: "seasons", name: "مواسم" },
  { id: "food", name: "أكل ومشروبات" },
  { id: "fantasy", name: "خيال" },
];

export const DIFF_LABEL: Record<Difficulty, string> = { simple: "بسيط", medium: "متوسط", complex: "معقد" };

export function difficultyOf(regions: number): Difficulty {
  return regions <= 20 ? "simple" : regions <= 50 ? "medium" : "complex";
}

// ===== أدوات مساعدة للمسارات =====
const f = (n: number) => n.toFixed(1);

function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx + r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)} Z`;
}

function star(cx: number, cy: number, R: number, r: number, id: string): Region {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${f(cx + rad * Math.cos(a))} ${f(cy + rad * Math.sin(a))}`);
  }
  return { id, d: `M${pts.join(" L")} Z` };
}

// زهرة بتلات تُولَّد برمجياً: عدد البتلات يحدد عدد المناطق
function petalFlower(n: number, rInner: number, rOuter: number, prefix: string): Region[] {
  const c = VIEW / 2;
  const out: Region[] = [{ id: `${prefix}-center`, d: circle(c, c, rInner) }];
  const half = ((Math.PI * rInner) / n) * 1.1;
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const px = -uy;
    const py = ux;
    const mr = (rInner + rOuter) / 2;
    const bx = c + rInner * ux, by = c + rInner * uy;
    const tx = c + rOuter * ux, ty = c + rOuter * uy;
    const mx = c + mr * ux, my = c + mr * uy;
    const c1x = mx + px * half * 2, c1y = my + py * half * 2;
    const c2x = mx - px * half * 2, c2y = my - py * half * 2;
    out.push({
      id: `${prefix}-p${i}`,
      d: `M${f(bx)} ${f(by)} Q${f(c1x)} ${f(c1y)} ${f(tx)} ${f(ty)} Q${f(c2x)} ${f(c2y)} ${f(bx)} ${f(by)} Z`,
    });
  }
  return out;
}

// ماندالا: حلقات مقسّمة لقطاعات
function mandala(rings: number, sectors: number, prefix: string): Region[] {
  const c = VIEW / 2;
  const step = 180 / (rings + 0.8);
  const rc = step * 0.8;
  const out: Region[] = [{ id: `${prefix}-c`, d: circle(c, c, rc) }];
  const q = (r: number, a: number) => `${f(c + r * Math.cos(a))} ${f(c + r * Math.sin(a))}`;
  for (let k = 0; k < rings; k++) {
    const r0 = rc + k * step;
    const r1 = r0 + step;
    for (let i = 0; i < sectors; i++) {
      const a0 = (2 * Math.PI * i) / sectors;
      const a1 = (2 * Math.PI * (i + 1)) / sectors;
      out.push({
        id: `${prefix}-${k}-${i}`,
        d: `M${q(r0, a0)} L${q(r1, a0)} A${f(r1)} ${f(r1)} 0 0 1 ${q(r1, a1)} L${q(r0, a1)} A${f(r0)} ${f(r0)} 0 0 0 ${q(r0, a0)} Z`,
      });
    }
  }
  return out;
}

// فسيفساء: شبكة مربعات
function mosaic(cols: number, rows: number, prefix: string): Region[] {
  const margin = 20;
  const size = (VIEW - margin * 2) / Math.max(cols, rows);
  const out: Region[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const x0 = margin + x * size;
      const y0 = margin + y * size;
      out.push({
        id: `${prefix}-${y}-${x}`,
        d: `M${f(x0)} ${f(y0)} H${f(x0 + size)} V${f(y0 + size)} H${f(x0)} Z`,
      });
    }
  }
  return out;
}

export const TEMPLATES: Template[] = [
  {
    id: "heart",
    name: "قلب مزدوج",
    category: "romantic",
    regions: [
      { id: "left", d: "M200 95 C190 70 170 50 140 50 C90 50 40 90 40 150 C40 230 120 290 200 360 Z" },
      { id: "right", d: "M200 95 C210 70 230 50 260 50 C310 50 360 90 360 150 C360 230 280 290 200 360 Z" },
      { id: "shine", d: "M95 120 C95 95 110 82 130 80 C112 92 102 105 102 125 Z" },
    ],
  },
  {
    id: "petals",
    name: "زهرة رومانسية",
    category: "romantic",
    regions: petalFlower(8, 38, 150, "pk"),
  },
  {
    id: "flower",
    name: "زهرة الربيع",
    category: "seasons",
    regions: petalFlower(16, 40, 160, "fl"),
  },
  {
    id: "sunset",
    name: "غروب البحر",
    category: "nature",
    regions: [
      { id: "sky", d: "M0 0 H400 V260 H0 Z" },
      { id: "sun", d: circle(300, 90, 45) },
      { id: "cloud1", d: "M40 90 C40 62 78 60 88 76 C98 50 140 58 134 88 C128 100 40 104 40 90 Z" },
      { id: "cloud2", d: "M250 40 C250 22 275 20 282 32 C292 16 320 24 316 42 C312 50 250 52 250 40 Z" },
      { id: "mountain1", d: "M0 260 L110 150 L220 260 Z" },
      { id: "mountain2", d: "M150 260 L270 130 L400 260 Z" },
      { id: "ground", d: "M0 260 H400 V300 H0 Z" },
      { id: "sea", d: "M0 300 H400 V400 H0 Z" },
    ],
  },
  {
    id: "butterfly",
    name: "فراشة",
    category: "nature",
    regions: [
      { id: "wing-ul", d: "M195 190 C150 110 60 100 60 170 C60 220 150 220 195 200 Z" },
      { id: "wing-ll", d: "M195 210 C150 230 80 250 90 290 C100 320 170 300 195 230 Z" },
      { id: "wing-ur", d: "M205 190 C250 110 340 100 340 170 C340 220 250 220 205 200 Z" },
      { id: "wing-lr", d: "M205 210 C250 230 320 250 310 290 C300 320 230 300 205 230 Z" },
      { id: "body", d: "M195 170 H205 V310 H195 Z" },
    ],
  },
  {
    id: "cat",
    name: "قطة صغيرة",
    category: "animals",
    regions: [
      { id: "head", d: "M120 170 C120 120 280 120 280 170 C290 200 270 230 200 230 C130 230 110 200 120 170 Z" },
      { id: "ear-l", d: "M125 150 L120 95 L165 135 Z" },
      { id: "ear-r", d: "M275 150 L280 95 L235 135 Z" },
      { id: "eye-l", d: "M150 180 C150 170 170 170 170 180 C170 190 150 190 150 180 Z" },
      { id: "eye-r", d: "M230 180 C230 170 250 170 250 180 C250 190 230 190 230 180 Z" },
      { id: "nose", d: "M193 200 L207 200 L200 210 Z" },
      { id: "body", d: "M140 225 C120 290 130 340 200 345 C270 340 280 290 260 225 Z" },
      { id: "tail", d: "M262 320 C330 320 340 260 320 240 C312 258 300 280 262 290 Z" },
      { id: "paw-l", d: "M150 330 C150 350 180 352 185 340 Z" },
      { id: "paw-r", d: "M215 340 C220 352 250 350 250 330 Z" },
    ],
  },
  {
    id: "fish",
    name: "سمكة ملونة",
    category: "animals",
    regions: [
      { id: "body", d: "M80 200 C140 120 260 120 320 200 C260 280 140 280 80 200 Z" },
      { id: "tail", d: "M320 200 L370 150 L370 250 Z" },
      { id: "fin-top", d: "M160 135 L200 90 L240 135 Z" },
      { id: "fin-bottom", d: "M160 265 L200 310 L240 265 Z" },
      { id: "eye", d: "M105 200 C105 190 125 190 125 200 C125 210 105 210 105 200 Z" },
      { id: "scale-1", d: "M150 200 C170 180 190 180 200 200 C190 220 170 220 150 200 Z" },
      { id: "scale-2", d: "M190 200 C210 180 230 180 240 200 C230 220 210 220 190 200 Z" },
    ],
  },
  {
    id: "cupcake",
    name: "كب كيك",
    category: "food",
    regions: [
      { id: "wrapper", d: "M120 240 L140 350 L260 350 L280 240 Z" },
      { id: "frosting", d: "M100 240 C100 170 140 150 160 160 C170 120 230 120 240 160 C260 150 300 170 300 240 Z" },
      { id: "cherry", d: circle(200, 110, 15) },
      { id: "stripe-1", d: "M150 255 L165 345 L180 345 L165 255 Z" },
      { id: "stripe-2", d: "M190 245 L195 350 L210 350 L205 245 Z" },
    ],
  },
  {
    id: "moon",
    name: "قمر ونجوم",
    category: "fantasy",
    regions: [
      { id: "moon", d: circle(200, 200, 120) },
      star(90, 80, 30, 12, "star-1"),
      star(320, 70, 24, 10, "star-2"),
      star(330, 300, 28, 11, "star-3"),
      star(70, 310, 22, 9, "star-4"),
    ],
  },
  { id: "mandala-s", name: "ماندالا بسيطة", category: "mandala", regions: mandala(2, 8, "ms") },
  { id: "mandala-m", name: "ماندالا متوسطة", category: "mandala", regions: mandala(4, 12, "mm") },
  { id: "mandala-c", name: "ماندالا معقدة", category: "mandala", regions: mandala(7, 16, "mc") },
  { id: "mosaic-s", name: "فسيفساء بسيطة", category: "mandala", regions: mosaic(4, 4, "ts") },
  { id: "mosaic-m", name: "فسيفساء متوسطة", category: "mandala", regions: mosaic(6, 6, "tm") },
  { id: "mosaic-c", name: "فسيفساء معقدة", category: "mandala", regions: mosaic(10, 10, "tc") },
];

export const TEMPLATES_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

// SVG كنص: يُستخدم للتحميل والمشاركة
export function svgMarkup(t: Template, colors: Colors): string {
  const paths = t.regions
    .map(
      (r) =>
        `<path id="${r.id}" d="${r.d}" fill="${colors[r.id] ?? "#ffffff"}" stroke="#3b2a33" stroke-width="2" stroke-linejoin="round"/>`
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW}" height="${VIEW}" viewBox="0 0 ${VIEW} ${VIEW}"><rect width="${VIEW}" height="${VIEW}" fill="#fffaf5"/>${paths}</svg>`;
}
