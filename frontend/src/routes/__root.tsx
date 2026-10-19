import type { QueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BookText,
  Building2,
  FlaskConical,
  Gauge,
  ListChecks,
  MessageSquareText,
  Moon,
  Plus,
  Sun,
  UserCheck,
} from "lucide-react";
import { Toaster } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { q } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <h1 className="text-xl font-semibold">Pagina non trovata</h1>
      <Link to="/" className="mt-3 inline-block text-primary underline underline-offset-4">
        Torna alla panoramica
      </Link>
    </div>
  ),
});

const NAV = [
  { to: "/", label: "Panoramica", icon: Gauge },
  { to: "/coda", label: "Coda", icon: ListChecks },
  { to: "/anagrafiche", label: "Anagrafiche", icon: Building2 },
  { to: "/revisione", label: "Revisione", icon: UserCheck, badge: true },
  { to: "/prove", label: "Prove sul motore", icon: FlaskConical },
  { to: "/regole", label: "Regole", icon: BookText },
  { to: "/feedback", label: "Feedback", icon: MessageSquareText },
] as const;

function RootLayout() {
  const { theme, toggle } = useTheme();
  const stats = useQuery({ ...q.stats(), refetchInterval: 15_000 });
  const pending = stats.data?.pending_review ?? 0;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const ThemeIcon = theme === "dark" ? Sun : Moon;
  const themeLabel = theme === "dark" ? "Tema chiaro" : "Tema scuro";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      {/* Barra laterale (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Brand />
        <Link to="/nuova" className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full")}>
          <Plus /> Nuova richiesta
        </Link>
        <nav className="mt-6 grid gap-0.5" aria-label="Sezioni">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="group flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted transition-colors hover:bg-ink/5 hover:text-ink data-[status=active]:bg-primary-soft data-[status=active]:font-medium data-[status=active]:text-ink"
            >
              <item.icon className="size-[18px] group-data-[status=active]:text-primary" />
              <span className="flex-1">{item.label}</span>
              {"badge" in item && pending > 0 && (
                <span className="tnum min-w-6 rounded-full bg-alta px-1.5 text-center text-xs leading-5 font-semibold text-white">
                  {pending}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto grid gap-3">
          <button
            type="button"
            onClick={toggle}
            className="flex h-9 items-center gap-3 rounded-md px-3 text-sm text-muted hover:bg-ink/5 hover:text-ink"
          >
            <ThemeIcon className="size-[18px]" /> {themeLabel}
          </button>
          <p className="px-3 text-xs text-muted">
            Prototipo con dati sintetici. Le proposte del sistema vanno sempre confermate da una persona.
          </p>
        </div>
      </aside>

      {/* Barra superiore (mobile e tablet) */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <Brand compact />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggle}
              aria-label={themeLabel}
              className="grid size-10 place-items-center rounded-md text-muted hover:bg-ink/5"
            >
              <ThemeIcon className="size-5" />
            </button>
            <Link to="/nuova" className={buttonVariants({ size: "sm" })}>
              <Plus /> Nuova
            </Link>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]" aria-label="Sezioni">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm text-muted data-[status=active]:bg-ink data-[status=active]:text-paper"
            >
              {item.label}
              {"badge" in item && pending > 0 && <span className="tnum text-xs font-semibold">{pending}</span>}
            </Link>
          ))}
        </nav>
      </header>

      <main key={pathname} className="mx-auto w-full max-w-6xl px-4 pt-8 pb-20 sm:px-8 lg:pt-12">
        <Outlet />
      </main>

      <Toaster
        position="bottom-right"
        theme={theme}
        toastOptions={{ classNames: { toast: "!font-sans !rounded-md !border-line" } }}
      />
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3 rounded-md px-1">
      <img src="/favicon.svg" alt="" className={compact ? "size-8" : "size-9"} />
      <span className="leading-tight">
        <span className="block text-lg font-semibold tracking-[-0.01em]">ARIA</span>
        {!compact && <span className="block text-xs text-muted">Triage richieste NSE</span>}
      </span>
    </Link>
  );
}
