import "server-only";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import type { StatusProposta } from "@/app/generated/prisma/client";

/**
 * Transições de status de uma proposta compartilhadas entre a tela do admin
 * (app/(app)/propostas/actions.ts) e o portal do cliente (app/portal/actions.ts).
 * Aprovar cria o projeto automaticamente (herdando o plano, para puxar as
 * sugestões de equipe/equipamento) e promove o status do cliente sem rebaixar
 * quem já está ativo/recorrente.
 */
export async function atualizarStatusPropostaCore(propostaId: string, status: StatusProposta) {
  const proposta = await prisma.proposta.update({
    where: { id: propostaId },
    data: { status },
    include: {
      servico: { include: { etapasTemplate: true, checklistTemplate: true } },
      plano: true,
      cliente: true,
    },
  });

  if (status === "APROVADA") {
    const existente = await prisma.projeto.findUnique({ where: { propostaId } });
    if (!existente) {
      let prazoData: Date | null = null;
      const dias = proposta.prazoPropostoDias ?? proposta.plano.prazoDias;
      if (dias != null) {
        // ancorado ao meio-dia, igual ao dataOrNull de lib/form.ts — evita que a
        // conversão de fuso horário jogue a data pro dia anterior/seguinte.
        const hoje = new Date();
        hoje.setHours(12, 0, 0, 0);
        prazoData = addDays(hoje, dias);
      }

      const projeto = await prisma.projeto.create({
        data: {
          propostaId: proposta.id,
          clienteId: proposta.clienteId,
          servicoId: proposta.servicoId,
          planoId: proposta.planoId,
          nome: `${proposta.servico.nome} — ${proposta.cliente.nome}`,
          tipoCobranca: proposta.servico.tipoCobranca,
          valor: proposta.valorProposto,
          prazoData,
          etapas: {
            create: proposta.servico.etapasTemplate
              .sort((a, b) => a.ordem - b.ordem)
              .map((etapa) => ({ nome: etapa.nome, ordem: etapa.ordem })),
          },
          checklistItens: {
            create: proposta.servico.checklistTemplate
              .sort((a, b) => a.ordem - b.ordem)
              .map((item) => ({ nome: item.nome, ordem: item.ordem })),
          },
        },
      });
      revalidatePath("/projetos");
      revalidatePath(`/projetos/${projeto.id}`);
      revalidatePath("/portal");
    }
    // não rebaixa um cliente já marcado manualmente como recorrente
    await prisma.cliente.updateMany({
      where: { id: proposta.clienteId, statusRelacionamento: { not: "CLIENTE_RECORRENTE" } },
      data: { statusRelacionamento: "CLIENTE_ATIVO" },
    });
  }

  revalidatePath("/propostas");
  revalidatePath(`/propostas/${propostaId}`);
  revalidatePath(`/clientes/${proposta.clienteId}`);
  revalidatePath("/portal");

  return proposta;
}
