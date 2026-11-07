"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Shell, TopControls } from "@/components/Shell";
import { ClientOnly } from "@/components/ClientOnly";
import { card, btnPrimary } from "@/components/ui";
import { useOnline } from "@/lib/online";
import {
  useMeta, useRoom, sideOf, joinGame, setActive, setStateAll, initFor, subCode,
  PLAY_GAMES, GAME_NAME, type GameKey, type Meta, type Side,
} from "@/lib/play";
import { XOGame } from "@/components/play/XO";
import { SkribblGame } from "@/components/play/Skribbl";
import { QuizGame } from "@/components/play/Quiz";
import { WordsGame } from "@/components/play/Words";
import { BattleGame } from "@/components/play/Battle";
import { sfx } from "@/lib/sound";

export function RoomClient({ code }: { code: string }) {
  return (
    <ClientOnly>
      <Room code={code} />
    </ClientOnly>
  );
}

function Room({ code }: { code: string }) {
  const me = useOnline((s) => s.me);
  const { meta, loaded } = useMeta(code);
  const [joinMsg, setJoinMsg] = useState("");
  const tried = useRef(false);

  // ينضم تلقائياً إذا فيه مكان
  useEffect(() => {
    if (!me || !meta || tried.current || sideOf(meta, me.uid)) return;
    tried.current = true;
    joinGame(code, me.uid, me.name).then((r) => {
      if (r === "full") setJoinMsg("الغرفة ممتلئة");
    });
  }, [me, meta, code]);

  const wrap = (children: React.ReactNode) => (
    <Shell title={`غرفة ${code}`} action={<TopControls />}>{children}</Shell>
  );

  if (!me) return wrap(<div className={`${card} text-center`}><Link href="/login" className={btnPrimary}>سجّلوا دخول</Link></div>);
  if (!loaded) return wrap(<div className="py-10 text-center text-muted">جاري التحميل…</div>);
  if (!meta) return wrap(<div className={`${card} text-center`}><p className="mb-3 text-muted">ما فيه غرفة بهالكود</p><Link href="/play" className={btnPrimary}>ارجعوا</Link></div>);

  const side = sideOf(meta, me.uid);
  if (!side) return wrap(<div className={`${card} text-center text-muted`}>{joinMsg || "جاري الدخول للغرفة…"}</div>);

  // بانتظار الطرف الثاني
  if (!meta.players.b) {
    return wrap(
      <div className={`${card} space-y-4 text-center`}>
        <div className="text-muted">شاركوا هالكود مع الطرف الثاني</div>
        <div className="font-black tracking-[0.4em] text-5xl text-pink-500">{code}</div>
        <div className="text-xs text-muted">بانتظار الانضمام…</div>
      </div>
    );
  }

  return wrap(<RoomBody code={code} meta={meta} me={{ uid: me.uid, name: me.name }} side={side} />);
}

function RoomBody({ code, meta, me, side }: { code: string; meta: Meta; me: { uid: string; name: string }; side: Side }) {
  const active = meta.active ?? null;
  const choose = (g: GameKey) => {
    sfx.click();
    setActive(code, g);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {PLAY_GAMES.map((g) => (
          <button
            key={g.key}
            onClick={() => choose(g.key)}
            className={`rounded-2xl border p-3 text-right transition ${active === g.key ? "border-pink-400 bg-pink-500/15" : "border-line bg-surface"}`}
          >
            <div className={`mb-2 h-1.5 w-10 rounded-full bg-gradient-to-l ${g.tone}`} />
            <div className="text-sm font-black">{g.name}</div>
            <div className="mt-0.5 text-[11px] text-muted">{g.desc}</div>
          </button>
        ))}
      </div>

      {active ? (
        <ActiveGame key={active} code={code} game={active} meta={meta} me={me} side={side} />
      ) : (
        <div className={`${card} py-8 text-center text-muted`}>اختاروا لعبة من فوق عشان تبدأون</div>
      )}
    </div>
  );
}

// حالة اللعبة داخل الغرفة: إذا ما لعبتوها قبل، تنكتب حالتها الأولية
function ActiveGame({ code, game, meta, me, side }: { code: string; game: GameKey; meta: Meta; me: { uid: string; name: string }; side: Side }) {
  const sub = subCode(code, game);
  const { state, loaded } = useRoom<any>(sub);

  useEffect(() => {
    if (loaded && state === null) setStateAll(sub, initFor(game));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, state, sub, game]);

  if (!loaded || state === null) return <div className={`${card} py-8 text-center text-muted`}>جاري تجهيز {GAME_NAME[game]}…</div>;

  const props = { code: sub, meta, state, me, side };
  return (
    <div>
      <div className="mb-2 text-center text-sm font-bold text-pink-400">{GAME_NAME[game]}</div>
      {game === "xo" && <XOGame {...props} />}
      {game === "skribbl" && <SkribblGame {...props} />}
      {game === "quiz" && <QuizGame {...props} />}
      {game === "words" && <WordsGame {...props} />}
      {game === "battle" && <BattleGame {...props} />}
    </div>
  );
}
