"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { str } from "@/lib/form";

const FOTO_TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const FOTO_TAMANHO_MAXIMO = 5 * 1024 * 1024;

// devolve a foto enviada no formulário, ou null se não veio arquivo válido
// (SVG fica de fora de propósito: serviria script na mesma origem do sistema)
async function lerFotoDoFormulario(formData: FormData) {
  const file = formData.get("foto");
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > FOTO_TAMANHO_MAXIMO ||
    !FOTO_TIPOS_ACEITOS.includes(file.type)
  ) {
    return null;
  }
  return { tipo: file.type, dados: new Uint8Array(await file.arrayBuffer()) };
}

async function gravarFoto(equipamentoId: string, foto: { tipo: string; dados: Uint8Array<ArrayBuffer> }) {
  await prisma.$transaction([
    prisma.equipamentoFoto.upsert({
      where: { equipamentoId },
      create: { equipamentoId, ...foto },
      update: foto,
    }),
    // o ?v= muda a cada envio para o navegador não mostrar a foto antiga em cache
    prisma.equipamento.update({
      where: { id: equipamentoId },
      data: { foto: `/api/equipamentos/${equipamentoId}/foto?v=${Date.now()}` },
    }),
  ]);
}

export async function createEquipamento(formData: FormData) {
  await requireRole("ADMIN", "EQUIPE");
  const nome = str(formData, "nome");
  const categoria = str(formData, "categoria");
  if (!nome || !categoria) return;

  const foto = await lerFotoDoFormulario(formData);
  const equipamento = await prisma.equipamento.create({
    data: { nome, categoria, observacoes: str(formData, "observacoes") },
  });
  if (foto) await gravarFoto(equipamento.id, foto);
  revalidatePath("/equipamentos");
}

export async function updateEquipamento(formData: FormData) {
  await requireRole("ADMIN", "EQUIPE");
  const id = formData.get("id") as string;
  if (!id) return;

  const foto = await lerFotoDoFormulario(formData);
  await prisma.equipamento.update({
    where: { id },
    data: {
      nome: str(formData, "nome") ?? undefined,
      categoria: str(formData, "categoria") ?? undefined,
      observacoes: str(formData, "observacoes"),
    },
  });
  if (foto) await gravarFoto(id, foto);
  revalidatePath("/equipamentos");
}

export async function alternarStatusEquipamento(formData: FormData) {
  await requireRole("ADMIN", "EQUIPE");
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
  await requireRole("ADMIN", "EQUIPE");
  const id = formData.get("id") as string;
  const equipamento = await prisma.equipamento.findUnique({ where: { id } });
  if (!equipamento) return;
  await prisma.equipamento.update({ where: { id }, data: { ativo: !equipamento.ativo } });
  revalidatePath("/equipamentos");
}
