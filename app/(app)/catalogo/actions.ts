"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { str, num, int, list } from "@/lib/form";
import type { TipoCobranca } from "@/app/generated/prisma/client";

// ---------- Pilar ----------

export async function createPilar(formData: FormData) {
  const nome = str(formData, "nome");
  if (!nome) return;
  const count = await prisma.pilar.count();
  await prisma.pilar.create({ data: { nome, ordem: count } });
  revalidatePath("/catalogo");
}

export async function updatePilar(formData: FormData) {
  const id = formData.get("id") as string;
  const nome = str(formData, "nome");
  if (!id || !nome) return;
  await prisma.pilar.update({ where: { id }, data: { nome } });
  revalidatePath("/catalogo");
}

export async function togglePilarAtivo(formData: FormData) {
  const id = formData.get("id") as string;
  const pilar = await prisma.pilar.findUnique({ where: { id } });
  if (!pilar) return;
  await prisma.pilar.update({ where: { id }, data: { ativo: !pilar.ativo } });
  revalidatePath("/catalogo");
}

// ---------- Serviço ----------

export async function createServico(formData: FormData) {
  const nome = str(formData, "nome");
  const pilarId = formData.get("pilarId") as string;
  const tipoCobranca = formData.get("tipoCobranca") as TipoCobranca;
  if (!nome || !pilarId || !tipoCobranca) return;

  const servico = await prisma.servico.create({
    data: {
      nome,
      pilarId,
      tipoCobranca,
    },
  });
  revalidatePath("/catalogo");
  redirect(`/catalogo/servicos/${servico.id}`);
}

export async function updateServico(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;
  const nome = str(formData, "nome");
  const pilarId = formData.get("pilarId") as string;
  const tipoCobranca = formData.get("tipoCobranca") as TipoCobranca | null;

  await prisma.servico.update({
    where: { id },
    data: {
      nome: nome ?? undefined,
      pilarId: pilarId || undefined,
      tipoCobranca: tipoCobranca || undefined,
      descricao: str(formData, "descricao"),
      argumentacaoVenda: str(formData, "argumentacaoVenda"),
      objecoesComuns: str(formData, "objecoesComuns"),
    },
  });
  revalidatePath("/catalogo");
  revalidatePath(`/catalogo/servicos/${id}`);
}

export async function toggleServicoAtivo(formData: FormData) {
  const id = formData.get("id") as string;
  const servico = await prisma.servico.findUnique({ where: { id } });
  if (!servico) return;
  await prisma.servico.update({ where: { id }, data: { ativo: !servico.ativo } });
  revalidatePath("/catalogo");
}

// ---------- Plano ----------

