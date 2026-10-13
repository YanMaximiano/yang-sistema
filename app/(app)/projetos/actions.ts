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

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key);
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function dataOrNull(formData: FormData, key: string): Date | null {
  const v = str(formData, key);
  // meio-dia UTC evita que o fuso horário local jogue a data-only (yyyy-mm-dd)
  // do <input type="date"> para o dia anterior ao exibir/comparar depois
  return v ? new Date(`${v}T12:00:00`) : null;
}

// ---------- Projeto ----------

export async function criarProjetoAvulso(formData: FormData) {
  const clienteId = formData.get("clienteId") as string;
  const servicoId = formData.get("servicoId") as string;
  const planoId = str(formData, "planoId");
  const nome = str(formData, "nome");
  const valor = num(formData, "valor");
  if (!clienteId || !servicoId || !nome || valor === null) return;

  const servico = await prisma.servico.findUnique({
    where: { id: servicoId },
    include: { etapasTemplate: { orderBy: { ordem: "asc" } } },
  });
  if (!servico) return;

  const projeto = await prisma.projeto.create({
    data: {
      clienteId,
      servicoId,
      planoId: planoId ?? undefined,
      nome,
      valor,
      tipoCobranca: servico.tipoCobranca,
      prazoData: dataOrNull(formData, "prazoData"),
      avulso: true,
      etapas: {
        create: servico.etapasTemplate.map((e) => ({ nome: e.nome, ordem: e.ordem })),
      },
    },
  });

  revalidatePath("/projetos");
  redirect(`/projetos/${projeto.id}`);
}

export async function atualizarStatusGeralProjeto(formData: FormData) {
  const id = formData.get("id") as string;
  const statusGeral = formData.get("statusGeral") as string;
  if (!id || !statusGeral) return;
  await prisma.projeto.update({ where: { id }, data: { statusGeral: statusGeral as never } });
  revalidatePath(`/projetos/${id}`);
  revalidatePath("/projetos");
}

// ---------- Etapas ----------

export async function avancarEtapa(formData: FormData) {
  const projetoId = formData.get("projetoId") as string;
  const etapaId = formData.get("etapaId") as string;

  const etapas = await prisma.projetoEtapa.findMany({
    where: { projetoId },
    orderBy: { ordem: "asc" },
  });
  const idx = etapas.findIndex((e) => e.id === etapaId);
  if (idx === -1) return;

  await prisma.projetoEtapa.update({
    where: { id: etapaId },
    data: { status: "CONCLUIDA", dataFim: new Date() },
  });

  const proxima = etapas[idx + 1];
  if (proxima) {
    await prisma.projetoEtapa.update({
      where: { id: proxima.id },
      data: { status: "EM_ANDAMENTO", dataInicio: new Date() },
    });
  }

  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/calendario");
}

export async function voltarEtapa(formData: FormData) {
  const projetoId = formData.get("projetoId") as string;
  const etapaId = formData.get("etapaId") as string;

  const etapas = await prisma.projetoEtapa.findMany({
    where: { projetoId },
    orderBy: { ordem: "asc" },
  });
  const idx = etapas.findIndex((e) => e.id === etapaId);
  if (idx === -1) return;

  await prisma.projetoEtapa.update({
    where: { id: etapaId },
    data: { status: "PENDENTE", dataInicio: null },
  });

  const anterior = etapas[idx - 1];
  if (anterior) {
    await prisma.projetoEtapa.update({
      where: { id: anterior.id },
      data: { status: "EM_ANDAMENTO", dataFim: null },
    });
  }

  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/calendario");
}

// Reabre uma etapa CONCLUIDA (mexe só nela — ao contrário de voltarEtapa,
// não reativa a etapa anterior, que continua concluída)
export async function reabrirEtapa(formData: FormData) {
  const projetoId = formData.get("projetoId") as string;
  const etapaId = formData.get("etapaId") as string;

  const etapa = await prisma.projetoEtapa.findFirst({ where: { id: etapaId, projetoId } });
  if (!etapa) return;

  await prisma.projetoEtapa.update({
    where: { id: etapaId },
    data: { status: "EM_ANDAMENTO", dataFim: null },
  });

  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/calendario");
}

export async function iniciarEtapa(formData: FormData) {
  const projetoId = formData.get("projetoId") as string;
  const etapaId = formData.get("etapaId") as string;

  const etapa = await prisma.projetoEtapa.findFirst({ where: { id: etapaId, projetoId } });
  if (!etapa) return;

  await prisma.projetoEtapa.update({
    where: { id: etapaId },
    data: { status: "EM_ANDAMENTO", dataInicio: new Date() },
  });
  revalidatePath(`/projetos/${projetoId}`);
}

// ---------- Entregas ----------

export async function criarEntrega(formData: FormData) {
  const projetoId = formData.get("projetoId") as string;
  const link = str(formData, "link");
  if (!projetoId) return;

  const count = await prisma.entrega.count({ where: { projetoId } });
  await prisma.entrega.create({ data: { projetoId, versao: count + 1, link } });
  revalidatePath(`/projetos/${projetoId}`);
}

