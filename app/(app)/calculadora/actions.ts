"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { str, num, int } from "@/lib/form";
import { CONFIG_PADRAO, ESCOPOS, MES_VALIDO, type ConfigCalculadora } from "@/lib/calculadora";

// valor negativo não faz sentido em nenhum campo da calculadora
function naoNegativo(n: number | null) {
  return n != null && n >= 0 ? n : null;
}

function porcento(n: number | null, padrao: number) {
  return n != null && n >= 0 && n <= 99 ? n : padrao;
}

export async function salvarConfig(formData: FormData) {
  await requireRole("ADMIN");
  // valor digitado inválido mantém o que já estava salvo (e só na falta dele cai no padrão)
  const guardado = await prisma.configCalculadora.findUnique({ where: { id: "singleton" } });
  const p: ConfigCalculadora = guardado
    ? (Object.fromEntries(
        Object.keys(CONFIG_PADRAO).map((k) => [k, guardado[k as keyof typeof guardado]])
      ) as ConfigCalculadora)
    : CONFIG_PADRAO;
  const dados: ConfigCalculadora = {
    horasMensais: naoNegativo(num(formData, "horasMensais")) || p.horasMensais,
    pessoasFaturaveis: Math.min(50, Math.max(1, int(formData, "pessoasFaturaveis") ?? p.pessoasFaturaveis)),
    ocupacaoPct: Math.min(100, naoNegativo(num(formData, "ocupacaoPct")) || p.ocupacaoPct),
    impostoPct: porcento(num(formData, "impostoPct"), p.impostoPct),
    margemPct: porcento(num(formData, "margemPct"), p.margemPct),
    comissaoPct: porcento(num(formData, "comissaoPct"), p.comissaoPct),
    rateioYangPct: Math.min(100, naoNegativo(num(formData, "rateioYangPct")) ?? p.rateioYangPct),
    ticketCasamento: naoNegativo(num(formData, "ticketCasamento")) ?? p.ticketCasamento,
    aporteTotal: naoNegativo(num(formData, "aporteTotal")) ?? p.aporteTotal,
    aporteInicio: (() => {
      const m = str(formData, "aporteInicio");
      return m && MES_VALIDO.test(m) ? m : p.aporteInicio;
    })(),
    aporteMeses: Math.min(12, Math.max(1, int(formData, "aporteMeses") ?? p.aporteMeses)),
    diasUsoMes: naoNegativo(num(formData, "diasUsoMes")) || p.diasUsoMes,
    encargosPct: naoNegativo(num(formData, "encargosPct")) ?? p.encargosPct,
    depreciacaoPct: (() => {
      const v = num(formData, "depreciacaoPct");
      return v != null && v >= 0 && v <= 100 ? v : p.depreciacaoPct;
    })(),
    precoCombustivel: naoNegativo(num(formData, "precoCombustivel")) ?? p.precoCombustivel,
    consumoKmL: naoNegativo(num(formData, "consumoKmL")) || p.consumoKmL,
    desgasteKm: naoNegativo(num(formData, "desgasteKm")) ?? p.desgasteKm,
    alimentacaoDia: naoNegativo(num(formData, "alimentacaoDia")) ?? p.alimentacaoDia,
    diariaHospedagem: naoNegativo(num(formData, "diariaHospedagem")) ?? p.diariaHospedagem,
  };
  // imposto + margem + comissão >= 100% não tem preço possível: mantém o que já estava salvo
  if (dados.impostoPct + dados.margemPct + dados.comissaoPct >= 100) return;

  await prisma.configCalculadora.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...dados },
    update: dados,
  });
  revalidatePath("/calculadora");
}

function escopoDoFormulario(formData: FormData) {
  const e = str(formData, "escopo");
  return ESCOPOS.some((x) => x.valor === e) ? (e as string) : "YANG";
}

export async function criarCustoFixo(formData: FormData) {
  await requireRole("ADMIN");
  const nome = str(formData, "nome");
  const categoria = str(formData, "categoria");
  const valorMensal = naoNegativo(num(formData, "valorMensal"));
  if (!nome || !categoria || valorMensal == null) return;

  await prisma.custoFixo.create({
    data: {
      nome,
      categoria,
      valorMensal,
      escopo: escopoDoFormulario(formData),
      doAporte: formData.get("doAporte") === "on",
    },
  });
  revalidatePath("/calculadora");
}

export async function atualizarCustoFixo(formData: FormData) {
  await requireRole("ADMIN");
  const id = str(formData, "id");
  const nome = str(formData, "nome");
  const categoria = str(formData, "categoria");
  const valorMensal = naoNegativo(num(formData, "valorMensal"));
  if (!id || !nome || !categoria || valorMensal == null) return;

  await prisma.custoFixo.update({
    where: { id },
    data: {
      nome,
      categoria,
      valorMensal,
      escopo: escopoDoFormulario(formData),
      doAporte: formData.get("doAporte") === "on",
    },
  });
  revalidatePath("/calculadora");
}

