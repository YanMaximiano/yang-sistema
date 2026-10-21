import { PrismaClient, TipoCobranca, StatusEquipamento } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import fonte from "./catalogo-fonte.json";
import equipamentosFonte from "./equipamentos-fonte.json";
import kitsFonte from "./kits-fonte.json";
import dadosPrivadosExemplo from "./dados-privados.exemplo.json";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ORDEM_PILARES = [
  "Conteúdo para Empresas",
  "Filmes Publicitários & Campanhas",
  "Institucional & Corporativo",
  "Eventos Corporativos",
  "Eventos Sociais",
  "Serviços Especiais",
  "Estúdio & Podcast",
  "Live Streaming",
  "Pós-produção",
  "Agência",
];

const ETAPAS_PADRAO_PROJETO_UNICO = [
  "Briefing",
  "Roteiro",
  "Captação",
  "Decupagem",
  "Edição",
  "Cor",
  "Áudio/Mixagem",
  "Revisão do Cliente",
  "Entrega Final",
];

const ETAPAS_PADRAO_RECORRENTE = [
  "Planejamento do Ciclo",
  "Captação",
  "Edição",
  "Revisão Interna",
  "Aprovação do Cliente",
  "Publicação/Entrega",
];

type PlanoFonte = {
  nome: string;
  valor_min: number | null;
  valor_max: number | null;
  prazo_dias: number | null;
  prazo_texto?: string | null;
  entregas: string[];
};

type AdicionalFonte = {
  nome: string;
  valor: number | null;
  descricao: string | null;
};

type ServicoFonte = {
  arquivo: string;
  servico: string;
  pilar_sugerido: string;
  tipo_cobranca: keyof typeof TipoCobranca;
  descricao?: string | null;
  planos: PlanoFonte[];
  adicionais: AdicionalFonte[];
  argumentacao_venda?: string | null;
  objecoes_comuns?: string | null;
  pipeline_etapas_sugeridas?: string[];
};

