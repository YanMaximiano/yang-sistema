import type { Modulo } from "@/lib/permissoes";

export type Role = "ADMIN" | "EQUIPE" | "FREELANCER" | "CLIENTE";

/**
 * Menu lateral. `modulo` é a área que precisa estar liberada para a pessoa; `somenteAdmin`
 * vale para telas que nenhuma permissão libera (gerenciar usuários).
 * Quem decide o acesso de verdade é o servidor (lib/acesso.ts), página por página e ação
 * por ação — o menu só esconde o que a pessoa não pode abrir.
 */
export const ROTAS_APP: { href: string; label: string; modulo?: Modulo; somenteAdmin?: true }[] = [
  { href: "/", label: "Painel", modulo: "painel" },
  { href: "/catalogo", label: "Catálogo", modulo: "catalogo" },
  { href: "/clientes", label: "Clientes", modulo: "clientes" },
  { href: "/propostas", label: "Propostas", modulo: "propostas" },
  { href: "/projetos", label: "Projetos", modulo: "projetos" },
  { href: "/calendario", label: "Calendário", modulo: "calendario" },
  { href: "/equipamentos", label: "Equipamentos", modulo: "equipamentos" },
  { href: "/equipe", label: "Equipe", modulo: "equipe" },
  { href: "/avisos", label: "Avisos", modulo: "avisos" },
  { href: "/financeiro", label: "Financeiro", modulo: "financeiro" },
  { href: "/calculadora", label: "Calculadora", modulo: "calculadora" },
  { href: "/usuarios", label: "Usuários", somenteAdmin: true },
];

/** Primeira tela do menu que a pessoa pode abrir; sem nenhuma, a própria conta (sempre liberada). */
export function primeiraRotaPermitida(modulos: Modulo[], admin: boolean) {
  const rota = ROTAS_APP.find((r) => (r.modulo ? modulos.includes(r.modulo) : admin));
  return rota?.href ?? "/conta";
}
