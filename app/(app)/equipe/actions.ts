"use server";

import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/acesso";
import { revalidatePath } from "next/cache";
import { str, num } from "@/lib/form";
import type { TipoProfissional } from "@/app/generated/prisma/client";

export async function createProfissional(formData: FormData) {
  await requireModulo("equipe");
  const nome = str(formData, "nome");
  const funcao = str(formData, "funcao");
  const tipo = formData.get("tipo") as TipoProfissional;
  if (!nome || !funcao || !tipo) return;

  await prisma.profissional.create({
    data: {
      nome,
      funcao,
      tipo,
      diariaPadrao: num(formData, "diariaPadrao"),
      contato: str(formData, "contato"),
      email: str(formData, "email"),
    },
  });
  revalidatePath("/equipe");
}

export async function updateProfissional(formData: FormData) {
  await requireModulo("equipe");
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.profissional.update({
    where: { id },
    data: {
      nome: str(formData, "nome") ?? undefined,
      funcao: str(formData, "funcao") ?? undefined,
      tipo: (formData.get("tipo") as TipoProfissional | null) || undefined,
      diariaPadrao: num(formData, "diariaPadrao"),
      contato: str(formData, "contato"),
      email: str(formData, "email"),
    },
  });
  revalidatePath("/equipe");
}

export async function alternarAtivoProfissional(formData: FormData) {
  await requireModulo("equipe");
  const id = formData.get("id") as string;
  const profissional = await prisma.profissional.findUnique({ where: { id } });
  if (!profissional) return;
  await prisma.profissional.update({ where: { id }, data: { ativo: !profissional.ativo } });
  revalidatePath("/equipe");
}