export async function createPlano(formData: FormData) {
  const servicoId = formData.get("servicoId") as string;
  const nome = str(formData, "nome");
  if (!servicoId || !nome) return;
  const count = await prisma.plano.count({ where: { servicoId } });
  await prisma.plano.create({
    data: {
      servicoId,
      nome,
      valorMin: num(formData, "valorMin"),
      valorMax: num(formData, "valorMax"),
      prazoDias: int(formData, "prazoDias"),
      prazoTexto: str(formData, "prazoTexto"),
      entregas: list(formData, "entregas"),
      ordem: count,
    },
  });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

export async function updatePlano(formData: FormData) {
  const id = formData.get("id") as string;
  const servicoId = formData.get("servicoId") as string;
  if (!id) return;
  await prisma.plano.update({
    where: { id },
    data: {
      nome: str(formData, "nome") ?? undefined,
      valorMin: num(formData, "valorMin"),
      valorMax: num(formData, "valorMax"),
      prazoDias: int(formData, "prazoDias"),
      prazoTexto: str(formData, "prazoTexto"),
      entregas: list(formData, "entregas"),
    },
  });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

export async function deletePlano(formData: FormData) {
  const id = formData.get("id") as string;
  const servicoId = formData.get("servicoId") as string;
  await prisma.plano.delete({ where: { id } });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

// ---------- Adicional ----------

export async function createAdicional(formData: FormData) {
  const servicoId = formData.get("servicoId") as string;
  const nome = str(formData, "nome");
  if (!servicoId || !nome) return;
  await prisma.adicional.create({
    data: {
      servicoId,
      nome,
      valor: num(formData, "valor"),
      descricao: str(formData, "descricao"),
    },
  });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

export async function updateAdicional(formData: FormData) {
  const id = formData.get("id") as string;
  const servicoId = formData.get("servicoId") as string;
  if (!id) return;
  await prisma.adicional.update({
    where: { id },
    data: {
      nome: str(formData, "nome") ?? undefined,
      valor: num(formData, "valor"),
      descricao: str(formData, "descricao"),
    },
  });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

export async function deleteAdicional(formData: FormData) {
  const id = formData.get("id") as string;
  const servicoId = formData.get("servicoId") as string;
  await prisma.adicional.delete({ where: { id } });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

// ---------- Etapas do pipeline ----------

export async function createEtapaTemplate(formData: FormData) {
  const servicoId = formData.get("servicoId") as string;
  const nome = str(formData, "nome");
  if (!servicoId || !nome) return;
  const count = await prisma.pipelineEtapaTemplate.count({ where: { servicoId } });
  await prisma.pipelineEtapaTemplate.create({ data: { servicoId, nome, ordem: count } });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

export async function deleteEtapaTemplate(formData: FormData) {
  const id = formData.get("id") as string;
  const servicoId = formData.get("servicoId") as string;
  await prisma.pipelineEtapaTemplate.delete({ where: { id } });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

export async function moverEtapaTemplate(formData: FormData) {
  const id = formData.get("id") as string;
  const servicoId = formData.get("servicoId") as string;
  const direcao = formData.get("direcao") as "cima" | "baixo";

  const etapas = await prisma.pipelineEtapaTemplate.findMany({
    where: { servicoId },
    orderBy: { ordem: "asc" },
  });
  const idx = etapas.findIndex((e) => e.id === id);
  const alvo = direcao === "cima" ? idx - 1 : idx + 1;
  if (idx === -1 || alvo < 0 || alvo >= etapas.length) return;

  const a = etapas[idx];
  const b = etapas[alvo];
  await prisma.$transaction([
    prisma.pipelineEtapaTemplate.update({ where: { id: a.id }, data: { ordem: b.ordem } }),
    prisma.pipelineEtapaTemplate.update({ where: { id: b.id }, data: { ordem: a.ordem } }),
  ]);
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

// ---------- Templates de equipe e equipamento (por plano) ----------

export async function createTemplateEquipe(formData: FormData) {
  const planoId = formData.get("planoId") as string;
  const servicoId = formData.get("servicoId") as string;
  const funcao = str(formData, "funcao");
  const quantidade = int(formData, "quantidade") ?? 1;
  if (!planoId || !funcao) return;

  await prisma.templateEquipe.create({ data: { planoId, funcao, quantidade } });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

export async function deleteTemplateEquipe(formData: FormData) {
  const id = formData.get("id") as string;
  const servicoId = formData.get("servicoId") as string;
  await prisma.templateEquipe.delete({ where: { id } });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

export async function createTemplateEquipamento(formData: FormData) {
  const planoId = formData.get("planoId") as string;
  const servicoId = formData.get("servicoId") as string;
  const equipamentoId = formData.get("equipamentoId") as string;
  if (!planoId || !equipamentoId) return;

  await prisma.templateEquipamento.create({ data: { planoId, equipamentoId } });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}

export async function deleteTemplateEquipamento(formData: FormData) {
  const id = formData.get("id") as string;
  const servicoId = formData.get("servicoId") as string;
  await prisma.templateEquipamento.delete({ where: { id } });
  revalidatePath(`/catalogo/servicos/${servicoId}`);
}
