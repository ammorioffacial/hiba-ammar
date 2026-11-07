"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell, TopControls } from "@/components/Shell";
import { ClientOnly } from "@/components/ClientOnly";
import { btnPrimary, btnGhost, card } from "@/components/ui";
import { useOnline } from "@/lib/online";
import { firebaseReady } from "@/lib/firebase";
import { createRoom, joinGame } from "@/lib/play";
import { sfx } from "@/lib/sound";

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
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!firebaseReady) return <Shell title="ألعاب أونلاين" action={<TopControls />}><div className={card}><p className="text-sm text-muted">الأونلاين يحتاج إعداد Firebase.</p></div></Shell>;
  if (!me) return <Shell title="ألعاب أونلاين" action={<TopControls />}><div className={`${card} text-center`}><p className="mb-3 text-muted">سجّلوا دخول أول</p><Link href="/login" className={btnPrimary}>تسجيل الدخول</Link></div></Shell>;

  const create = async () => {
    setBusy(true);
    setErr("");
    try {
      const c = await createRoom(me.uid, me.name);
      sfx.win();
      router.push(`/play/${c}`);
    } catch {
      setErr("تعذر إنشاء الغرفة، جربوا مرة ثانية");
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
      <div className={`${card} space-y-3 text-center`}>
        <div className="font-black">أنشئوا غرفة وشاركوا الكود</div>
        <div className="text-sm text-muted">داخل الغرفة تختارون أي لعبة: إكس أو، الرسم، الأسئلة، الكلمات، أو السفن</div>
        <button className={`${btnPrimary} w-full`} disabled={busy} onClick={create}>أنشئ غرفة</button>
      </div>

      <div className={`${card} mt-4 space-y-3`}>
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
