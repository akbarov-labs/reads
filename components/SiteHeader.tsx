import { Link } from "@/i18n/navigation";
import { Container } from "@/components/Container";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function SiteHeader({
  name = "Reads",
  subtitle,
}: {
  name?: string;
  subtitle?: string;
}) {
  return (
    <header className="border-b border-zinc-200 bg-white/70 backdrop-blur-sm sticky top-0 z-20">
      <Container className="flex items-center justify-between py-4">
        <Link
          href="/"
          className="font-serif text-xl tracking-tight text-zinc-900 font-semibold"
        >
          {name}
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-600">
          {subtitle && (
            <span className="hidden sm:inline font-sans text-xs uppercase tracking-wider text-zinc-500">
              {subtitle}
            </span>
          )}
          <LocaleSwitcher />
        </nav>
      </Container>
    </header>
  );
}
