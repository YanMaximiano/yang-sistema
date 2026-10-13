"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function createCliente(formData: FormData) {
  const nome = str(formData, "nome");
  if (!nome) return;

  const cliente = await prisma.cliente.create({
    data: {
      nome,
      empresa: str(formData, "empresa"),
      contato: str(formData, "contato"),
      email: str(formData, "email"),
      telefone: str(formData, "telefone"),
      origem: str(formData, "origem"),
    },
  });
  revalidatePath("/clientes");
  redirect(`/clientes/${cliente.id}`);
}

export async function updateCliente(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.cliente.update({
    where: { id },
    data: {
      nome: str(formData, "nome") ?? undefined,
      empresa: str(formData, "empresa"),
      contato: str(formData, "contato"),
      email: str(formData, "email"),
      telefone: str(formData, "telefone"),
      origem: str(formData, "origem"),
      statusRelacionamento: (formData.get("statusRelacionamento") as never) || undefined,
    },
  });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

export async function addNota(formData: FormData) {
  const id = formData.get("id") as string;
  const nota = str(formData, "nota");
  if (!id || !nota) return;

  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) return;

  const dataHoje = new Date().toLocaleString("pt-BR");
  const notasAtualizadas = cliente.notasInternas
    ? `${cliente.notasInternas}\n\n[${dataHoje}] ${nota}`
    : `[${dataHoje}] ${nota}`;

  await prisma.cliente.update({
    where: { id },
    data: { notasInternas: notasAtualizadas },
  });
  revalidatePath(`/clientes/${id}`);
}
