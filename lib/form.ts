import "server-only";

/** Lê um campo de texto do FormData; string vazia vira null. */
export function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Lê um campo numérico (decimal) do FormData; vazio/inválido vira null. */
export function num(formData: FormData, key: string): number | null {
  const v = formData.get(key);
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Lê um campo inteiro do FormData; vazio/inválido vira null. */
export function int(formData: FormData, key: string): number | null {
  const v = formData.get(key);
  if (v === null || v === "") return null;
  const n = parseInt(v as string, 10);
  return Number.isFinite(n) ? n : null;
}

/** Lê uma textarea de itens (um por linha) e devolve a lista sem linhas vazias. */
export function list(formData: FormData, key: string): string[] {
  const raw = str(formData, key);
  if (!raw) return [];
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Lê um <input type="date"> (yyyy-mm-dd) do FormData. Fixa o horário em
 * meio-dia UTC — se fosse meia-noite, o fuso horário local jogaria a data
 * para o dia anterior sempre que exibida/comparada depois.
 */
export function dataOrNull(formData: FormData, key: string): Date | null {
  const v = str(formData, key);
  return v ? new Date(`${v}T12:00:00`) : null;
}
