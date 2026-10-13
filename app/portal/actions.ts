"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { atualizarStatusPropostaCore } from "@/lib/propostas";

async function clienteIdDaSessao() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENTE" || !session.user.clienteId) return null;
  return session.user.clienteId;
}

export async function responderProposta(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !status) return;

  const clienteId = await clienteIdDaSessao();
  if (!clienteId) return;

  const proposta = await prisma.proposta.findUnique({ where: { id } });
  if (!proposta || proposta.clienteId !== clienteId) return;
  if (proposta.status !== "ENVIADA" && proposta.status !== "NEGOCIACAO") return;
  if (status !== "APROVADA" && status !== "RECUSADA") return;

  await atualizarStatusPropostaCore(id, status);
  revalidatePath("/portal");
  revalidatePath(`/portal/propostas/${id}`);
}

export async function avaliarEntrega(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const comentarioCliente = (formData.get("comentarioCliente") as string | null)?.trim() || null;
  if (!id || !status) return;

  const clienteId = await clienteIdDaSessao();
  if (!clienteId) return;

  const entrega = await prisma.entrega.findUnique({
    where: { id },
    include: { projeto: true },
  });
  if (!entrega || entrega.projeto.clienteId !== clienteId) return;
  if (status !== "APROVADA" && status !== "REPROVADA") return;

  await prisma.entrega.update({
    where: { id },
    data: { status: status as never, comentarioCliente },
  });
  revalidatePath(`/portal/projetos/${entrega.projetoId}`);
}
