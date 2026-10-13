"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { atualizarStatusPropostaCore } from "@/lib/propostas";
import type { StatusProposta, StatusEntrega } from "@/app/generated/prisma/client";

async function clienteIdDaSessao() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENTE" || !session.user.clienteId) return null;
  return session.user.clienteId;
}

export async function responderProposta(formData: FormData) {
  const id = formData.get("id") as string;
  const status = formData.get("status") as StatusProposta;
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
  const status = formData.get("status") as StatusEntrega;
  const comentarioCliente = (formData.get("comentarioCliente") as string | null)?.trim() || null;
  if (!id || !status) return;

  const clienteId = await clienteIdDaSessao();
  if (!clienteId) return;

  const entrega = await prisma.entrega.findUnique({
    where: { id },
    include: { projeto: true },
  });
  if (!entrega || entrega.projeto.clienteId !== clienteId) return;
  if (entrega.projeto.statusGeral === "CANCELADO") return;
  if (status !== "APROVADA" && status !== "REPROVADA") return;

  await prisma.entrega.update({
    where: { id },
    data: { status, comentarioCliente },
  });
  revalidatePath(`/portal/projetos/${entrega.projetoId}`);
}

export async function assinarDocumento(formData: FormData) {
  const id = formData.get("id") as string;
  const nomeCompleto = (formData.get("nomeCompleto") as string | null)?.trim();
  const concordo = formData.get("concordo") === "on";
  if (!id || !nomeCompleto || !concordo) return;

  const clienteId = await clienteIdDaSessao();
  if (!clienteId) return;

  const documento = await prisma.documento.findUnique({
    where: { id },
    include: { projeto: true },
  });
  if (!documento || documento.projeto.clienteId !== clienteId) return;
  if (documento.projeto.statusGeral === "CANCELADO") return;
  if (documento.status !== "AGUARDANDO_ASSINATURA") return;

  const cabecalhos = await headers();
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";

  await prisma.documento.update({
    where: { id },
    data: {
      status: "ASSINADO",
      assinanteNome: nomeCompleto,
      assinanteIp: ip,
      assinadoEm: new Date(),
    },
  });
  revalidatePath(`/portal/projetos/${documento.projetoId}`);
  revalidatePath(`/projetos/${documento.projetoId}`);
}
