// عناصر مشتركة بين الألعاب الجديدة

export function ScoreBox({ label, value, active }: { label: string; value: React.ReactNode; active?: boolean }) {
  return (
    <div className={`min-w-0 flex-1 rounded-2xl border p-2.5 text-center transition ${active ? "border-pink-400 bg-pink-500/10" : "border-line bg-surface"}`}>
      <div className="truncate text-xs text-muted">{label}</div>
      <div className="text-2xl font-black text-pink-500">{value}</div>
    </div>
  );
}

export function ModeTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-2xl bg-black/20 p-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`shrink-0 flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
            value === o.v ? "bg-gradient-to-l from-pink-500 to-rose-600 text-white shadow-lg" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const btnPrimary =
  "rounded-2xl bg-gradient-to-l from-pink-500 to-rose-600 px-6 py-3 font-bold text-white shadow-lg disabled:opacity-40";
export const btnGhost = "rounded-2xl border border-line bg-surface-2 px-4 py-2.5 font-bold disabled:opacity-40";
export const card = "rounded-3xl border border-line bg-surface p-5 backdrop-blur";

export const shuffle = <T,>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