async function seedCatalogo() {
  console.log("Seed: criando pilares...");
  const pilarPorNome = new Map<string, string>();
  for (let i = 0; i < ORDEM_PILARES.length; i++) {
    const nome = ORDEM_PILARES[i];
    const pilar = await prisma.pilar.upsert({
      where: { id: `seed-pilar-${i}` },
      update: { nome, ordem: i },
      create: { id: `seed-pilar-${i}`, nome, ordem: i },
    });
    pilarPorNome.set(nome, pilar.id);
  }

  const servicos = fonte as ServicoFonte[];
  console.log(`Seed: criando ${servicos.length} serviços do catálogo...`);

  for (let i = 0; i < servicos.length; i++) {
    const s = servicos[i];
    const pilarId = pilarPorNome.get(s.pilar_sugerido);
    if (!pilarId) {
      console.warn(`Pilar não encontrado para "${s.servico}": ${s.pilar_sugerido}`);
      continue;
    }

    const servico = await prisma.servico.upsert({
      where: { id: `seed-servico-${i}` },
      update: {
        pilarId,
        nome: s.servico,
        tipoCobranca: s.tipo_cobranca as TipoCobranca,
        descricao: s.descricao ?? null,
        argumentacaoVenda: s.argumentacao_venda ?? null,
        objecoesComuns: s.objecoes_comuns ?? null,
        ordem: i,
      },
      create: {
        id: `seed-servico-${i}`,
        pilarId,
        nome: s.servico,
        tipoCobranca: s.tipo_cobranca as TipoCobranca,
        descricao: s.descricao ?? null,
        argumentacaoVenda: s.argumentacao_venda ?? null,
        objecoesComuns: s.objecoes_comuns ?? null,
        ordem: i,
      },
    });

    // Atualiza sem apagar: propostas e projetos já criados apontam para estes planos e adicionais.
    // Planos casam por posição, adicionais por nome; o que sobra do lado do banco é desativado.
    const planosAtuais = await prisma.plano.findMany({
      where: { servicoId: servico.id },
      orderBy: [{ ordem: "asc" }, { id: "asc" }],
    });
    for (let p = 0; p < s.planos.length; p++) {
      const plano = s.planos[p];
      const dados = {
        nome: plano.nome,
        valorMin: plano.valor_min ?? null,
        valorMax: plano.valor_max ?? null,
        prazoDias: plano.prazo_dias ?? null,
        prazoTexto: plano.prazo_texto ?? null,
        entregas: plano.entregas ?? [],
        ordem: p,
        ativo: true,
      };
      const atual = planosAtuais[p];
      if (atual) await prisma.plano.update({ where: { id: atual.id }, data: dados });
      else await prisma.plano.create({ data: { servicoId: servico.id, ...dados } });
    }
    for (const sobra of planosAtuais.slice(s.planos.length)) {
      await prisma.plano.update({ where: { id: sobra.id }, data: { ativo: false } });
    }

    const adicionaisAtuais = await prisma.adicional.findMany({ where: { servicoId: servico.id } });
    const chave = (nome: string) => nome.trim().toLowerCase();
    const nomesDaFonte = new Set(s.adicionais.map((a) => chave(a.nome)));
    for (const adicional of s.adicionais) {
      const dados = { valor: adicional.valor ?? null, descricao: adicional.descricao ?? null, ativo: true };
      const atual = adicionaisAtuais.find((x) => chave(x.nome) === chave(adicional.nome));
      if (atual) await prisma.adicional.update({ where: { id: atual.id }, data: dados });
      else await prisma.adicional.create({ data: { servicoId: servico.id, nome: adicional.nome, ...dados } });
    }
    for (const antigo of adicionaisAtuais) {
      if (antigo.ativo && !nomesDaFonte.has(chave(antigo.nome))) {
        await prisma.adicional.update({ where: { id: antigo.id }, data: { ativo: false } });
      }
    }

    // etapas do pipeline podem ter sido ajustadas na tela: só cria se o serviço ainda não tem nenhuma
    if ((await prisma.pipelineEtapaTemplate.count({ where: { servicoId: servico.id } })) === 0) {
      const etapas =
        s.pipeline_etapas_sugeridas && s.pipeline_etapas_sugeridas.length > 0
          ? s.pipeline_etapas_sugeridas
          : s.tipo_cobranca === "RECORRENCIA_MENSAL"
            ? ETAPAS_PADRAO_RECORRENTE
            : ETAPAS_PADRAO_PROJETO_UNICO;
      for (let e = 0; e < etapas.length; e++) {
        await prisma.pipelineEtapaTemplate.create({
          data: { servicoId: servico.id, nome: etapas[e], ordem: e },
        });
      }
    }
  }
}

async function seedEquipamentos(lista: typeof equipamentosFonte = equipamentosFonte) {
  console.log(`Seed: criando ${lista.length} equipamentos do inventário...`);
  await prisma.equipamento.createMany({
    data: lista.map((e) => ({
      nome: e.nome,
      categoria: e.categoria,
      observacoes: "observacoes" in e ? e.observacoes : null,
      foto: e.foto,
      status: e.status as StatusEquipamento,
      valorCompra: dadosPrivados.valoresCompra[e.nome] ?? null,
    })),
  });
}

// banco já semeado antes de existir o valor de compra: preenche só quem está sem valor
// (por nome), sem sobrescrever o que alguém já informou em /calculadora
async function preencherValoresDeCompra() {
  let preenchidos = 0;
  for (const [nome, valorCompra] of Object.entries(dadosPrivados.valoresCompra)) {
    const r = await prisma.equipamento.updateMany({
      where: { nome, valorCompra: null },
      data: { valorCompra },
    });
    preenchidos += r.count;
  }
  console.log(`Seed: valor de compra preenchido em ${preenchidos} equipamento(s) sem valor.`);
}

