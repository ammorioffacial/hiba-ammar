"use client";

import { useEffect, useState } from "react";
import { Shell, TopControls } from "@/components/Shell";
import { Handoff } from "@/components/Handoff";
import { btnPrimary, btnGhost, card } from "@/components/ui";
import { PERSONALITY_QUIZZES, type PersonalityQuiz } from "@/lib/game-data";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import { MessageCircle, Clock, Gift, HandHeart, Pizza, Utensils, Cake, Fish, Download, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { MessageCircle, Clock, Gift, HandHeart, Pizza, Utensils, Cake, Fish };

// نتيجة الاختبار: المفتاح الأكثر تكراراً
function resultKey(quiz: PersonalityQuiz, answers: string[]): string {
  const count: Record<string, number> = {};
  answers.forEach((k) => (count[k] = (count[k] ?? 0) + 1));
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
}

// بطاقة مشاركة تُحمَّل كصورة PNG
function shareCard(quiz: PersonalityQuiz, who: string, key: string) {
  const r = quiz.results[key];
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 520;
  const x = c.getContext("2d");
  if (!x) return;
  const g = x.createLinearGradient(0, 0, 900, 520);
  g.addColorStop(0, "#ff7fb6");
  g.addColorStop(1, "#7e22ce");
  x.fillStyle = g;
  x.fillRect(0, 0, 900, 520);
  x.fillStyle = "#fff";
  x.textAlign = "center";
  x.direction = "rtl";
  x.font = "bold 40px sans-serif";
  x.fillText(quiz.title, 450, 110);
  x.font = "bold 72px sans-serif";
  x.fillText(r.title, 450, 240);
  x.font = "28px sans-serif";
  wrap(x, r.desc, 450, 320, 720, 40);
  x.font = "bold 30px sans-serif";
  x.fillText(`— ${who}`, 450, 460);
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = `${quiz.id}-${who}.png`;
  a.click();
}

function wrap(x: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (x.measureText(t).width > maxW && line) {
      x.fillText(line, cx, y);
      line = w;
      y += lh;
    } else line = t;
  }
  if (line) x.fillText(line, cx, y);
}

export default function PersonalityPage() {
  const names = useStore((s) => s.names);
  const recordPlay = useStore((s) => s.recordPlay);
  const setLast = useStore((s) => s.setLast);

  const [quiz, setQuiz] = useState<PersonalityQuiz | null>(null);
  const [who, setWho] = useState<0 | 1>(0);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<string[][]>([[], []]);
  const [handoff, setHandoff] = useState(false);

  useEffect(() => {
    recordPlay();
    setLast("/personality");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = (q: PersonalityQuiz) => {
    sfx.click();
    setQuiz(q);
    setWho(0);
    setQi(0);
    setAnswers([[], []]);
    setHandoff(false);
  };

  const choose = (key: string) => {
    if (!quiz) return;
    sfx.pick();
    const next = answers.map((a, i) => (i === who ? [...a, key] : a));
    setAnswers(next);
    if (qi + 1 < quiz.questions.length) {
      setQi(qi + 1);
      return;
    }
    // انتهى اللاعب الحالي
    if (who === 0) {
      setWho(1);
      setQi(0);
      setHandoff(true);
    } else {
      sfx.win();
    }
  };

  const restart = () => setQuiz(null);

  // ===== اختيار الاختبار =====
  if (!quiz) {
    return (
      <Shell title="اختبارات شخصية" action={<TopControls />}>
        <div className="space-y-3">
          {PERSONALITY_QUIZZES.map((q) => (
            <button key={q.id} onClick={() => start(q)} className={`${card} block w-full text-right transition hover:border-pink-400`}>
              <div className="text-lg font-black">{q.title}</div>
              <div className="mt-1 text-sm text-muted">{q.questions.length} أسئلة · {names.a} ثم {names.b} · نتايجكم جنب بعض</div>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  const done = answers[1].length === quiz.questions.length;
  const current = quiz.questions[qi];
  const playerName = who === 0 ? names.a : names.b;

  // ===== النتيجة جنب بعض =====
  if (done) {
    const keys = [0, 1].map((i) => resultKey(quiz, answers[i]));
    const sameKey = keys[0] === keys[1];
    return (
      <Shell title={quiz.title} action={<TopControls />}>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => {
            const r = quiz.results[keys[i]];
            const Icon = ICONS[r.icon] ?? MessageCircle;
            return (
              <div key={i} className={`${card} text-center`}>
                <div className="mb-2 text-sm font-bold text-pink-400">{i === 0 ? names.a : names.b}</div>
                <Icon className="mx-auto mb-2 h-12 w-12 text-pink-500" />
                <div className="font-black">{r.title}</div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{r.desc}</p>
                <button className={`${btnGhost} mt-3 flex w-full items-center justify-center gap-1.5 text-sm`} onClick={() => { sfx.click(); shareCard(quiz, i === 0 ? names.a : names.b, keys[i]); }}>
                  <Download className="h-4 w-4" /> بطاقة
                </button>
              </div>
            );
          })}
        </div>
        <div className={`${card} mt-4 text-center`}>
          <div className="font-black">{sameKey ? "أنتم متشابهين بهالجانب!" : "عندكم طبعين مختلفين، وهذا يكمّل بعض"}</div>
        </div>
        <div className="mt-4 flex justify-center">
          <button className={btnPrimary} onClick={restart}>اختبار ثاني</button>
        </div>
      </Shell>
    );
  }

  // ===== السؤال =====
  return (
    <Shell title={quiz.title} action={<TopControls />}>
      {handoff && (
        <Handoff name={names.b} text={`الحين دورك ${names.b}، جاوب بدون ما تشوف إجابات ${names.a}`} onReady={() => setHandoff(false)} />
      )}
      <div className={card}>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold text-pink-400">يجاوب: {playerName}</span>
          <span className="text-muted">{qi + 1}/{quiz.questions.length}</span>
        </div>
        <div className="mb-5 text-center text-lg font-black leading-relaxed">{current.q}</div>
        <div className="grid gap-2">
          {current.options.map((o) => (
            <button
              key={o.label}
              onClick={() => choose(o.key)}
              className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-right font-bold transition hover:border-pink-400"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );
}
