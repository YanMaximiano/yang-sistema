"use server";

import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/acesso";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { atualizarStatusPropostaCore } from "@/lib/propostas";
import type { StatusProposta } from "@/app/generated/prisma/client";

export async function createProposta(formData: FormData) {
  await requireModulo("propostas");
  const clienteId = formData.get("clienteId") as string;
  const servicoId = formData.get("servicoId") as string;
  const planoId = formData.get("planoId") as string;
  const valorProposto = Number(formData.get("valorProposto"));
  const prazoPropostoDiasRaw = formData.get("prazoPropostoDias");
  const adicionaisIds = formData.getAll("adicionais") as string[];

  if (!clienteId || !servicoId || !planoId || !Number.isFinite(valorProposto) || valorProposto <= 0) return;
  const prazoDias = prazoPropostoDiasRaw ? parseInt(prazoPropostoDiasRaw as string, 10) : NaN;

  // só aceita adicionais que realmente pertencem ao serviço escolhido — evita
  // que um formulário adulterado misture add-ons de outro serviço na proposta
  const adicionaisValidos = adicionaisIds.length
    ? await prisma.adicional.findMany({ where: { id: { in: adicionaisIds }, servicoId } })
    : [];

  const proposta = await prisma.proposta.create({
    data: {
      clienteId,
      servicoId,
      planoId,
      valorProposto,
      prazoPropostoDias: Number.isFinite(prazoDias) && prazoDias > 0 ? prazoDias : null,
      adicionais: {
        create: adicionaisValidos.map((a) => ({ adicionalId: a.id })),
      },
    },
  });

  // só promove o status do cliente se ele ainda estiver em "lead" — não regride
  // um cliente já ativo/recorrente por causa de uma nova proposta
  await prisma.cliente.updateMany({
    where: { id: clienteId, statusRelacionamento: "LEAD" },
    data: { statusRelacionamento: "ORCAMENTO_ENVIADO" },
  });

  revalidatePath("/propostas");
  revalidatePath(`/clientes/${clienteId}`);
  redirect(`/propostas/${proposta.id}`);
}

export async function atualizarStatusProposta(formData: FormData) {
  await requireModulo("propostas");
  const id = formData.get("id") as string;
  const status = formData.get("status") as StatusProposta;
  if (!id || !status) return;
  if (status !== "NEGOCIACAO" && status !== "APROVADA" && status !== "RECUSADA") return;

  const proposta = await prisma.proposta.findUnique({ where: { id } });
  if (!proposta) return;
  // uma proposta já aprovada/recusada é estado final — evita que um duplo
  // clique ou reenvio do formulário mude o status depois do projeto criado
  if (proposta.status === "APROVADA" || proposta.status === "RECUSADA") return;

  await atualizarStatusPropostaCore(id, status);
}