// valores iniciais da calculadora (custos fixos, pessoas e valor de compra dos equipamentos)
// são dados financeiros reais da Yang e NÃO ficam no Git: vêm de prisma/dados-privados.json
// (ignorado pelo Git). Sem esse arquivo, usa o modelo neutro dados-privados.exemplo.json e tudo
// é preenchido pela tela. Só roda com as tabelas vazias — depois os valores são editados na tela.
// escopo: YANG | COMPARTILHADO (YANG + perfil Yan, entra pelo rateio) | PESSOAL (não entra na hora).
type CustoInicial = {
  nome: string;
  categoria: string;
  escopo: "YANG" | "COMPARTILHADO" | "PESSOAL";
  doAporte: boolean;
  valorMensal: number;
  valoresPorMes: Record<string, number>;
  ativo?: boolean;
};

type PessoaInicial = { nome: string; funcao: string; horasMes: number; ocupacaoPct: number };

type DadosPrivados = {
  custosFixos: CustoInicial[];
  pessoas: PessoaInicial[];
  valoresCompra: Record<string, number>;
  config: { aporteTotal?: number };
};

function carregarDadosPrivados(): DadosPrivados {
  const arquivo = path.join(process.cwd(), "prisma", "dados-privados.json");
  if (existsSync(arquivo)) {
    let bruto: Partial<DadosPrivados>;
    try {
      bruto = JSON.parse(readFileSync(arquivo, "utf-8"));
    } catch (e) {
      throw new Error(`prisma/dados-privados.json inválido: ${(e as Error).message}`);
    }
    console.log("Seed: usando prisma/dados-privados.json.");
    return normalizarDadosPrivados(bruto);
  }
  console.log("Seed: prisma/dados-privados.json não existe — usando valores neutros (preencha em /calculadora e /equipamentos).");
  return normalizarDadosPrivados(dadosPrivadosExemplo as Partial<DadosPrivados>);
}

// aceita arquivo com chaves faltando (usa o vazio) e ignora chaves de config desconhecidas
function normalizarDadosPrivados(bruto: Partial<DadosPrivados>): DadosPrivados {
  return {
    custosFixos: (bruto.custosFixos ?? []).map((c) => ({ ...c, valoresPorMes: c.valoresPorMes ?? {} })),
    pessoas: bruto.pessoas ?? [],
    valoresCompra: bruto.valoresCompra ?? {},
    config: { aporteTotal: bruto.config?.aporteTotal },
  };
}

const dadosPrivados = carregarDadosPrivados();

async function seedCapacidade() {
  console.log("Seed: criando capacidade de horas inicial...");
  await prisma.pessoaHoras.createMany({
    data: dadosPrivados.pessoas.map((p) => ({ ...p, escopo: "COMPARTILHADO" as const })),
  });
}

// kits de equipamento (por nome, em kits-fonte.json); só entram os itens que existem no inventário
async function seedKits() {
  console.log("Seed: criando kits de equipamento...");
  // tudo ou nada: se falhar no meio, nenhum kit fica pela metade e o seed pode rodar de novo
  await prisma.$transaction(async (tx) => {
    for (const kit of kitsFonte) {
      const equipamentos = await tx.equipamento.findMany({
        where: { nome: { in: kit.itens } },
        select: { id: true, nome: true },
      });
      const achados = new Set(equipamentos.map((e) => e.nome));
      const faltando = kit.itens.filter((n) => !achados.has(n));
      if (faltando.length > 0) {
        console.warn(`Seed: kit "${kit.nome}" sem estes itens (não estão no inventário): ${faltando.join(", ")}`);
      }
      if (equipamentos.length === 0) continue;
      await tx.kitEquipamento.create({
        data: { nome: kit.nome, itens: { create: equipamentos.map((e) => ({ equipamentoId: e.id })) } },
      });
    }
  });
}

// parâmetros da calculadora: só cria o registro único se ainda não existir (não sobrescreve o que foi editado na tela)
async function seedConfigCalculadora() {
  await prisma.configCalculadora.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", ...dadosPrivados.config },
  });
}

