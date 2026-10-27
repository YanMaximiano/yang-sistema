"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ehTutorial } from "@/lib/tutoriais";

// o assistente guiado de uma tela só abre sozinho na primeira visita de cada pessoa; fica gravado
// no usuário (e não no navegador), então vale em qualquer aparelho
export async function marcarTutorialVisto(chave: string) {
  const session = await auth();
  if (!session?.user || !ehTutorial(chave)) return;
  const usuario = await prisma.user.findUnique({ where: { id: session.user.id }, select: { tutoriaisVistos: true, ativo: true } });
  if (!usuario?.ativo || usuario.tutoriaisVistos.includes(chave)) return;
  await prisma.user.update({ where: { id: session.user.id }, data: { tutoriaisVistos: { push: chave } } });
}

export type EstadoSenha = { erro?: string; ok?: boolean } | undefined;

// vale para qualquer usuário logado (equipe e clientes do portal), por isso não usa requireRole
export async function alterarMinhaSenha(_estado: EstadoSenha, formData: FormData): Promise<EstadoSenha> {
  const session = await auth();
  if (!session?.user) return { erro: "Sessão expirada. Entre novamente." };

  const atual = String(formData.get("atual") ?? "");
  const nova = String(formData.get("nova") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (nova.length < 8) return { erro: "A nova senha precisa ter pelo menos 8 caracteres." };
  if (nova !== confirmar) return { erro: "A confirmação não confere com a nova senha." };
  if (nova === atual) return { erro: "A nova senha precisa ser diferente da atual." };

  const usuario = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, ativo: true },
  });
  if (!usuario?.ativo || !(await bcrypt.compare(atual, usuario.passwordHash))) {
    return { erro: "Senha atual incorreta." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(nova, 10) },
  });
  return { ok: true };
}