// um campo mes_<yyyy-MM> por mês; vazio apaga a exceção e volta ao valor padrão do custo
export async function salvarValoresMensais(formData: FormData) {
  await requireRole("ADMIN");
  const custoFixoId = str(formData, "id");
  if (!custoFixoId) return;

  const operacoes = [];
  for (const campo of formData.keys()) {
    if (!campo.startsWith("mes_")) continue;
    const mes = campo.slice(4);
    if (!MES_VALIDO.test(mes)) continue;
    const preenchido = str(formData, campo) != null;
    const valor = naoNegativo(num(formData, campo));
    if (preenchido && valor == null) continue; // valor inválido: mantém o que estava
    operacoes.push(
      valor == null
        ? prisma.custoFixoMes.deleteMany({ where: { custoFixoId, mes } })
        : prisma.custoFixoMes.upsert({
            where: { custoFixoId_mes: { custoFixoId, mes } },
            create: { custoFixoId, mes, valor },
            update: { valor },
          })
    );
  }
  if (operacoes.length === 0) return;
  await prisma.$transaction(operacoes);
  revalidatePath("/calculadora");
}

export async function alternarAtivoCustoFixo(formData: FormData) {
  await requireRole("ADMIN");
  const id = str(formData, "id");
  if (!id) return;
  const custo = await prisma.custoFixo.findUnique({ where: { id } });
  if (!custo) return;
  await prisma.custoFixo.update({ where: { id }, data: { ativo: !custo.ativo } });
  revalidatePath("/calculadora");
}

export async function excluirCustoFixo(formData: FormData) {
  await requireRole("ADMIN");
  const id = str(formData, "id");
  if (!id) return;
  await prisma.custoFixo.deleteMany({ where: { id } });
  revalidatePath("/calculadora");
}

// o formulário de equipamentos manda um par de campos por item: valor_<id> e vida_<id>
export async function salvarEquipamentos(formData: FormData) {
  await requireRole("ADMIN");
  const ids = formData.getAll("ids").map(String);
  if (ids.length === 0) return;

  await prisma.$transaction(
    ids.map((id) =>
      prisma.equipamento.update({
        where: { id },
        data: {
          valorCompra: naoNegativo(num(formData, `valor_${id}`)),
          vidaUtilMeses: (() => {
            const v = int(formData, `vida_${id}`);
            return v != null && v > 0 && v <= 1200 ? v : null;
          })(),
        },
      })
    )
  );
  revalidatePath("/calculadora");
}

// um campo salario_<id> por profissional fixo
export async function salvarSalarios(formData: FormData) {
  await requireRole("ADMIN");
  const ids = formData.getAll("ids").map(String);
  if (ids.length === 0) return;

  await prisma.$transaction(
    ids.map((id) =>
      prisma.profissional.update({
        where: { id },
        data: { salarioMensal: naoNegativo(num(formData, `salario_${id}`)) },
      })
    )
  );
  revalidatePath("/calculadora");
}

function horasValidas(n: number | null, padrao: number) {
  return n != null && n > 0 && n <= 744 ? n : padrao;
}

function ocupacaoValida(n: number | null, padrao: number) {
  return n != null && n > 0 && n <= 100 ? n : padrao;
}

export async function criarPessoaHoras(formData: FormData) {
  await requireRole("ADMIN");
  const nome = str(formData, "nome");
  if (!nome) return;
  await prisma.pessoaHoras.create({
    data: {
      nome,
      funcao: str(formData, "funcao"),
      horasMes: horasValidas(num(formData, "horasMes"), CONFIG_PADRAO.horasMensais),
      ocupacaoPct: ocupacaoValida(num(formData, "ocupacaoPct"), CONFIG_PADRAO.ocupacaoPct),
      escopo: escopoDoFormulario(formData),
    },
  });
  revalidatePath("/calculadora");
}

// um conjunto horas_<id>, ocup_<id>, escopo_<id> por pessoa
export async function salvarPessoasHoras(formData: FormData) {
  await requireRole("ADMIN");
  const ids = formData.getAll("ids").map(String);
  if (ids.length === 0) return;

  await prisma.$transaction(
    ids.map((id) => {
      const escopo = str(formData, `escopo_${id}`);
      return prisma.pessoaHoras.update({
        where: { id },
        data: {
          horasMes: horasValidas(num(formData, `horas_${id}`), CONFIG_PADRAO.horasMensais),
          ocupacaoPct: ocupacaoValida(num(formData, `ocup_${id}`), CONFIG_PADRAO.ocupacaoPct),
          escopo: ESCOPOS.some((x) => x.valor === escopo) ? (escopo as string) : "COMPARTILHADO",
        },
      });
    })
  );
  revalidatePath("/calculadora");
}

export async function excluirPessoaHoras(formData: FormData) {
  await requireRole("ADMIN");
  const id = str(formData, "id");
  if (!id) return;
  await prisma.pessoaHoras.deleteMany({ where: { id } });
  revalidatePath("/calculadora");
}

export async function criarKit(formData: FormData) {
  await requireRole("ADMIN");
  const nome = str(formData, "nome");
  const ids = Array.from(new Set(formData.getAll("equipamentoIds").map(String)));
  if (!nome || ids.length === 0) return;

  // só entram ids que existem de verdade (o formulário pode ser forjado)
  const validos = await prisma.equipamento.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (validos.length === 0) return;
  await prisma.kitEquipamento.create({
    data: { nome, itens: { create: validos.map((e) => ({ equipamentoId: e.id })) } },
  });
  revalidatePath("/calculadora");
}

export async function excluirKit(formData: FormData) {
  await requireRole("ADMIN");
  const id = str(formData, "id");
  if (!id) return;
  await prisma.kitEquipamento.deleteMany({ where: { id } });
  revalidatePath("/calculadora");
}
