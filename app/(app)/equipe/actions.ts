"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key);
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function createProfissional(formData: FormData) {
  const nome = str(formData, "nome");
  const funcao = str(formData, "funcao");
  const tipo = formData.get("tipo") as string;
  if (!nome || !funcao || !tipo) return;

  await prisma.profissional.create({
    data: {
      nome,
      funcao,
      tipo: tipo as never,
      diariaPadrao: num(formData, "diariaPadrao"),
      contato: str(formData, "contato"),
      email: str(formData, "email"),
    },
  });
  revalidatePath("/equipe");
}

export async function updateProfissional(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.profissional.update({
    where: { id },
    data: {
      nome: str(formData, "nome") ?? undefined,
      funcao: str(formData, "funcao") ?? undefined,
      tipo: (formData.get("tipo") as string as never) || undefined,
      diariaPadrao: num(formData, "diariaPadrao"),
      contato: str(formData, "contato"),
      email: str(formData, "email"),
    },
  });
  revalidatePath("/equipe");
}

export async function alternarAtivoProfissional(formData: FormData) {
  const id = formData.get("id") as string;
  const profissional = await prisma.profissional.findUnique({ where: { id } });
  if (!profissional) return;
  await prisma.profissional.update({ where: { id }, data: { ativo: !profissional.ativo } });
  revalidatePath("/equipe");
}
