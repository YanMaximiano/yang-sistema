"use client";

import { CircleHelp } from "lucide-react";
import { abrirAssistente } from "@/components/Assistente";

// "?" ao lado do título de cada seção: abre o assistente já no passo daquela seção
export function BotaoAjuda({ passo, titulo }: { passo: string; titulo: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // fica dentro do cabeçalho da seção: não pode abrir nem fechar a seção
        e.preventDefault();
        e.stopPropagation();
        abrirAssistente(passo);
      }}
      aria-label={`Explicar: ${titulo}`}
      title="Explicar esta parte"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      <CircleHelp size={16} aria-hidden="true" />
    </button>
  );
}
