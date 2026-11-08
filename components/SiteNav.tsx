"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { SITE_SECTIONS, isInSection } from "@/lib/siteSections";

/**
 * The catalogue's sections, with the one the reader is in marked. It scrolls
 * sideways when a narrow phone can't fit them all, as Russian's longer names
 * need.
 */
export function SiteNav({ className = "" }: { className?: string }) {
  const tSite = useTranslations("site");
  const tHome = useTranslations("home");
  const pathname = usePathname();

  return (
    <nav
      aria-label={tSite("sectionsLabel")}
      className={`items-center gap-0.5 overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {SITE_SECTIONS.map((section) => {
        const active = isInSection(pathname, section);
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={pathname === section.href ? "page" : undefined}
            className={`flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 font-medium transition-colors duration-200 ${
              active ? "bg-forest-100 text-forest-800" : "text-zinc-600 hover:bg-stone-100 hover:text-zinc-900"
            }`}
          >
            {tHome(section.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
