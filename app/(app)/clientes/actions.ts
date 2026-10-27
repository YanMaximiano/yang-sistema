"use server";

import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/acesso";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { str } from "@/lib/form";
import type { StatusRelacionamento } from "@/app/generated/prisma/client";

export async function createCliente(formData: FormData) {
  await requireModulo("clientes");
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
  await requireModulo("clientes");
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
      statusRelacionamento:
        (formData.get("statusRelacionamento") as StatusRelacionamento | null) || undefined,
    },
  });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

export async function addNota(formData: FormData) {
  await requireModulo("clientes");
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

// só admin: quem define a senha do portal consegue entrar como o cliente e ver valores,
// documentos e aprovações dele — isso não cabe na área "Clientes"
export async function criarAcessoPortal(formData: FormData) {
  await requireRole("ADMIN");
  const clienteId = formData.get("clienteId") as string;
  const email = str(formData, "email")?.toLowerCase();
  const senha = str(formData, "senha");
  if (!clienteId || !email || !senha || senha.length < 8) return;

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return;
  const jaExiste = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (jaExiste) return;

  const passwordHash = await bcrypt.hash(senha, 10);
  await prisma.user.create({
    data: { name: cliente.nome, email, passwordHash, role: "CLIENTE", clienteId },
  });

  revalidatePath(`/clientes/${clienteId}`);
}
