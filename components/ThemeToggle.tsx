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
        "inline-flex items-center justify-center w-8 h-8 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-colors",
        className
      )}
    >
      {escuro ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