export async function atualizarStatusEntrega(formData: FormData) {
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  const status = formData.get("status") as string;
  if (!id || !projetoId || !status) return;

  await prisma.entrega.update({
    where: { id },
    data: {
      status: status as never,
      // só sobrescreve o comentário se o formulário realmente enviou o campo —
      // os botões de aprovar/reprovar do admin não têm esse campo e não podem
      // apagar o comentário que o cliente já deixou
      ...(formData.has("comentarioCliente")
        ? { comentarioCliente: str(formData, "comentarioCliente") }
        : {}),
    },
  });
  revalidatePath(`/projetos/${projetoId}`);
}

// ---------- Financeiro do projeto ----------

export async function criarRecebimento(formData: FormData) {
  const projetoId = formData.get("projetoId") as string;
  const valor = num(formData, "valor");
  const vencimento = dataOrNull(formData, "vencimento");
  if (!projetoId || valor === null || !vencimento) return;

  await prisma.recebimento.create({
    data: {
      projetoId,
      valor,
      vencimento,
      formaPagamento: str(formData, "formaPagamento"),
    },
  });
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/financeiro");
}

export async function atualizarRecebimento(formData: FormData) {
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  const status = formData.get("status") as string;
  if (!id || !projetoId || !status) return;

  await prisma.recebimento.update({
    where: { id },
    data: {
      status: status as never,
      dataPagamento: status === "PAGO" ? new Date() : null,
    },
  });
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/financeiro");
}

export async function criarCusto(formData: FormData) {
  const projetoId = formData.get("projetoId") as string;
  const tipo = str(formData, "tipo");
  const valor = num(formData, "valor");
  if (!projetoId || !tipo || valor === null) return;

  await prisma.custo.create({
    data: { projetoId, tipo, valor, descricao: str(formData, "descricao") },
  });
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/financeiro");
}

export async function deletarCusto(formData: FormData) {
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  if (!id || !projetoId) return;

  await prisma.$transaction(async (tx) => {
    // se este custo veio de uma escala (cachê), remove a escala junto —
    // senão ela continua mostrando o cachê como se ainda estivesse custeado
    const escalaVinculada = await tx.escala.findUnique({ where: { custoId: id } });
    if (escalaVinculada) {
      await tx.escala.delete({ where: { id: escalaVinculada.id } });
    }
    await tx.custo.delete({ where: { id } });
  });

  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/financeiro");
}

// ---------- Equipamento do projeto ----------

export async function alocarEquipamento(formData: FormData) {
  const projetoId = formData.get("projetoId") as string;
  const equipamentoId = formData.get("equipamentoId") as string;
  const data = dataOrNull(formData, "data");
  if (!projetoId || !equipamentoId || !data) return;

  await prisma.alocacaoEquipamento.create({ data: { projetoId, equipamentoId, data } });
  revalidatePath(`/projetos/${projetoId}`);
}

export async function alternarChecklistEquipamento(formData: FormData) {
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  const campo = formData.get("campo") as "checklistSaida" | "checklistRetorno";
  if (!id || !campo) return;

  const alocacao = await prisma.alocacaoEquipamento.findUnique({ where: { id } });
  if (!alocacao) return;

  await prisma.alocacaoEquipamento.update({
    where: { id },
    data: { [campo]: !alocacao[campo] },
  });
  revalidatePath(`/projetos/${projetoId}`);
}

export async function removerAlocacaoEquipamento(formData: FormData) {
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  await prisma.alocacaoEquipamento.delete({ where: { id } });
  revalidatePath(`/projetos/${projetoId}`);
}

// ---------- Escala do projeto ----------

export async function criarEscala(formData: FormData) {
  const projetoId = formData.get("projetoId") as string;
  const profissionalId = formData.get("profissionalId") as string;
  const funcao = str(formData, "funcao");
  const data = dataOrNull(formData, "data");
  const cache = num(formData, "cache");
  if (!projetoId || !profissionalId || !funcao || !data) return;

  await prisma.$transaction(async (tx) => {
    let custoId: string | undefined;
    if (cache !== null && cache > 0) {
      const custo = await tx.custo.create({
        data: { projetoId, tipo: `Cachê — ${funcao}`, valor: cache },
      });
      custoId = custo.id;
    }
    await tx.escala.create({
      data: { projetoId, profissionalId, funcao, data, cache, custoId },
    });
  });

  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/financeiro");
}

export async function removerEscala(formData: FormData) {
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  if (!id) return;

  await prisma.$transaction(async (tx) => {
    const escala = await tx.escala.findUnique({ where: { id } });
    if (!escala) return;
    await tx.escala.delete({ where: { id } });
    if (escala.custoId) {
      await tx.custo.delete({ where: { id: escala.custoId } });
    }
  });

  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/financeiro");
}
