"use client";

import Link from "next/link";
import { Shell, TopControls } from "@/components/Shell";
import { card } from "@/components/ui";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/sound";
import {
  Clapperboard, MessageSquare, Target, Images, ClipboardCheck, Moon, Mail,
  Heart, Gift, Calendar, MessagesSquare, type LucideIcon,
} from "lucide-react";

const ITEMS: { href: string; name: string; desc: string; icon: LucideIcon }[] = [
  { href: "/together/cinema", name: "مود السينما", desc: "ماذا نشاهد الليلة؟", icon: Clapperboard },
  { href: "/together/bucket", name: "قائمة الأمنيات", desc: "أحلامكم اللي تحققونها سوا", icon: Target },
  { href: "/together/question", name: "سؤال اليوم", desc: "سؤال جديد كل يوم", icon: MessageSquare },
  { href: "/together/album", name: "ألبوم الذكريات", desc: "صوركم وقصصكم", icon: Images },
  { href: "/together/challenges", name: "تحديات الأسبوع", desc: "أنشطة تقربكم أكثر", icon: ClipboardCheck },
  { href: "/together/relax", name: "مود الاسترخاء", desc: "أصوات هادية ونوم", icon: Moon },
  { href: "/together/capsules", name: "رسائل مخفية", desc: "رسائل تنفتح بوقتها", icon: Mail },
  { href: "/together/love", name: "عداد الحب", desc: "من متى وأنتم سوا", icon: Heart },
  { href: "/together/surprise", name: "صندوق المفاجآت", desc: "هدايا وكوبونات", icon: Gift },
  { href: "/calendar", name: "تقويم الذكريات", desc: "أيام لعبكم وسلسلتكم", icon: Calendar },
  { href: "/together/chat", name: "الدردشة", desc: "رسائل وملاحظات مثبتة", icon: MessagesSquare },
];

export default function TogetherHub() {
  return (
    <Shell title="سوا" action={<TopControls />}>
      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map(({ href, name, desc, icon: Icon }) => (
          <Link key={href} href={href} onClick={() => sfx.click()} className={`${card} flex flex-col gap-2 p-4 transition hover:border-pink-400`}>
            <Icon className="h-7 w-7 text-pink-500" />
            <div className="font-black">{name}</div>
            <div className="text-xs text-muted">{desc}</div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}
