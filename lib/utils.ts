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
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR");
}
