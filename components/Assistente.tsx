"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { Button, comDestaque } from "@/components/ui";
import { cn } from "@/lib/utils";
import { marcarTutorialVisto } from "@/app/(app)/conta/actions";
import type { Passo } from "@/lib/tutoriais";

const EVENTO_ABRIR = "assistente:abrir";

/** Abre o assistente, opcionalmente já num passo (usado pelos botões "?" das seções). */
export function abrirAssistente(passo?: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR, { detail: { passo } }));
}

function abrirSecoesAte(el: Element) {
  for (let n: Element | null = el; n; n = n.parentElement) {
    if (n instanceof HTMLDetailsElement) n.open = true;
  }
}

// só entram no roteiro os passos cuja parte da tela existe (some o que a pessoa não tem permissão de ver)
function passosPresentes(passos: Passo[]) {
  return passos.filter((p) => !p.alvo || document.querySelector(p.alvo));
}

/**
 * Assistente guiado: destaca uma parte da tela por vez e explica o que ela é e como funciona.
 * Abre sozinho na primeira visita de cada pessoa (o "já viu" fica gravado no usuário) e pode ser
 * chamado de novo a qualquer momento pelo botão, ou pelo "?" de cada seção.
 */
export function Assistente({
  passos: todosOsPassos,
  jaViu,
  chave,
  rotulo = "Assistente",
}: {
  passos: Passo[];
  jaViu: boolean;
  chave: string;
  rotulo?: string;
}) {
  const [passos, setPassos] = useState(todosOsPassos);
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const painel = useRef<HTMLDivElement>(null);
  const alvoAtual = useRef<Element | null>(null);
  const vistoRegistrado = useRef(jaViu);

  const limparAlvo = useCallback(() => {
    alvoAtual.current?.removeAttribute("data-assistente-alvo");
    alvoAtual.current = null;
  }, []);

  const fechar = useCallback(() => {
    setAberto(false);
    limparAlvo();
    if (!vistoRegistrado.current) {
      vistoRegistrado.current = true;
      void marcarTutorialVisto(chave);
    }
  }, [chave, limparAlvo]);

  // primeira visita: abre sozinho, com uma pausa para a página terminar de aparecer
  useEffect(() => {
    if (jaViu) return;
    const t = setTimeout(() => {
      setPassos(passosPresentes(todosOsPassos));
      setIndice(0);
      setAberto(true);
    }, 700);
    return () => clearTimeout(t);
  }, [jaViu, todosOsPassos]);

  // pedidos de abertura de outros pontos da tela (botão "?" de cada seção)
  useEffect(() => {
    const aoPedir = (e: Event) => {
      const id = (e as CustomEvent<{ passo?: string }>).detail?.passo;
      const presentes = passosPresentes(todosOsPassos);
      const posicao = id ? presentes.findIndex((p) => p.id === id) : 0;
      setPassos(presentes);
      setIndice(posicao >= 0 ? posicao : 0);
      setAberto(true);
    };
    window.addEventListener(EVENTO_ABRIR, aoPedir);
    return () => window.removeEventListener(EVENTO_ABRIR, aoPedir);
  }, [todosOsPassos]);

  // destaca a parte da tela do passo atual (abrindo a seção, se estiver fechada)
  useEffect(() => {
    limparAlvo();
    if (!aberto) return;
    const alvo = passos[indice]?.alvo ? document.querySelector(passos[indice].alvo as string) : null;
    if (alvo) {
      abrirSecoesAte(alvo);
      alvo.setAttribute("data-assistente-alvo", "");
      alvoAtual.current = alvo;
      const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => alvo.scrollIntoView({ block: "start", behavior: reduzir ? "auto" : "smooth" }));
    }
    return limparAlvo;
  }, [aberto, indice, passos, limparAlvo]);

  // teclado: setas navegam, Esc fecha
  useEffect(() => {
    if (!aberto) return;
    painel.current?.focus({ preventScroll: true });
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      else if (e.key === "ArrowRight") setIndice((i) => Math.min(i + 1, passos.length - 1));
      else if (e.key === "ArrowLeft") setIndice((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, fechar, passos.length]);

  const passo = passos[indice];
  const ultimo = indice === passos.length - 1;

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => abrirAssistente()} className="gap-2">
        <Sparkles size={15} className="texto-destaque" aria-hidden="true" />
        Assistente
      </Button>

      {aberto && passo && (
        <div
          ref={painel}
          tabIndex={-1}
          role="dialog"
          aria-modal="false"
          aria-label={`Assistente: ${rotulo}`}
          className="fixed inset-x-3 bottom-3 z-[70] max-h-[78vh] overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl outline-none dark:border-neutral-800 dark:bg-neutral-900 md:inset-x-auto md:bottom-6 md:right-6 md:w-[26rem] md:p-7"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="texto-destaque" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
                Assistente
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">
                Passo {indice + 1} de {passos.length}
              </span>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar o assistente"
                className="inline-flex size-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="mb-6 flex gap-1" aria-hidden="true">
            {passos.map((p, i) => (
              <span
                key={p.id}
                className={cn(
                  "h-[3px] flex-1 rounded-full",
                  i === indice ? "fundo-destaque" : i < indice ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-200 dark:bg-neutral-800"
                )}
              />
            ))}
          </div>

          <div aria-live="polite">
            <h2 className="mb-3 text-2xl font-extrabold leading-tight tracking-tight text-neutral-900 dark:text-neutral-100">
              {comDestaque(passo.titulo)}
            </h2>
            <div className="space-y-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
              {passo.texto.map((t) => (
                <p key={t}>{t}</p>
              ))}
            </div>

            {passo.formula && (
              <div className="mt-5 rounded-2xl bg-neutral-100 p-4 dark:bg-neutral-800/60">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
                  Como é calculado
                </p>
                <p className="whitespace-pre-line text-sm font-semibold leading-relaxed tabular-nums text-neutral-900 dark:text-neutral-100">
                  {passo.formula}
                </p>
                {passo.exemplo && (
                  <p className="mt-3 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                    Exemplo: {passo.exemplo}
                  </p>
                )}
              </div>
            )}
            {!passo.formula && passo.exemplo && (
              <p className="mt-4 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                Exemplo: {passo.exemplo}
              </p>
            )}
            {passo.dica && (
              <p className="mt-4 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-400">
                <strong className="font-bold text-neutral-900 dark:text-neutral-100">Dica:</strong> {passo.dica}
              </p>
            )}
          </div>

          <div className="mt-7 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIndice((i) => Math.max(i - 1, 0))}
              disabled={indice === 0}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Anterior
            </Button>
            <div className="flex items-center gap-2">
              {!ultimo && (
                <Button type="button" variant="ghost" onClick={fechar}>
                  Pular
                </Button>
              )}
              {ultimo ? (
                <Button type="button" onClick={fechar}>
                  Concluir
                </Button>
              ) : (
                <Button type="button" onClick={() => setIndice((i) => Math.min(i + 1, passos.length - 1))}>
                  Próximo
                  <ArrowRight size={14} aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>

          <label className="mt-6 flex items-center gap-3 border-t border-neutral-200 pt-5 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            Ir direto para
            <select
              value={indice}
              onChange={(e) => setIndice(Number(e.target.value))}
              className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-transparent px-2 py-1.5 text-xs font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-100"
            >
              {passos.map((p, i) => (
                <option key={p.id} value={i} className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
                  {i + 1}. {p.titulo.replace(/\*/g, "")}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </>
  );
}
