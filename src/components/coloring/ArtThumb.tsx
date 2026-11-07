import { VIEW, type Colors, type Template } from "@/lib/coloring/templates";

// معاينة رسمة (غير تفاعلية)
export function ArtThumb({ template, colors, className }: { template: Template; colors: Colors; className?: string }) {
  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className={className} aria-hidden="true">
      {template.regions.map((r) => (
        <path
          key={r.id}
          d={r.d}
          fill={colors[r.id] ?? "#ffffff"}
          stroke="#3b2a33"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
