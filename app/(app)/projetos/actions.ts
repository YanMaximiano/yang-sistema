"use server";

import { prisma } from "@/lib/prisma";
import { requireModulo } from "@/lib/acesso";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { str, num, dataOrNull, linkHttp } from "@/lib/form";
import { renderModeloDocumento } from "@/lib/documentos";
import type {
  StatusGeralProjeto,
  StatusEntrega,
  StatusRecebimento,
  TipoDocumento,
} from "@/app/generated/prisma/client";

// ---------- Projeto ----------

export async function criarProjetoAvulso(formData: FormData) {
  await requireModulo("projetos");
  const clienteId = formData.get("clienteId") as string;
  const servicoId = formData.get("servicoId") as string;
  const planoId = str(formData, "planoId");
  const nome = str(formData, "nome");
  const valor = num(formData, "valor");
  if (!clienteId || !servicoId || !nome || valor === null) return;

  const servico = await prisma.servico.findUnique({
    where: { id: servicoId },
    include: {
      etapasTemplate: { orderBy: { ordem: "asc" } },
      checklistTemplate: { orderBy: { ordem: "asc" } },
    },
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
      checklistItens: {
        create: servico.checklistTemplate.map((c) => ({ nome: c.nome, ordem: c.ordem })),
      },
    },
  });

  revalidatePath("/projetos");
  redirect(`/projetos/${projeto.id}`);
}

export async function atualizarStatusGeralProjeto(formData: FormData) {
  await requireModulo("projetos");
  const id = formData.get("id") as string;
  const statusGeral = formData.get("statusGeral") as StatusGeralProjeto;
  if (!id || !statusGeral) return;
  await prisma.projeto.update({ where: { id }, data: { statusGeral } });
  revalidatePath(`/projetos/${id}`);
  revalidatePath("/projetos");
}

// ---------- Etapas ----------

export async function avancarEtapa(formData: FormData) {
  await requireModulo("projetos");
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
  await requireModulo("projetos");
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
  await requireModulo("projetos");
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
  await requireModulo("projetos");
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
  await requireModulo("projetos");
  const projetoId = formData.get("projetoId") as string;
  const link = linkHttp(formData, "link");
  if (!projetoId || (str(formData, "link") && !link)) return; // link preenchido mas inválido: não cria

  const count = await prisma.entrega.count({ where: { projetoId } });
  await prisma.entrega.create({ data: { projetoId, versao: count + 1, link } });
  revalidatePath(`/projetos/${projetoId}`);
}

