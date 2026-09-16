import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { MapPin } from "lucide-react";
import type { Translator } from "@/lib/types";
import { LanguagePairBadge } from "@/components/LanguagePairBadge";

interface TranslatorCardProps {
  translator: Translator;
}

export function TranslatorCard({ translator }: TranslatorCardProps) {
  return (
    <Link
      href={`/translator/${translator.slug}`}
      className="group block bg-white rounded-2xl border border-stone-200 p-5 hover:border-amber-300 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-stone-100 border border-stone-200">
          {translator.avatarUrl ? (
            <Image
              src={translator.avatarUrl}
              alt={translator.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-serif text-xl text-stone-400">
              {translator.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg text-zinc-900 leading-tight group-hover:text-amber-800 transition-colors truncate">
            {translator.name}
          </h3>
          {translator.title && (
            <p className="mt-0.5 text-xs text-zinc-500 truncate">{translator.title}</p>
          )}
          {translator.location && (
            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
              <MapPin className="h-3 w-3 shrink-0" />
              {translator.location}
            </p>
          )}
        </div>
      </div>

      {/* Language pairs */}
      {translator.languagePairs.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {translator.languagePairs.slice(0, 3).map((pair) => (
            <LanguagePairBadge
              key={`${pair.from}-${pair.to}`}
              from={pair.from}
              to={pair.to}
            />
          ))}
          {translator.languagePairs.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-zinc-400 bg-stone-100 border border-stone-200">
              +{translator.languagePairs.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Book count footer */}
      <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
        <span className="text-xs text-zinc-400">
          {translator.totalBooksTranslated} book{translator.totalBooksTranslated !== 1 ? "s" : ""}
        </span>
        <span className="text-xs font-medium text-amber-700 group-hover:text-amber-900 transition-colors">
          View profile →
        </span>
      </div>
    </Link>
  );
}
