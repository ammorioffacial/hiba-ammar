"use client";

import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { sfx } from "@/lib/sound";

// شاشة تمرير الجهاز: تخفي الشاشة حتى يجاوب اللاعب بالسر
export function Handoff({ name, text, onReady }: { name: string; text: string; onReady: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-bg/95 p-6 backdrop-blur">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-sm text-center">
        <Smartphone className="mx-auto mb-4 h-14 w-14 text-pink-500" />
        <h2 className="mb-2 font-script text-4xl text-pink-400">{name}</h2>
        <p className="mb-6 text-muted">{text}</p>
        <button
          onClick={() => {
            sfx.click();
            onReady();
          }}
          className="rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-8 py-3 font-bold text-white shadow-lg"
        >
          أنا جاهز/ة
        </button>
      </motion.div>
    </div>
  );
}