export async function atualizarStatusEntrega(formData: FormData) {
  await requireModulo("projetos");
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  const status = formData.get("status") as StatusEntrega;
  if (!id || !projetoId || !status) return;

  await prisma.entrega.updateMany({
    where: { id, projetoId },
    data: {
      status,
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
  await requireModulo("projetos_financeiro");
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
  await requireModulo("projetos_financeiro");
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  const status = formData.get("status") as StatusRecebimento;
  if (!id || !projetoId || !status) return;

  await prisma.recebimento.update({
    where: { id },
    data: {
      status,
      dataPagamento: status === "PAGO" ? new Date() : null,
    },
  });
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/financeiro");
}

export async function criarCusto(formData: FormData) {
  await requireModulo("projetos_financeiro");
  const projetoId = formData.get("projetoId") as string;
  const tipo = str(formData, "tipo");
  const valor = num(formData, "valor");
  if (!projetoId || !tipo || valor === null) return;

  await prisma.custo.create({
    data: {
      projetoId,
      tipo,
      valor,
      descricao: str(formData, "descricao"),
      dataPrevista: dataOrNull(formData, "dataPrevista"),
    },
  });
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/financeiro");
}

export async function deletarCusto(formData: FormData) {
  await requireModulo("projetos_financeiro");
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
  await requireModulo("projetos");
  const projetoId = formData.get("projetoId") as string;
  const equipamentoId = formData.get("equipamentoId") as string;
  const data = dataOrNull(formData, "data");
  if (!projetoId || !equipamentoId || !data) return;

  const equipamento = await prisma.equipamento.findUnique({
    where: { id: equipamentoId },
    select: { ativo: true, status: true },
  });
  if (!equipamento || !equipamento.ativo || equipamento.status === "ESTRAGADO") return;

  await prisma.alocacaoEquipamento.create({ data: { projetoId, equipamentoId, data } });
  revalidatePath(`/projetos/${projetoId}`);
}

export async function alternarChecklistEquipamento(formData: FormData) {
  await requireModulo("projetos");
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  const campo = formData.get("campo") as string;
  if (!id || (campo !== "checklistSaida" && campo !== "checklistRetorno")) return;

  const alocacao = await prisma.alocacaoEquipamento.findUnique({ where: { id } });
  if (!alocacao) return;

  await prisma.alocacaoEquipamento.update({
    where: { id },
    data: { [campo]: !alocacao[campo] },
  });
  revalidatePath(`/projetos/${projetoId}`);
}

export async function alternarItemChecklist(formData: FormData) {
  await requireModulo("projetos");
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  if (!id) return;

  const item = await prisma.checklistPreProducaoItem.findUnique({ where: { id } });
  if (!item) return;

  await prisma.checklistPreProducaoItem.update({
    where: { id },
    data: { concluido: !item.concluido },
  });
  revalidatePath(`/projetos/${projetoId}`);
}

export async function removerAlocacaoEquipamento(formData: FormData) {
  await requireModulo("projetos");
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  if (!id || !projetoId) return;
  await prisma.alocacaoEquipamento.delete({ where: { id } });
  revalidatePath(`/projetos/${projetoId}`);
}

// ---------- Escala do projeto ----------

export async function criarEscala(formData: FormData) {
  const acesso = await requireModulo("projetos");
  const projetoId = formData.get("projetoId") as string;
  const profissionalId = formData.get("profissionalId") as string;
  const funcao = str(formData, "funcao");
  const data = dataOrNull(formData, "data");
  // cachê vira custo do projeto: só quem tem a área de valores dos projetos lança
  const cache = acesso.tem("projetos_financeiro") ? num(formData, "cache") : null;
  if (!projetoId || !profissionalId || !funcao || !data) return;

  await prisma.$transaction(async (tx) => {
    let custoId: string | undefined;
    if (cache !== null && cache > 0) {
      const custo = await tx.custo.create({
        data: { projetoId, tipo: `Cachê — ${funcao}`, valor: cache, dataPrevista: data },
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
  await requireModulo("projetos");
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

// ---------- Documentos ----------

export async function gerarDocumento(formData: FormData) {
  await requireModulo("projetos");
  const projetoId = formData.get("projetoId") as string;
  const modeloDocumentoId = formData.get("modeloDocumentoId") as string;
  if (!projetoId || !modeloDocumentoId) return;

  const [projeto, modelo] = await Promise.all([
    prisma.projeto.findUnique({ where: { id: projetoId }, include: { cliente: true, servico: true } }),
    prisma.modeloDocumento.findUnique({ where: { id: modeloDocumentoId } }),
  ]);
  if (!projeto || !modelo) return;

  const conteudo = renderModeloDocumento(modelo.conteudo, {
    cliente: { nome: projeto.cliente.nome, empresa: projeto.cliente.empresa },
    projeto: { nome: projeto.nome, valor: projeto.valor, prazoData: projeto.prazoData },
    servico: { nome: projeto.servico.nome },
  });

  await prisma.documento.create({
    data: {
      projetoId,
      modeloDocumentoId,
      tipo: modelo.tipo,
      nome: modelo.nome,
      conteudo,
    },
  });

  revalidatePath(`/projetos/${projetoId}`);
}

export async function criarDocumentoLink(formData: FormData) {
  await requireModulo("projetos");
  const projetoId = formData.get("projetoId") as string;
  const tipo = formData.get("tipo") as TipoDocumento;
  const nome = str(formData, "nome");
  const link = linkHttp(formData, "link");
  if (!projetoId || !tipo || !nome || !link) return;

  await prisma.documento.create({ data: { projetoId, tipo, nome, link } });
  revalidatePath(`/projetos/${projetoId}`);
}

export async function enviarParaAssinatura(formData: FormData) {
  await requireModulo("projetos");
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  if (!id || !projetoId) return;

  await prisma.documento.updateMany({
    where: { id, status: "RASCUNHO" },
    data: { status: "AGUARDANDO_ASSINATURA" },
  });
  revalidatePath(`/projetos/${projetoId}`);
  revalidatePath("/portal");
}

export async function deletarDocumento(formData: FormData) {
  await requireModulo("projetos");
  const id = formData.get("id") as string;
  const projetoId = formData.get("projetoId") as string;
  if (!id || !projetoId) return;

  // documento já assinado é registro/prova — não some pelo admin, só fica
  await prisma.documento.deleteMany({ where: { id, status: { not: "ASSINADO" } } });
  revalidatePath(`/projetos/${projetoId}`);
}
