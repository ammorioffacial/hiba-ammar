export type GameStatus = "ready" | "soon";

export interface GameInfo {
  id: string;
  href: string;
  name: string;
  desc: string;
  mode: string;
  status: GameStatus;
  tone: string; // تدرج اللون (كلاسات Tailwind)
}

export const GAMES: GameInfo[] = [
  { id: "xo", href: "/xo", name: "إكس أو", desc: "ثلاث بثلاث، والمنافسة حلوة", mode: "لاعبين · ضد الجهاز", status: "ready", tone: "from-[#ff7fb6] to-[#c2185b]" },
  { id: "memory", href: "/memory", name: "الذاكرة", desc: "طابقوا الأزواج بأقل حركات", mode: "فردي · تعاوني", status: "ready", tone: "from-[#f472b6] to-[#9d174d]" },
  { id: "rps", href: "/rps", name: "حجر ورقة مقص", desc: "أفضل من 5 جولات", mode: "لاعبين · ضد الجهاز", status: "ready", tone: "from-[#fb7185] to-[#be123c]" },
  { id: "coloring", href: "/coloring", name: "كتاب التلوين", desc: "لوّنوا الرسمات معاً أو لحالكم", mode: "لاعبين · فردي", status: "ready", tone: "from-[#f0abfc] to-[#db2777]" },
  { id: "speed", href: "/speed", name: "تحدي السرعة", desc: "شاشة مقسومة، أسرع واحد يكسب", mode: "لاعبين على نفس الجهاز", status: "ready", tone: "from-[#ff5fa2] to-[#7e22ce]" },
  { id: "draw", href: "/draw", name: "ارسم وخمّن", desc: "رسم وتخمين بكلمات عراقية", mode: "لاعبين", status: "ready", tone: "from-[#f9a8d4] to-[#db2777]" },
  { id: "scramble", href: "/scramble", name: "ترتيب الكلمات", desc: "رتّبوا الحروف قبل غيركم", mode: "سباق", status: "ready", tone: "from-[#fda4af] to-[#a21caf]" },
  { id: "icons", href: "/icons", name: "لعبة الأيقونات", desc: "خمّنوا المعنى من الرموز", mode: "لاعبين", status: "ready", tone: "from-[#c084fc] to-[#be185d]" },
  { id: "tf", href: "/tf", name: "صح أو غلط", desc: "اختبروا معرفتكم ببعض", mode: "لاعبين", status: "ready", tone: "from-[#f472b6] to-[#7c3aed]" },
  { id: "rather", href: "/rather", name: "هل تفضل؟", desc: "اختيارات صعبة وممتعة", mode: "لاعبين", status: "ready", tone: "from-[#fb923c] to-[#db2777]" },
  { id: "wheel", href: "/wheel", name: "دولاب الحظ", desc: "تحديات وهدايا وأسئلة", mode: "لاعبين", status: "ready", tone: "from-[#f43f5e] to-[#9333ea]" },
  { id: "pictionary", href: "/pictionary", name: "التخمين بالرسم", desc: "لوحة رسم بألوان وفرش", mode: "لاعبين", status: "ready", tone: "from-[#ec4899] to-[#4c1d95]" },
  { id: "quiz", href: "/quiz", name: "مسابقة الثقافة", desc: "أسئلة متدرجة الصعوبة", mode: "لاعبين", status: "ready", tone: "from-[#e879f9] to-[#9f1239]" },
  { id: "sound", href: "/sound", name: "خمّن الصوت", desc: "أصوات طبيعة وآلات وحيوانات", mode: "لاعبين", status: "ready", tone: "from-[#d946ef] to-[#831843]" },
  { id: "know", href: "/know", name: "اعرفني أكثر", desc: "كم تعرفون بعض فعلاً؟", mode: "لاعبين", status: "ready", tone: "from-[#fb7185] to-[#a21caf]" },
  { id: "puzzle", href: "/puzzle", name: "أحجية الصور", desc: "ركّبوا صورتكم قطعة قطعة", mode: "فردي", status: "ready", tone: "from-[#f9a8d4] to-[#9d174d]" },
  { id: "personality", href: "/personality", name: "اختبارات شخصية", desc: "قارنوا نتايجكم جنب بعض", mode: "لاعبين", status: "ready", tone: "from-[#fbcfe8] to-[#be185d]" },
];

export const DAILY_POOL = GAMES.filter((g) => g.status === "ready");
