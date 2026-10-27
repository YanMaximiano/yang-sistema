import type { Role } from "@/lib/rotas";

/**
 * Áreas do sistema que o admin libera ou bloqueia para cada usuário.
 * O cargo (Equipe, Freelancer) só define o ponto de partida; Admin sempre vê tudo.
 * Gerenciar usuários não está aqui de propósito: quem pudesse criar usuários poderia
 * dar a si mesmo poder de admin, então essa área é só do cargo Admin.
 */
export const MODULOS = [
  { chave: "painel", rotulo: "Painel", descricao: "Visão geral da produtora", padrao: ["EQUIPE", "FREELANCER"] },
  { chave: "catalogo", rotulo: "Catálogo", descricao: "Serviços, planos, preços e modelos", padrao: [] },
  { chave: "clientes", rotulo: "Clientes", descricao: "Cadastro e relacionamento", padrao: ["EQUIPE"] },
  { chave: "propostas", rotulo: "Propostas", descricao: "Funil comercial", padrao: ["EQUIPE"] },
  { chave: "projetos", rotulo: "Projetos", descricao: "Pipeline, entregas, checklist e escala", padrao: ["EQUIPE", "FREELANCER"] },
  {
    chave: "projetos_financeiro",
    rotulo: "Valores dentro dos projetos",
    descricao: "Valor, recebimentos, custos, margem e cachês de cada projeto",
    padrao: ["EQUIPE"],
  },
  { chave: "calendario", rotulo: "Calendário", descricao: "Prazos dos projetos", padrao: ["EQUIPE", "FREELANCER"] },
  { chave: "equipamentos", rotulo: "Equipamentos", descricao: "Inventário, fotos e status", padrao: ["EQUIPE"] },
  { chave: "equipe", rotulo: "Equipe", descricao: "Profissionais e escalas", padrao: ["EQUIPE"] },
  { chave: "avisos", rotulo: "Avisos", descricao: "Prazos, pagamentos e pendências", padrao: ["EQUIPE"] },
  { chave: "financeiro", rotulo: "Financeiro", descricao: "Margens, recebimentos e fluxo de caixa", padrao: [] },
  {
    chave: "calculadora",
    rotulo: "Calculadora",
    descricao: "Custo/hora, salários, valor dos equipamentos e custo de aluguel",
    padrao: [],
  },
] as const satisfies readonly {
  chave: string;
  rotulo: string;
  descricao: string;
  padrao: readonly Role[];
}[];

export type Modulo = (typeof MODULOS)[number]["chave"];

export const TODOS_OS_MODULOS: Modulo[] = MODULOS.map((m) => m.chave);

export function ehModulo(valor: string): valor is Modulo {
  return (TODOS_OS_MODULOS as string[]).includes(valor);
}

/** Áreas que o cargo libera quando o admin não personalizou nada. */
export function modulosPadraoDoCargo(role: Role): Modulo[] {
  if (role === "ADMIN") return TODOS_OS_MODULOS;
  return MODULOS.filter((m) => (m.padrao as readonly Role[]).includes(role)).map((m) => m.chave);
}

type DadosDeAcesso = { role: Role | string; permissoes: string[]; permissoesPersonalizadas: boolean };

/** Áreas que a pessoa realmente enxerga: Admin tudo; personalizado usa a lista salva; senão o padrão do cargo. */
export function modulosDoUsuario(u: DadosDeAcesso): Modulo[] {
  if (u.role === "ADMIN") return TODOS_OS_MODULOS;
  if (u.role === "CLIENTE") return [];
  if (u.permissoesPersonalizadas) return u.permissoes.filter(ehModulo);
  return modulosPadraoDoCargo(u.role as Role);
}

/** A lista marcada é igual ao padrão do cargo (então não precisa gravar como personalizada). */
export function mesmoQueOPadrao(role: Role, marcados: Modulo[]) {
  const padrao = modulosPadraoDoCargo(role);
  return padrao.length === marcados.length && padrao.every((m) => marcados.includes(m));
}
