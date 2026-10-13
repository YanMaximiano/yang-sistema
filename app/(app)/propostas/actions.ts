"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  const proposta = await prisma.proposta.update({
    where: { id },
    data: { status: status as never },
    include: { servico: { include: { etapasTemplate: true } }, plano: true, cliente: true },
  });

  if (status === "APROVADA") {
    const existente = await prisma.projeto.findUnique({ where: { propostaId: id } });
    if (!existente) {
      let prazoData: Date | null = null;
      const dias = proposta.prazoPropostoDias ?? proposta.plano.prazoDias;
      if (dias) {
        prazoData = new Date();
        prazoData.setDate(prazoData.getDate() + dias);
      }

      const projeto = await prisma.projeto.create({
        data: {
          propostaId: proposta.id,
          clienteId: proposta.clienteId,
          servicoId: proposta.servicoId,
          nome: `${proposta.servico.nome} — ${proposta.cliente.nome}`,
          tipoCobranca: proposta.servico.tipoCobranca,
          valor: proposta.valorProposto,
          prazoData,
          etapas: {
            create: proposta.servico.etapasTemplate
              .sort((a, b) => a.ordem - b.ordem)
              .map((etapa) => ({ nome: etapa.nome, ordem: etapa.ordem })),
          },
        },
      });
      revalidatePath("/projetos");
      revalidatePath(`/projetos/${projeto.id}`);
    }
    // não rebaixa um cliente já marcado manualmente como recorrente
    await prisma.cliente.updateMany({
      where: { id: proposta.clienteId, statusRelacionamento: { not: "CLIENTE_RECORRENTE" } },
      data: { statusRelacionamento: "CLIENTE_ATIVO" },
    });
  }

  revalidatePath("/propostas");
  revalidatePath(`/propostas/${id}`);
  revalidatePath(`/clientes/${proposta.clienteId}`);
}
