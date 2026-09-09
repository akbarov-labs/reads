import { ArrowRight } from "lucide-react";

export function LanguagePairBadge({ from, to }: { from: string; to: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-stone-50 px-3 py-1 text-xs font-medium text-zinc-700">
      {from}
      <ArrowRight className="h-3 w-3 text-zinc-400" />
      {to}
    </span>
  );
}
