import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  count?: number;
  seeMoreHref?: string;
  seeMoreLabel?: string;
}

export function SectionHeader({
  title,
  count,
  seeMoreHref,
  seeMoreLabel = "See all",
}: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between mb-8 pb-4 border-b border-stone-200">
      <div className="flex items-baseline gap-3">
        <h2 className="font-serif text-2xl sm:text-3xl text-zinc-900 tracking-tight">
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-xs font-medium uppercase tracking-widest2 text-zinc-400">
            {count}
          </span>
        )}
      </div>
      {seeMoreHref && (
        <Link
          href={seeMoreHref}
          className="group flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
        >
          {seeMoreLabel}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
