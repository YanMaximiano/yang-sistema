"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { str } from "@/lib/form";

async function salvarFotoEquipamento(formData: FormData): Promise<string | undefined> {
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0 || !file.type.startsWith("image/")) {
    return undefined;
  }

  const extensao = path.extname(file.name) || ".jpg";
  const nomeArquivo = `${crypto.randomUUID()}${extensao}`;
  const dir = path.join(process.cwd(), "public", "equipamentos");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, nomeArquivo), Buffer.from(await file.arrayBuffer()));

  return `/equipamentos/${nomeArquivo}`;
}

export async function createEquipamento(formData: FormData) {
  const nome = str(formData, "nome");
  const categoria = str(formData, "categoria");
  if (!nome || !categoria) return;

  const foto = await salvarFotoEquipamento(formData);
  await prisma.equipamento.create({
    data: { nome, categoria, observacoes: str(formData, "observacoes"), foto },
  });
  revalidatePath("/equipamentos");
}

export async function updateEquipamento(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;

  const foto = await salvarFotoEquipamento(formData);
  await prisma.equipamento.update({
    where: { id },
    data: {
      nome: str(formData, "nome") ?? undefined,
      categoria: str(formData, "categoria") ?? undefined,
      observacoes: str(formData, "observacoes"),
      foto: foto ?? undefined,
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
