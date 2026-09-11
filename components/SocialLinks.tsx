import {
  Send,
  Camera,
  PlayCircle,
  AtSign,
  Briefcase,
  ThumbsUp,
  Globe,
  type LucideIcon,
} from "lucide-react";
import type { SocialLink } from "@/lib/types";
import { safeExternalUrl } from "@/lib/safeUrl";

// Lucide doesn't ship trademarked brand logos, so each platform gets a
// generic stand-in icon — the visible text label next to it is what
// actually identifies the platform (same idiom the Telegram link already
// used before this component existed: a paper-plane, not Telegram's logo).
const PLATFORM: Record<string, { label: string; icon: LucideIcon }> = {
  telegram: { label: "Telegram", icon: Send },
  instagram: { label: "Instagram", icon: Camera },
  youtube: { label: "YouTube", icon: PlayCircle },
  x: { label: "X", icon: AtSign },
  linkedin: { label: "LinkedIn", icon: Briefcase },
  facebook: { label: "Facebook", icon: ThumbsUp },
  website: { label: "Website", icon: Globe },
};

export function SocialLinks({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null;

  return (
    <>
      {links.map((link) => {
        const meta = PLATFORM[link.platform];
        const Icon = meta?.icon ?? Globe;
        const label = meta?.label ?? link.platform;
        // Anything that isn't a real http(s) link (a `javascript:` URL, say)
        // is dropped rather than rendered as a dead or dangerous button.
        const href = safeExternalUrl(link.url);

        if (!href) return null;

        return (
          <a
            key={link.platform}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-500 hover:text-zinc-900"
          >
            <Icon className="h-4 w-4" />
            {label}
          </a>
        );
      })}
    </>
  );
}
