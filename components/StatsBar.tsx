interface Stat {
  label: string;
  value: string;
}

export function StatsBar({ stats }: { stats: Stat[] }) {
  return (
    <section className="grid grid-cols-3 divide-x divide-zinc-200 border-b border-zinc-200 py-8">
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
