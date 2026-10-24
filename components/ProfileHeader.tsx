import Image from "next/image";
import { MapPin } from "lucide-react";
import type { Translator } from "@/lib/types";
import { SocialLinks } from "@/components/SocialLinks";
import { InquiryForm } from "@/components/InquiryForm";

/**
 * The top of a translator's profile. Every line is there only when the
 * translator filled it in: no pin without a place, no empty bio paragraph.
 */
export function ProfileHeader({ translator }: { translator: Translator }) {
  const location = translator.location?.trim();
  const bio = translator.bio?.trim();
  const pairs = translator.languagePairs;

  return (
    <section className="border-b border-zinc-200 py-12 sm:py-16">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-zinc-100 sm:h-32 sm:w-32 border border-zinc-200">
          {translator.avatarUrl ? (
            <Image
              src={translator.avatarUrl}
              alt={translator.name}
              fill
              sizes="128px"
              className="object-cover"
              priority
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-serif text-4xl text-stone-400">
              {translator.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-serif text-3xl text-zinc-900 sm:text-4xl">
                {translator.name}
              </h1>
              {location && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-zinc-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {location}
                </p>
              )}
            </div>
            {translator.socialLinks.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <SocialLinks links={translator.socialLinks} />
              </div>
            )}
          </div>

          {bio && (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-600">
              {bio}
            </p>
          )}

          {/* The language pairs are what the translator takes on, which can
              differ from what their books show (Uzbek into English, say), so
              they appear here only as the form's choices. Reads-admin only
              accepts an inquiry for a listed pair, so without one the form
              could never be sent. */}
          {pairs.length > 0 && (
            <div className="mt-6">
              <InquiryForm
                slug={translator.slug}
                languagePairs={pairs}
                turnstileSiteKey={process.env.TURNSTILE_SITE_KEY || null}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
