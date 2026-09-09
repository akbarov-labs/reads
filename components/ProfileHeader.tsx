import Image from "next/image";
import { MapPin } from "lucide-react";
import type { Translator } from "@/lib/types";
import { LanguagePairBadge } from "@/components/LanguagePairBadge";
import { SocialLinks } from "@/components/SocialLinks";
import { InquiryForm } from "@/components/InquiryForm";

export function ProfileHeader({ translator }: { translator: Translator }) {
  return (
    <section className="border-b border-zinc-200 py-12 sm:py-16">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-zinc-100 sm:h-32 sm:w-32 border border-zinc-200">
          <Image
            src={translator.avatarUrl}
            alt={translator.name}
            fill
            sizes="128px"
            className="object-cover"
            priority
          />
        </div>
        <div className="flex-1">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-serif text-3xl text-zinc-900 sm:text-4xl">
                {translator.name}
              </h1>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-500">
                <MapPin className="h-3.5 w-3.5" />
                {translator.location}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SocialLinks links={translator.socialLinks} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {translator.languagePairs.map((pair) => (
              <LanguagePairBadge
                key={`${pair.from}-${pair.to}`}
                from={pair.from}
                to={pair.to}
              />
            ))}
          </div>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-600">
            {translator.bio}
          </p>

          <div className="mt-6">
            <InquiryForm
              slug={translator.slug}
              languagePairs={translator.languagePairs}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
