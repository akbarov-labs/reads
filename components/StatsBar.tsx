interface Stat {
  label: string;
  value: string;
}

// Spelled out so Tailwind sees each class: one column per stat shown.
const COLUMNS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3"];

/** Nothing at all when there is no number worth showing. */
export function StatsBar({ stats }: { stats: Stat[] }) {
  if (stats.length === 0) return null;

  return (
    <section className={`grid ${COLUMNS[Math.min(stats.length, 3)]} divide-x divide-zinc-200 border-b border-zinc-200 py-8`}>
      {stats.map((stat) => (
        <div key={stat.label} className="px-4 text-center first:pl-0 sm:px-8">
          <p className="font-serif text-3xl text-zinc-900 sm:text-4xl">
            {stat.value}
          </p>
          <p className="mt-1.5 text-xs font-medium uppercase tracking-widest2 text-zinc-500">
            {stat.label}
          </p>
        </div>
      ))}
    </section>
  );
}
