"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { str } from "@/lib/form";

export async function createEquipamento(formData: FormData) {
  const nome = str(formData, "nome");
  const categoria = str(formData, "categoria");
  if (!nome || !categoria) return;

  await prisma.equipamento.create({
    data: { nome, categoria, observacoes: str(formData, "observacoes") },
  });
  revalidatePath("/equipamentos");
}

export async function updateEquipamento(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.equipamento.update({
    where: { id },
    data: {
      nome: str(formData, "nome") ?? undefined,
      categoria: str(formData, "categoria") ?? undefined,
      observacoes: str(formData, "observacoes"),
    },
  });
  revalidatePath("/equipamentos");
}

export async function alternarStatusEquipamento(formData: FormData) {
  const id = formData.get("id") as string;
  const equipamento = await prisma.equipamento.findUnique({ where: { id } });
  if (!equipamento) return;
  await prisma.equipamento.update({
    where: { id },
    data: { status: equipamento.status === "DISPONIVEL" ? "MANUTENCAO" : "DISPONIVEL" },
  });
  revalidatePath("/equipamentos");
}

export async function alternarAtivoEquipamento(formData: FormData) {
  const id = formData.get("id") as string;
  const equipamento = await prisma.equipamento.findUnique({ where: { id } });
  if (!equipamento) return;
  await prisma.equipamento.update({ where: { id }, data: { ativo: !equipamento.ativo } });
  revalidatePath("/equipamentos");
}
