import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import type { Taqrizchi } from "@/lib/types";

/** @see TranslatorCard — the same card, for the other kind of profile. */
export function TaqrizchiCard({
  taqrizchi,
  countLabel,
  viewLabel,
}: {
  taqrizchi: Taqrizchi;
  countLabel: string;
  viewLabel: string;
}) {
  return (
    <Link
      href={`/taqrizchi/${taqrizchi.slug}`}
      className="group block bg-white rounded-2xl border border-stone-200 p-5 hover:border-forest-300 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-stone-100 border border-stone-200">
          {taqrizchi.avatarUrl ? (
            <Image
              src={taqrizchi.avatarUrl}
              alt={taqrizchi.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-serif text-xl text-stone-400">
              {taqrizchi.name.charAt(0)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg text-zinc-900 leading-tight group-hover:text-forest-800 transition-colors truncate">
            {taqrizchi.name}
          </h3>
          {taqrizchi.title && (
            <p className="mt-0.5 text-xs text-zinc-500 truncate">{taqrizchi.title}</p>
          )}
          {taqrizchi.location && (
            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
              <MapPin className="h-3 w-3 shrink-0" />
              {taqrizchi.location}
            </p>
          )}
        </div>
      </div>

      {taqrizchi.bio && (
        <p className="mt-4 text-sm text-zinc-600 line-clamp-2">{taqrizchi.bio}</p>
      )}

      <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
        <span className="text-xs text-zinc-400">{countLabel}</span>
        <span className="text-xs font-medium text-forest-700 group-hover:text-forest-900 transition-colors">
          {viewLabel}
          <ArrowRight aria-hidden="true" className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
        </span>
      </div>
    </Link>
  );
}
