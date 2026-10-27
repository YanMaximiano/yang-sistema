"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

function observarTema(aoMudar: () => void) {
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observador.disconnect();
}

const temaEscuroAtual = () => document.documentElement.classList.contains("dark");

export function ThemeToggle({ className }: { className?: string }) {
  const escuro = useSyncExternalStore(observarTema, temaEscuroAtual, () => false);

  function alternar() {
    const novoEscuro = !escuro;
    document.documentElement.classList.toggle("dark", novoEscuro);
    try {
      localStorage.setItem("theme", novoEscuro ? "dark" : "light");
    } catch {
      // armazenamento bloqueado (aba anônima etc.): o tema vale só nesta sessão
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={escuro ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-100",
        className
      )}
    >
      {escuro ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
