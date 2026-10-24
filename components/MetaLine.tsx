import { joinPresent } from "@/lib/format";

/**
 * A card's small line of facts ("Sharq · 2015"), with only the parts that
 * have a value. Renders nothing when none do: no empty line holding space,
 * no lone separator.
 */
export function MetaLine({
  parts,
  className,
  as: Tag = "p",
}: {
  parts: Parameters<typeof joinPresent>[0];
  className?: string;
  as?: "p" | "span";
}) {
  const text = joinPresent(parts);

  return text ? <Tag className={className}>{text}</Tag> : null;
}
