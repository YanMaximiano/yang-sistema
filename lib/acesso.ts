import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { modulosDoUsuario, type Modulo } from "@/lib/permissoes";
import { primeiraRotaPermitida, type Role } from "@/lib/rotas";

/**
 * Controle de acesso por área. O token de login só diz QUEM é a pessoa; o que ela pode
 * abrir é lido do banco a cada requisição (uma consulta só por requisição, graças ao
 * cache), então liberar, bloquear, desativar ou rebaixar vale na hora.
 *
 * - páginas:  `await exigirModulo("financeiro")` na primeira linha (redireciona);
 * - ações do servidor e rotas de API: `await requireModulo("financeiro")` (lança erro).
 * Toda página e toda ação de área restrita precisa de uma das duas — o menu só esconde.
 */

export type Acesso = {
  userId: string;
  role: Role;
  admin: boolean;
  modulos: Modulo[];
  tem: (modulo: Modulo) => boolean;
};

const carregarUsuario = cache((id: string) =>
  prisma.user.findUnique({
    where: { id },
    select: { ativo: true, role: true, permissoes: true, permissoesPersonalizadas: true },
  })
);

/** Quem está logado e o que pode abrir; null se não há login, se foi desativado ou mudou de cargo. */
export async function acessoAtual(): Promise<Acesso | null> {
  const session = await auth();
  if (!session?.user) return null;
  const usuario = await carregarUsuario(session.user.id);
  // o token carrega o cargo do login: se mudou no banco, a pessoa precisa entrar de novo
  if (!usuario?.ativo || usuario.role !== session.user.role || usuario.role === "CLIENTE") return null;

  const modulos = modulosDoUsuario(usuario);
  return {
    userId: session.user.id,
    role: usuario.role as Role,
    admin: usuario.role === "ADMIN",
    modulos,
    tem: (modulo) => modulos.includes(modulo),
  };
}

/** Páginas: exige login e pelo menos uma das áreas; sem acesso, manda para a primeira tela liberada. */
export async function exigirModulo(...modulos: Modulo[]): Promise<Acesso> {
  const acesso = await acessoAtual();
  if (!acesso) redirect("/login");
  if (!modulos.some((m) => acesso.tem(m))) redirect(primeiraRotaPermitida(acesso.modulos, acesso.admin));
  return acesso;
}

/** Páginas só do admin (gerenciar usuários). */
export async function exigirAdmin(): Promise<Acesso> {
  const acesso = await acessoAtual();
  if (!acesso) redirect("/login");
  if (!acesso.admin) redirect(primeiraRotaPermitida(acesso.modulos, false));
  return acesso;
}

/** Ações do servidor e rotas de API: lança erro se a pessoa não tem nenhuma das áreas. */
export async function requireModulo(...modulos: Modulo[]): Promise<Acesso> {
  const acesso = await acessoAtual();
  if (!acesso || !modulos.some((m) => acesso.tem(m))) throw new Error("Não autorizado");
  return acesso;
}