async function seedCalculadora() {
  if (dadosPrivados.custosFixos.length === 0) return;
  console.log("Seed: criando custos fixos iniciais da calculadora...");
  await prisma.$transaction(
    dadosPrivados.custosFixos.map((c) =>
      prisma.custoFixo.create({
        data: {
          nome: c.nome,
          categoria: c.categoria,
          valorMensal: c.valorMensal,
          escopo: c.escopo,
          doAporte: c.doAporte,
          ativo: c.ativo ?? true,
          meses: {
            create: Object.entries(c.valoresPorMes).map(([mes, valor]) => ({ mes, valor })),
          },
        },
      })
    )
  );
}

// devolve as credenciais do primeiro admin, ou null se já existe um ADMIN;
// falha logo no começo (antes de mexer no banco) se faltar a senha
async function credenciaisDoNovoAdmin() {
  if ((await prisma.user.count({ where: { role: "ADMIN" } })) > 0) return null;

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_PASSWORD;
  if (!email || !senha) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no ambiente para criar o primeiro usuário administrador.");
  }
  return { email, senha };
}

async function main() {
  const novoAdmin = await credenciaisDoNovoAdmin();

  // o catálogo é editável pela tela /catalogo — sincronizar com os arquivos-fonte sobrescreve
  // preços, entregas e adicionais editados lá, então só roda em banco vazio ou com SEED_FORCE=1
  // (que atualiza o que já existe, sem apagar planos/adicionais usados por propostas e projetos)
  // (também roda se um seed anterior foi interrompido no meio e deixou o catálogo incompleto —
  // a sincronização é segura de repetir)
  const servicosNaFonte = (fonte as ServicoFonte[]).length;
  const planosNaFonte = (fonte as ServicoFonte[]).reduce((n, s) => n + s.planos.length, 0);
  const catalogoIncompleto =
    (await prisma.servico.count()) < servicosNaFonte || (await prisma.plano.count()) < planosNaFonte;
  if (catalogoIncompleto || process.env.SEED_FORCE === "1") {
    await seedCatalogo();
  } else {
    console.log("Seed: catálogo já existe — pulado (SEED_FORCE=1 sincroniza com prisma/catalogo-fonte.json; sobrescreve preços e entregas editados na tela).");
  }

  // inventário é editável em /equipamentos — só carrega em tabela vazia
  if ((await prisma.equipamento.count()) === 0) {
    await seedEquipamentos();
  } else {
    console.log("Seed: equipamentos já existem — pulado.");
    if (process.env.SEED_FORCE === "1") {
      const existentes = new Set((await prisma.equipamento.findMany({ select: { nome: true } })).map((e) => e.nome));
      const faltando = equipamentosFonte.filter((e) => !existentes.has(e.nome));
      if (faltando.length > 0) await seedEquipamentos(faltando);
    }
    await preencherValoresDeCompra();
  }

  if ((await prisma.pessoaHoras.count()) === 0) {
    await seedCapacidade();
  } else {
    console.log("Seed: capacidade de horas já existe — pulado.");
  }

  if ((await prisma.kitEquipamento.count()) === 0) {
    await seedKits();
  } else {
    console.log("Seed: kits já existem — pulado.");
  }

  if ((await prisma.custoFixo.count()) === 0) {
    await seedCalculadora();
  } else {
    console.log("Seed: custos fixos já existem — pulado.");
  }

  await seedConfigCalculadora();

  if (novoAdmin) {
    await prisma.user.create({
      data: {
        name: "Admin Yang",
        email: novoAdmin.email,
        passwordHash: await bcrypt.hash(novoAdmin.senha, 10),
        role: "ADMIN",
      },
    });
    console.log(`Seed: administrador criado (${novoAdmin.email}).`);
  } else {
    console.log("Seed: já existe um usuário ADMIN — mantido sem alterações.");
  }
  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
