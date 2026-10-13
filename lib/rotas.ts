export type Role = "ADMIN" | "EQUIPE" | "FREELANCER" | "CLIENTE";

/**
 * Fonte única de verdade para acesso por perfil às rotas administrativas.
 * Usado tanto pela navegação (app/(app)/layout.tsx) quanto pela proteção
 * de rota no servidor (proxy.ts) — nunca declarar uma restrição só num
 * dos dois lugares, ou a rota fica "escondida" no menu mas continua
 * acessível por URL direta.
 */
export const ROTAS_APP: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Painel", roles: ["ADMIN", "EQUIPE", "FREELANCER"] },
  { href: "/catalogo", label: "Catálogo", roles: ["ADMIN"] },
  { href: "/clientes", label: "Clientes", roles: ["ADMIN", "EQUIPE"] },
  { href: "/propostas", label: "Propostas", roles: ["ADMIN", "EQUIPE"] },
  { href: "/projetos", label: "Projetos", roles: ["ADMIN", "EQUIPE", "FREELANCER"] },
  { href: "/calendario", label: "Calendário", roles: ["ADMIN", "EQUIPE", "FREELANCER"] },
  { href: "/equipamentos", label: "Equipamentos", roles: ["ADMIN", "EQUIPE"] },
  { href: "/equipe", label: "Equipe", roles: ["ADMIN", "EQUIPE"] },
  { href: "/financeiro", label: "Financeiro", roles: ["ADMIN"] },
];

export function rotaPermitidaParaPerfil(pathname: string, role: Role): boolean {
  const candidatas = ROTAS_APP.filter((r) =>
    r.href === "/" ? pathname === "/" : pathname === r.href || pathname.startsWith(`${r.href}/`)
  ).sort((a, b) => b.href.length - a.href.length);

  const rota = candidatas[0];
  // rota não listada (ex: /portal) não é gerida por esta tabela
  if (!rota) return true;
  return rota.roles.includes(role);
}
