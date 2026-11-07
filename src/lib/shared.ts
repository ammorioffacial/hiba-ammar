"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onValue, ref, set } from "firebase/database";
import { db } from "./firebase";
import { useOnline } from "./online";

// بيانات تتزامن بين الجوالين عبر Firebase. إذا ما فيه تسجيل دخول، تنحفظ على الجهاز.
export function useShared<T>(key: string, initial: T) {
  const me = useOnline((s) => s.me);
  const [val, setVal] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const latest = useRef<T>(initial);
  const lsKey = `shared-${key}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const v = JSON.parse(raw) as T;
        latest.current = v;
        setVal(v);
      }
    } catch {
      // تخزين محلي تالف
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!db || !me) return;
    return onValue(ref(db, `shared/${key}`), (snap) => {
      const v = snap.val() as T | null;
      if (v === null) return;
      latest.current = v;
      setVal(v);
      try {
        localStorage.setItem(lsKey, JSON.stringify(v));
      } catch {
        // الحجم كبير أو التخزين مغلق
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, me?.uid]);

  const save = useCallback(
    (next: T | ((p: T) => T)) => {
      const v = typeof next === "function" ? (next as (p: T) => T)(latest.current) : next;
      latest.current = v;
      setVal(v);
      try {
        localStorage.setItem(lsKey, JSON.stringify(v));
      } catch {
        // تجاهل
      }
      if (db && me) set(ref(db, `shared/${key}`), v);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, me?.uid]
  );

  return { value: val, save, loaded, online: !!me };
}

