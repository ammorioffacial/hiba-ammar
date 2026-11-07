"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell, TopControls } from "@/components/Shell";
import { ClientOnly } from "@/components/ClientOnly";
import { btnPrimary, btnGhost, card, shuffle } from "@/components/ui";
import { useOnline } from "@/lib/online";
import { firebaseReady } from "@/lib/firebase";
import { PLAY_GAMES, createGame, joinGame, type GameKey } from "@/lib/play";
import { QUIZ_QUESTIONS } from "@/lib/game-data";
import { sfx } from "@/lib/sound";
import { Pencil, Brain, Type, Ship, Gamepad2 } from "lucide-react";

const ICON: Record<GameKey, typeof Pencil> = { skribbl: Pencil, quiz: Brain, words: Type, battle: Ship };
const WORD_CATS = ["مدينة", "حيوان", "نبات", "أكلة"];

// الحالة الأولية لكل لعبة (تُكتب عند إنشاء الغرفة)
function initFor(game: GameKey, cat?: string) {
  if (game === "skribbl") return { phase: "wait", round: 0, rounds: 4, drawer: "a", scores: { a: 0, b: 0 } };
  if (game === "quiz") {
    const qs = shuffle(QUIZ_QUESTIONS).slice(0, 8).map((x) => ({ q: x.q, o: x.o, a: x.a }));
    return { phase: "wait", i: 0, qs, ans: {}, sc: { a: 0, b: 0 }, reveal: null };
  }
  if (game === "words") return { phase: "wait", cat: cat ?? "مدينة", turn: "a", out: null, challenge: null };
  return { phase: "wait", ready: { a: false, b: false }, turn: null, pending: null, winner: null };
}

export default function PlayLobby() {
  return (
    <ClientOnly>
      <Lobby />
    </ClientOnly>
  );
}

function Lobby() {
  const router = useRouter();
  const me = useOnline((s) => s.me);
  const [picking, setPicking] = useState<GameKey | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!firebaseReady) return <Shell title="ألعاب أونلاين" action={<TopControls />}><div className={card}><p className="text-sm text-muted">الأونلاين يحتاج إعداد Firebase.</p></div></Shell>;
  if (!me) return <Shell title="ألعاب أونلاين" action={<TopControls />}><div className={`${card} text-center`}><p className="mb-3 text-muted">سجّلوا دخول أول</p><Link href="/login" className={btnPrimary}>تسجيل الدخول</Link></div></Shell>;

  const start = async (game: GameKey, cat?: string) => {
    setBusy(true);
    setErr("");
    try {
      const c = await createGame(game, me.uid, me.name, initFor(game, cat));
      sfx.win();
      router.push(`/play/${c}`);
    } catch {
      setErr("تعذر إنشاء الغرفة، جربوا مرة ثانية");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const c = code.trim();
    if (!/^\d{4}$/.test(c)) return setErr("الكود 4 أرقام");
    setBusy(true);
    setErr("");
    const r = await joinGame(c, me.uid, me.name);
    setBusy(false);
    if (r === "missing") return setErr("ما فيه غرفة بهالكود");
    if (r === "full") return setErr("الغرفة ممتلئة");
    sfx.click();
    router.push(`/play/${c}`);
  };

  return (
    <Shell title="ألعاب أونلاين" action={<TopControls />}>
      <div className="mb-4 text-center text-sm text-muted">اختاروا لعبة، وشاركوا الكود مع الطرف الثاني</div>

      <div className="grid grid-cols-1 gap-3">
        {PLAY_GAMES.map((g) => {
          const Icon = ICON[g.key] ?? Gamepad2;
          return (
            <div key={g.key} className={`${card} p-4`}>
              <button disabled={busy} onClick={() => (g.key === "words" ? setPicking(picking === "words" ? null : "words") : start(g.key))} className="flex w-full items-center gap-4 text-right">
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${g.tone} text-white`}>
                  <Icon className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black">{g.name}</div>
                  <div className="text-xs text-muted">{g.desc}</div>
                  <div className="mt-1 text-[11px] font-bold text-pink-400">{g.mode}</div>
                </div>
              </button>
              {g.key === "words" && picking === "words" && (
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {WORD_CATS.map((c) => (
                    <button key={c} disabled={busy} onClick={() => start("words", c)} className="rounded-xl bg-surface-2 py-2 text-sm font-bold">{c}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={`${card} mt-5 space-y-3`}>
        <div className="font-black">عندكم كود؟ ادخلوا الغرفة</div>
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="0000"
            className="min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-center text-xl font-black tracking-widest outline-none focus:border-pink-400 select-text"
          />
          <button className={btnGhost} disabled={busy} onClick={join}>ادخل</button>
        </div>
      </div>

      {err && <p className="mt-3 text-center text-sm text-rose-400">{err}</p>}
    </Shell>
  );
}
