"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ref, get, set, update, onValue, runTransaction } from "firebase/database";
import { Shell, TopControls } from "@/components/Shell";
import { ScoreBox, btnPrimary, btnGhost, card } from "@/components/ui";
import { celebrate } from "@/components/Providers";
import { db, firebaseReady } from "@/lib/firebase";
import { useOnline } from "@/lib/online";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";

type Sym = "X" | "O";
type Player = { uid: string; name: string } | null;
interface Room {
  X: Player;
  O: Player;
  board: string[];
  turn: Sym;
  winner: Sym | "D" | null;
}

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function winnerOf(b: string[]): Sym | "D" | null {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a] as Sym;
  }
  return b.every(Boolean) ? "D" : null;
}

export default function OnlinePage() {
  const me = useOnline((s) => s.me);
  const authReady = useOnline((s) => s.authReady);
  const names = useStore((s) => s.names);
  const recordPlay = useStore((s) => s.recordPlay);

  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    recordPlay();
  }, []);

  // استماع مباشر للغرفة
  useEffect(() => {
    if (!code || !db) return;
    return onValue(ref(db, `rooms/${code}`), (s) => setRoom(s.val()));
  }, [code]);

  const mySym: Sym | null = room && me
    ? room.X?.uid === me.uid ? "X" : room.O?.uid === me.uid ? "O" : null
    : null;

  const create = async () => {
    if (!db || !me) return;
    const c = String(1000 + Math.floor(Math.random() * 9000));
    await set(ref(db, `rooms/${c}`), {
      X: { uid: me.uid, name: me.name },
      O: null,
      board: Array(9).fill(""),
      turn: "X",
      winner: null,
    });
    sfx.click();
    setErr("");
    setCode(c);
  };

  const join = async () => {
    if (!db || !me) return;
    setErr("");
    const snap = await get(ref(db, `rooms/${joinCode.trim()}`));
    if (!snap.exists()) return setErr("ما فيه غرفة بهالكود");
    const r = snap.val() as Room;
    const already = r.X?.uid === me.uid || r.O?.uid === me.uid;
    if (!already) {
      if (r.O) return setErr("الغرفة ممتلئة");
      await update(ref(db, `rooms/${joinCode.trim()}`), { O: { uid: me.uid, name: me.name } });
    }
    sfx.click();
    setCode(joinCode.trim());
  };

  // الحركة تتم داخل transaction، عشان لو الطرفين ضغطوا بنفس الوقت ما يصير تعارض
  const move = (i: number) => {
    if (!db || !code || !mySym) return;
    runTransaction(ref(db, `rooms/${code}`), (r: Room | null) => {
      if (!r || r.winner || r.turn !== mySym || (r.board ?? [])[i]) return undefined;
      const board = [...(r.board ?? Array(9).fill(""))];
      board[i] = mySym;
      return { ...r, board, turn: mySym === "X" ? "O" : "X", winner: winnerOf(board) };
    });
    sfx.pick();
  };

  const rematch = async () => {
    if (!db || !code) return;
    await update(ref(db, `rooms/${code}`), { board: Array(9).fill(""), turn: "X", winner: null });
  };

  // احتفال عند الفوز
  useEffect(() => {
    if (room?.winner === mySym && mySym) {
      sfx.win();
      celebrate(120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.winner]);

  if (!firebaseReady) {
    return (
      <Shell title="أونلاين" action={<TopControls />}>
        <div className={card}><p className="text-sm text-muted">الأونلاين يحتاج إعداد Firebase أولاً.</p></div>
      </Shell>
    );
  }

  if (!authReady) {
    return <Shell title="أونلاين" action={<TopControls />}><div className="py-10 text-center text-muted">جاري التحميل…</div></Shell>;
  }

  if (!me) {
    return (
      <Shell title="أونلاين" action={<TopControls />}>
        <div className={`${card} text-center`}>
          <p className="mb-4 text-muted">لازم تسجلون دخول عشان الموقع يعرف إنك {names.a} ولا {names.b}</p>
          <Link href="/login" className={btnPrimary}>تسجيل الدخول</Link>
        </div>
      </Shell>
    );
  }

  // ===== بدون غرفة: إنشاء أو انضمام =====
  if (!code) {
    return (
      <Shell title="إكس أو أونلاين" action={<TopControls />}>
        <div className={`${card} space-y-4`}>
          <button className={`${btnPrimary} w-full`} onClick={create}>أنشئ غرفة جديدة</button>
          <Link href="/play" className="block rounded-2xl border border-line bg-surface-2 py-3 text-center font-bold">ألعاب أونلاين أخرى</Link>
          <div className="text-center text-xs text-muted">أو</div>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              maxLength={4}
              placeholder="كود الغرفة"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="min-w-0 flex-1 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-center text-lg font-black outline-none focus:border-pink-400 select-text"
            />
            <button className={btnGhost} onClick={join}>ادخل</button>
          </div>
          {err && <p className="text-sm text-rose-400">{err}</p>}
        </div>
      </Shell>
    );
  }

  // ===== داخل الغرفة =====
  const board = room?.board ?? Array(9).fill("");
  const xName = room?.X?.name ?? "—";
  const oName = room?.O?.name ?? "بانتظار الطرف الثاني…";
  const waiting = !room?.O;
  const turnName = room?.turn === "X" ? xName : oName;
  const status = !room
    ? "جاري التحميل…"
    : waiting
      ? `شاركوا الكود ${code} مع ${me.name === xName ? names.b : names.a}`
      : room.winner
        ? room.winner === "D" ? "تعادل" :`${room.winner === "X" ? xName : oName} فاز`
        : mySym === room.turn ? "دورك الحين" : `دور ${turnName}`;

  return (
    <Shell title="إكس أو أونلاين" action={<button className={btnGhost + " text-sm"} onClick={() => setCode("")}>خروج</button>}>
      <div className="mb-3 flex gap-2">
        <ScoreBox label={`${xName} (X)`} value={mySym === "X" ? "أنت" : ""} active={room?.turn === "X"} />
        <ScoreBox label="الكود" value={code} />
        <ScoreBox label={oName} value={mySym === "O" ? "أنت" : ""} active={room?.turn === "O"} />
      </div>

      <div className={card}>
        <div className="mb-3 min-h-6 text-center font-black">{status}</div>
        <div className="mx-auto grid max-w-[340px] grid-cols-3 gap-2.5">
          {board.map((v, i) => {
            const won = room?.winner && room.winner !== "D" && LINES.some((l) => l.includes(i) && l.every((k) => board[k] === room.winner));
            return (
              <button
                key={i}
                disabled={waiting || !!room?.winner || !!board[i] || room?.turn !== mySym}
                onClick={() => move(i)}
                className={`grid aspect-square place-items-center rounded-2xl border border-line text-4xl font-black transition ${
                  won ? "bg-gold/25 border-gold" : "bg-surface-2"
                } ${v === "X" ? "text-pink-500" : v === "O" ? "text-pink-200" : ""}`}
              >
                {v === "X" ? "✕" : v === "O" ? "◯" : ""}
              </button>
            );
          })}
        </div>
        {room?.winner && (
          <div className="mt-4 flex justify-center">
            <button className={btnPrimary} onClick={rematch}>جولة ثانية</button>
          </div>
        )}
      </div>
    </Shell>
  );
}
