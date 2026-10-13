import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { formatMoeda, formatData } from "@/lib/utils";
import { startOfDay, isBefore, differenceInDays, addDays } from "date-fns";

export type Aviso = {
  severidade: "atraso" | "atencao";
  titulo: string;
  descricao: string;
  href: string;
};

// cache() memoiza por requisição — o layout (contador no menu) e a página /avisos
// (lista completa) chamam isso na mesma requisição e reaproveitam o resultado em vez
// de rodar as 5 sub-queries duas vezes.
export const listarAvisos = cache(async (): Promise<Aviso[]> => {
  const hoje = startOfDay(new Date());

  const [projetos, recebimentos, entregas, alocacoes, propostas] = await Promise.all([
    prisma.projeto.findMany({
      where: { prazoData: { not: null }, statusGeral: { in: ["ATIVO", "PAUSADO"] } },
      include: { cliente: true },
    }),
    prisma.recebimento.findMany({
      where: {
        vencimento: { lt: hoje },
        status: { not: "PAGO" },
        projeto: { statusGeral: { not: "CANCELADO" } },
      },
      include: { projeto: { include: { cliente: true } } },
    }),
    prisma.entrega.findMany({
      where: {
        status: "EM_REVISAO",
        createdAt: { lt: addDays(hoje, -2) },
        projeto: { statusGeral: { not: "CANCELADO" } },
      },
      include: { projeto: true },
    }),
    prisma.alocacaoEquipamento.findMany({
      where: {
        checklistSaida: true,
        checklistRetorno: false,
        data: { lt: hoje },
        projeto: { statusGeral: { not: "CANCELADO" } },
      },
      include: { equipamento: true, projeto: true },
    }),
    prisma.proposta.findMany({
      where: { status: { in: ["ENVIADA", "NEGOCIACAO"] }, updatedAt: { lt: addDays(hoje, -5) } },
      include: { cliente: true, servico: true },
    }),
  ]);

  const avisos: Aviso[] = [];

  for (const p of projetos) {
    if (!p.prazoData) continue;
    const prazo = startOfDay(p.prazoData);
    if (isBefore(prazo, hoje)) {
      avisos.push({
        severidade: "atraso",
        titulo: "Projeto atrasado",
        descricao: `${p.nome} — ${p.cliente.nome} — prazo era ${formatData(p.prazoData)}`,
        href: `/projetos/${p.id}`,
      });
    } else if (!isBefore(addDays(hoje, 3), prazo)) {
      avisos.push({
        severidade: "atencao",
        titulo: "Prazo próximo",
        descricao: `${p.nome} — ${p.cliente.nome} — prazo em ${formatData(p.prazoData)}`,
        href: `/projetos/${p.id}`,
      });
    }
  }

  for (const r of recebimentos) {
    avisos.push({
      severidade: "atraso",
      titulo: "Pagamento atrasado",
      descricao: `${r.projeto.cliente.nome} — ${formatMoeda(r.valor)} venceu em ${formatData(r.vencimento)}`,
      href: `/projetos/${r.projetoId}`,
    });
  }

  for (const e of entregas) {
    avisos.push({
      severidade: "atencao",
      titulo: "Aguardando aprovação do cliente",
      descricao: `${e.projeto.nome} — versão ${e.versao} enviada em ${formatData(e.createdAt)}`,
      href: `/projetos/${e.projetoId}`,
    });
  }

  for (const a of alocacoes) {
    avisos.push({
      severidade: "atraso",
      titulo: "Equipamento não devolvido",
      descricao: `${a.equipamento.nome} — projeto ${a.projeto.nome}, retirado em ${formatData(a.data)}`,
      href: `/projetos/${a.projetoId}`,
    });
  }

  for (const p of propostas) {
    const dias = differenceInDays(hoje, startOfDay(p.updatedAt));
    avisos.push({
      severidade: "atencao",
      titulo: "Proposta sem resposta",
      descricao: `${p.cliente.nome} — ${p.servico.nome}, parada há ${dias} dias`,
      href: `/propostas/${p.id}`,
    });
  }

  return avisos.sort((a, b) => (a.severidade === b.severidade ? 0 : a.severidade === "atraso" ? -1 : 1));
});
