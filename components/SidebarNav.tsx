"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type ItemDeMenu = { href: string; label: string; badge?: number };

// menu lateral (e faixa rolável no celular) que marca a página aberta com um ponto âmbar
export function SidebarNav({ itens }: { itens: ItemDeMenu[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="flex gap-1 overflow-x-auto px-4 py-2 md:flex-1 md:flex-col md:gap-0.5 md:overflow-visible md:px-4 md:py-6"
    >
      {itens.map((item) => {
        const ativo = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
              ativo
                ? "text-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "hidden size-1.5 shrink-0 rounded-full transition-colors md:block",
                ativo ? "fundo-destaque" : "bg-transparent group-hover:bg-neutral-300 dark:group-hover:bg-neutral-700"
              )}
            />
            {item.label}
            {!!item.badge && item.badge > 0 && (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-[11px] font-bold text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
