"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lista editável em etiquetas: adiciona com Enter (ou no botão) e remove no "x". Cada etiqueta
 * vai para o formulário como um campo oculto com o mesmo nome (ex.: categoria, categoria, ...).
 */
export function ListaDeTags({
  nome,
  valores,
  rotulo,
  placeholder,
  sufixo = "",
  numerica = false,
  fixas = [],
}: {
  nome: string;
  valores: (string | number)[];
  rotulo: string;
  placeholder: string;
  sufixo?: string;
  numerica?: boolean;
  fixas?: string[];
}) {
  const [itens, setItens] = useState<string[]>(valores.map(String));
  const [novo, setNovo] = useState("");

  function adicionar() {
    const texto = novo.trim().replace(",", numerica ? "." : ",");
    if (!texto) return;
    if (numerica && !Number.isFinite(Number(texto))) return;
    if (!itens.includes(texto)) {
      setItens((atual) => {
        const lista = [...atual, texto];
        return numerica ? lista.sort((a, b) => Number(a) - Number(b)) : lista;
      });
    }
    setNovo("");
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
        {rotulo}
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {itens.map((v) => {
          const fixa = fixas.includes(v);
          return (
            <span
              key={v}
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-full border border-neutral-200 bg-white pl-4 text-sm font-semibold dark:border-neutral-800 dark:bg-neutral-900",
                fixa ? "pr-4" : "pr-1.5"
              )}
            >
              {v.replace(".", ",")}
              {sufixo}
              {!fixa && (
                <button
                  type="button"
                  onClick={() => setItens((atual) => atual.filter((x) => x !== v))}
                  aria-label={`Remover ${v}`}
                  className="inline-flex size-6 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </span>
          );
        })}
        {itens.map((v) => (
          <input key={`campo-${v}`} type="hidden" name={nome} value={v} />
        ))}
      </div>
      <div className="flex max-w-sm gap-2">
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder={placeholder}
          inputMode={numerica ? "decimal" : "text"}
          aria-label={`Adicionar: ${rotulo}`}
          className="min-w-0 flex-1 rounded-full border border-dashed border-neutral-300 bg-transparent px-4 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[var(--destaque)] focus:outline-none focus:ring-4 focus:ring-[var(--destaque-suave)] dark:border-neutral-700 dark:text-neutral-100"
        />
        <button
          type="button"
          onClick={adicionar}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          <Plus size={14} aria-hidden="true" />
          Adicionar
        </button>
      </div>
    </div>
  );
}
