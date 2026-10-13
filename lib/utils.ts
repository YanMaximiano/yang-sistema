import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoeda(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatFaixaValor(min: number | null, max: number | null) {
  if (min == null && max == null) return "A combinar";
  if (min != null && max != null) return `${formatMoeda(min)} – ${formatMoeda(max)}`;
  if (min != null) return `A partir de ${formatMoeda(min)}`;
  return `Até ${formatMoeda(max)}`;
}

export function formatData(data: Date | string | null | undefined) {
  if (!data) return "—";
  // uma string "yyyy-mm-dd" pura vira meia-noite UTC, que em fuso negativo
  // (Brasil) exibe o dia anterior — mesmo problema que dataOrNull evita em
  // lib/form.ts, ancorando ao meio-dia antes de converter.
  const d =
    typeof data === "string"
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(data) ? `${data}T12:00:00` : data)
      : data;
  return d.toLocaleDateString("pt-BR");
}
