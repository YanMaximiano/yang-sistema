import { ChevronDown } from "lucide-react";
import { BotaoAjuda } from "./BotaoAjuda";

/**
 * Seção numerada que abre e fecha (<details>, funciona até sem JavaScript). O "?" abre o
 * assistente já naquela seção. Seções importantes começam abertas; as de configuração, fechadas.
 */
export function SecaoCalc({
  id,
  numero,
  titulo,
  resumo,
  descricao,
  aberta,
  ajuda,
  children,
}: {
  id: string;
  numero: string;
  titulo: string;
  resumo?: string;
  descricao?: string;
  aberta?: boolean;
  ajuda?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      open={aberta}
      className="group scroll-mt-6 border-b border-neutral-200 first-of-type:border-t dark:border-neutral-800"
    >
      <summary className="flex cursor-pointer list-none items-center gap-4 py-6 [&::-webkit-details-marker]:hidden">
        <span className="w-7 shrink-0 text-xs font-bold tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
          {numero}
        </span>
        <span className="min-w-0 flex-1 text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {titulo}
        </span>
        {resumo && (
          <span className="hidden text-[13px] text-neutral-500 dark:text-neutral-400 md:block">{resumo}</span>
        )}
        {ajuda && <BotaoAjuda passo={ajuda} titulo={titulo} />}
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="shrink-0 text-neutral-400 transition-transform group-open:rotate-180 dark:text-neutral-500"
        />
      </summary>
      <div className="pb-12 md:pl-11">
        {descricao && (
          <p className="mb-6 max-w-3xl text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            {descricao}
          </p>
        )}
        {children}
      </div>
    </details>
  );
}
