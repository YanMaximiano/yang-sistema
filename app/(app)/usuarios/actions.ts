"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { str } from "@/lib/form";
import { ehModulo, mesmoQueOPadrao } from "@/lib/permissoes";
import type { Role } from "@/app/generated/prisma/client";

const SENHA_MINIMA = 8;
const PERFIS_INTERNOS: Role[] = ["ADMIN", "EQUIPE", "FREELANCER"];

// requireRole confere cargo e status no banco (e não no token, que vale por dias):
// um admin rebaixado ou desativado não pode mais criar usuários nem trocar senhas.
export async function createUsuario(formData: FormData) {
  await requireRole("ADMIN");

  const name = str(formData, "name");
  const email = str(formData, "email")?.toLowerCase();
  const senha = str(formData, "senha");
  const role = formData.get("role") as Role;
  if (!name || !email || !senha || senha.length < SENHA_MINIMA || !PERFIS_INTERNOS.includes(role)) return;

  const jaExiste = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (jaExiste) return;

  const passwordHash = await bcrypt.hash(senha, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  revalidatePath("/usuarios");
}

export async function updateUsuario(formData: FormData) {
  const session = await requireRole("ADMIN");

  const id = formData.get("id") as string;
  if (!id) return;
  // ninguém edita a própria conta por aqui — evita se autobloquear (tirar o próprio ADMIN);
  // a troca da própria senha é feita em "Alterar minha senha" (/conta)
  if (id === session.user.id) return;

  const name = str(formData, "name");
  const role = formData.get("role") as Role | null;
  const senha = str(formData, "senha");
  if (role && !PERFIS_INTERNOS.includes(role)) return;
  if (senha && senha.length < SENHA_MINIMA) return;

  // esta tela só gere a equipe: clientes do portal têm o acesso criado na ficha do cliente
  const alvo = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!alvo || alvo.role === "CLIENTE") return;

  // áreas liberadas: o que está marcado é o que vale. Igual ao padrão do cargo = sem
  // personalização (continua acompanhando o padrão se o cargo mudar). Admin sempre vê tudo.
  const novoCargo = (role || alvo.role) as Role;
  let areas: { permissoes: string[]; permissoesPersonalizadas: boolean } | undefined;
  if (formData.get("editarModulos") === "1" && novoCargo !== "ADMIN") {
    const marcados = Array.from(new Set(formData.getAll("modulos").map(String).filter(ehModulo)));
    const iniciais = new Set(String(formData.get("modulosIniciais") ?? "").split(",").filter(ehModulo));
    const mexeuNasCaixas = marcados.length !== iniciais.size || marcados.some((m) => !iniciais.has(m));
    // trocar só o cargo, sem mexer nas caixas, não pode virar "personalizado" com a lista do cargo antigo
    if (mexeuNasCaixas) {
      const igualAoPadrao = mesmoQueOPadrao(novoCargo, marcados);
      areas = { permissoes: igualAoPadrao ? [] : marcados, permissoesPersonalizadas: !igualAoPadrao };
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      name: name ?? undefined,
      role: role || undefined,
      passwordHash: senha ? await bcrypt.hash(senha, 10) : undefined,
      ...areas,
    },
  });

  revalidatePath("/usuarios");
}

export async function alternarAtivoUsuario(formData: FormData) {
  const session = await requireRole("ADMIN");

  const id = formData.get("id") as string;
  if (!id || id === session.user.id) return;

  const usuario = await prisma.user.findUnique({ where: { id } });
  if (!usuario) return;

  await prisma.user.update({ where: { id }, data: { ativo: !usuario.ativo } });
  revalidatePath("/usuarios");
}
