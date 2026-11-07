"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Shell, TopControls } from "@/components/Shell";
import { ClientOnly } from "@/components/ClientOnly";
import { card, btnPrimary } from "@/components/ui";
import { useOnline } from "@/lib/online";
import { useRoom, sideOf, joinGame, GAME_NAME, type Meta } from "@/lib/play";
import { SkribblGame } from "@/components/play/Skribbl";
import { QuizGame } from "@/components/play/Quiz";
import { WordsGame } from "@/components/play/Words";
import { BattleGame } from "@/components/play/Battle";

export function RoomClient({ code }: { code: string }) {
  return (
    <ClientOnly>
      <Room code={code} />
    </ClientOnly>
  );
}

function Room({ code }: { code: string }) {
  const me = useOnline((s) => s.me);
  const { meta, state, loaded } = useRoom<any>(code);
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

  const wrap = (children: React.ReactNode, title = "لعبة أونلاين") => (
    <Shell title={title} action={<TopControls />}>{children}</Shell>
  );

  if (!me) return wrap(<div className={`${card} text-center`}><Link href="/login" className={btnPrimary}>سجّلوا دخول</Link></div>);
  if (!loaded) return wrap(<div className="py-10 text-center text-muted">جاري التحميل…</div>);
  if (!meta) return wrap(<div className={`${card} text-center`}><p className="mb-3 text-muted">ما فيه غرفة بهالكود</p><Link href="/play" className={btnPrimary}>ارجعوا للألعاب</Link></div>);

  const side = sideOf(meta, me.uid);
  if (!side) return wrap(<div className={`${card} text-center text-muted`}>{joinMsg || "جاري الدخول للغرفة…"}</div>);

  const m = meta as Meta;
  const title = GAME_NAME[m.game];

  // بانتظار الطرف الثاني
  if (!m.players.b) {
    return wrap(
      <div className={`${card} space-y-4 text-center`}>
        <div className="text-sm text-muted">{title}</div>
        <div className="text-muted">شاركوا هالكود مع الطرف الثاني</div>
        <div className="font-black tracking-[0.4em] text-5xl text-pink-500">{code}</div>
        <div className="text-xs text-muted">بانتظار الانضمام…</div>
      </div>,
      title
    );
  }

  const props = { code, meta: m, state, me: { uid: me.uid, name: me.name }, side };
  const game =
    m.game === "skribbl" ? <SkribblGame {...props} /> :
    m.game === "quiz" ? <QuizGame {...props} /> :
    m.game === "words" ? <WordsGame {...props} /> :
    <BattleGame {...props} />;

  return wrap(game, title);
}
