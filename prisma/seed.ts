import { PrismaClient, TipoCobranca } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import fonte from "./catalogo-fonte.json";

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
        argumentacaoVenda: s.argumentacao_venda ?? null,
        objecoesComuns: s.objecoes_comuns ?? null,
        ordem: i,
      },
      create: {
        id: `seed-servico-${i}`,
        pilarId,
        nome: s.servico,
        tipoCobranca: s.tipo_cobranca as TipoCobranca,
        argumentacaoVenda: s.argumentacao_venda ?? null,
        objecoesComuns: s.objecoes_comuns ?? null,
        ordem: i,
      },
    });

    // Limpa planos/adicionais/etapas antigos deste serviço antes de recriar (idempotente)
    await prisma.plano.deleteMany({ where: { servicoId: servico.id } });
    await prisma.adicional.deleteMany({ where: { servicoId: servico.id } });
    await prisma.pipelineEtapaTemplate.deleteMany({ where: { servicoId: servico.id } });

    for (let p = 0; p < s.planos.length; p++) {
      const plano = s.planos[p];
      await prisma.plano.create({
        data: {
          servicoId: servico.id,
          nome: plano.nome,
          valorMin: plano.valor_min ?? null,
          valorMax: plano.valor_max ?? null,
          prazoDias: plano.prazo_dias ?? null,
          prazoTexto: plano.prazo_texto ?? null,
          entregas: plano.entregas ?? [],
          ordem: p,
        },
      });
    }

    for (let a = 0; a < s.adicionais.length; a++) {
      const adicional = s.adicionais[a];
      await prisma.adicional.create({
        data: {
          servicoId: servico.id,
          nome: adicional.nome,
          valor: adicional.valor ?? null,
          descricao: adicional.descricao ?? null,
        },
      });
    }

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

// devolve as credenciais do primeiro admin, ou null se já existe um ADMIN;
// falha logo no começo (antes de mexer no banco) se faltar a senha
async function credenciaisDoNovoAdmin() {
  if ((await prisma.user.count({ where: { role: "ADMIN" } })) > 0) return null;

  const email = process.env.ADMIN_EMAIL;
  const senha = process.env.ADMIN_PASSWORD;
  if (!email || !senha) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no ambiente para criar o primeiro usuário administrador.");
  }
  return { email, senha };
}

async function main() {
  const novoAdmin = await credenciaisDoNovoAdmin();

  // o catálogo é editável pela tela /catalogo — recriá-lo apagaria essas edições,
  // então só roda em banco vazio (ou com SEED_FORCE=1, de forma explícita)
  if ((await prisma.servico.count()) === 0 || process.env.SEED_FORCE === "1") {
    await seedCatalogo();
  } else {
    console.log("Seed: catálogo já existe — pulado (use SEED_FORCE=1 para recriar; APAGA edições do catálogo).");
  }

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
