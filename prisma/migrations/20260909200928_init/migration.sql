-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EQUIPE', 'FREELANCER', 'CLIENTE');

-- CreateEnum
CREATE TYPE "TipoCobranca" AS ENUM ('PROJETO_UNICO', 'RECORRENCIA_MENSAL', 'LOCACAO_HORA');

-- CreateEnum
CREATE TYPE "StatusRelacionamento" AS ENUM ('LEAD', 'ORCAMENTO_ENVIADO', 'CLIENTE_ATIVO', 'CLIENTE_RECORRENTE');

-- CreateEnum
CREATE TYPE "StatusProposta" AS ENUM ('ENVIADA', 'NEGOCIACAO', 'APROVADA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "StatusGeralProjeto" AS ENUM ('ATIVO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusEtapa" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "StatusEntrega" AS ENUM ('EM_REVISAO', 'APROVADA', 'REPROVADA');

-- CreateEnum
CREATE TYPE "StatusRecebimento" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EQUIPE',
    "clienteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pilar" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Pilar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "pilarId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoCobranca" "TipoCobranca" NOT NULL,
    "descricao" TEXT,
    "argumentacaoVenda" TEXT,
    "objecoesComuns" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plano" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valorMin" DOUBLE PRECISION,
    "valorMax" DOUBLE PRECISION,
    "prazoDias" INTEGER,
    "prazoTexto" TEXT,
    "entregas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adicional" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Adicional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineEtapaTemplate" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PipelineEtapaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresa" TEXT,
    "contato" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "origem" TEXT,
    "statusRelacionamento" "StatusRelacionamento" NOT NULL DEFAULT 'LEAD',
    "notasInternas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposta" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "valorProposto" DOUBLE PRECISION NOT NULL,
    "prazoPropostoDias" INTEGER,
    "status" "StatusProposta" NOT NULL DEFAULT 'ENVIADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropostaAdicional" (
    "propostaId" TEXT NOT NULL,
    "adicionalId" TEXT NOT NULL,

    CONSTRAINT "PropostaAdicional_pkey" PRIMARY KEY ("propostaId","adicionalId")
);

-- CreateTable
CREATE TABLE "Projeto" (
    "id" TEXT NOT NULL,
    "propostaId" TEXT,
    "clienteId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoCobranca" "TipoCobranca" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "prazoData" TIMESTAMP(3),
    "avulso" BOOLEAN NOT NULL DEFAULT false,
    "statusGeral" "StatusGeralProjeto" NOT NULL DEFAULT 'ATIVO',
    "cicloAtual" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Projeto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjetoEtapa" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusEtapa" NOT NULL DEFAULT 'PENDENTE',
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),

    CONSTRAINT "ProjetoEtapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrega" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "link" TEXT,
    "status" "StatusEntrega" NOT NULL DEFAULT 'EM_REVISAO',
    "comentarioCliente" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recebimento" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusRecebimento" NOT NULL DEFAULT 'PENDENTE',
    "formaPagamento" TEXT,
    "dataPagamento" TIMESTAMP(3),

    CONSTRAINT "Recebimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Custo" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Custo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Projeto_propostaId_key" ON "Projeto"("propostaId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_pilarId_fkey" FOREIGN KEY ("pilarId") REFERENCES "Pilar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plano" ADD CONSTRAINT "Plano_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adicional" ADD CONSTRAINT "Adicional_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineEtapaTemplate" ADD CONSTRAINT "PipelineEtapaTemplate_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposta" ADD CONSTRAINT "Proposta_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropostaAdicional" ADD CONSTRAINT "PropostaAdicional_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "Proposta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropostaAdicional" ADD CONSTRAINT "PropostaAdicional_adicionalId_fkey" FOREIGN KEY ("adicionalId") REFERENCES "Adicional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "Proposta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjetoEtapa" ADD CONSTRAINT "ProjetoEtapa_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recebimento" ADD CONSTRAINT "Recebimento_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Custo" ADD CONSTRAINT "Custo_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
