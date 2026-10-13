"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const novoEscuro = !escuro;
    document.documentElement.classList.toggle("dark", novoEscuro);
    localStorage.setItem("theme", novoEscuro ? "dark" : "light");
    setEscuro(novoEscuro);
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
