"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { atualizarStatusPropostaCore } from "@/lib/propostas";

export async function createProposta(formData: FormData) {
  const clienteId = formData.get("clienteId") as string;
  const servicoId = formData.get("servicoId") as string;
  const planoId = formData.get("planoId") as string;
  const valorProposto = Number(formData.get("valorProposto"));
  const prazoPropostoDiasRaw = formData.get("prazoPropostoDias");
  const adicionaisIds = formData.getAll("adicionais") as string[];

  if (!clienteId || !servicoId || !planoId || !Number.isFinite(valorProposto)) return;

  const proposta = await prisma.proposta.create({
    data: {
      clienteId,
      servicoId,
      planoId,
      valorProposto,
      prazoPropostoDias: prazoPropostoDiasRaw ? parseInt(prazoPropostoDiasRaw as string, 10) : null,
      adicionais: {
        create: adicionaisIds.map((adicionalId) => ({ adicionalId })),
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
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !status) return;

  await atualizarStatusPropostaCore(id, status);
}
