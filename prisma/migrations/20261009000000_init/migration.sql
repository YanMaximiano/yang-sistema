-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

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

-- CreateEnum
CREATE TYPE "StatusEquipamento" AS ENUM ('DISPONIVEL', 'MANUTENCAO');

-- CreateEnum
CREATE TYPE "TipoProfissional" AS ENUM ('FIXO', 'FREELANCER');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CONTRATO', 'TERMO_USO_IMAGEM', 'BRIEFING', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusDocumento" AS ENUM ('RASCUNHO', 'AGUARDANDO_ASSINATURA', 'ASSINADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EQUIPE',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
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
CREATE TABLE "ChecklistPreProducaoTemplate" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistPreProducaoTemplate_pkey" PRIMARY KEY ("id")
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
    "planoId" TEXT,
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
CREATE TABLE "ChecklistPreProducaoItem" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "concluido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChecklistPreProducaoItem_pkey" PRIMARY KEY ("id")
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
    "dataPrevista" TIMESTAMP(3),

    CONSTRAINT "Custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "status" "StatusEquipamento" NOT NULL DEFAULT 'DISPONIVEL',
    "observacoes" TEXT,
    "foto" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipamentoFoto" (
    "equipamentoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,

    CONSTRAINT "EquipamentoFoto_pkey" PRIMARY KEY ("equipamentoId")
);

-- CreateTable
CREATE TABLE "AlocacaoEquipamento" (
    "id" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "checklistSaida" BOOLEAN NOT NULL DEFAULT false,
    "checklistRetorno" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AlocacaoEquipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateEquipamento" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,

    CONSTRAINT "TemplateEquipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profissional" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "tipo" "TipoProfissional" NOT NULL DEFAULT 'FREELANCER',
    "diariaPadrao" DOUBLE PRECISION,
    "contato" TEXT,
    "email" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Profissional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escala" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "cache" DOUBLE PRECISION,
    "custoId" TEXT,

    CONSTRAINT "Escala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateEquipe" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TemplateEquipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeloDocumento" (
    "id" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "nome" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ModeloDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "modeloDocumentoId" TEXT,
    "tipo" "TipoDocumento" NOT NULL,
    "nome" TEXT NOT NULL,
    "conteudo" TEXT,
    "link" TEXT,
    "status" "StatusDocumento" NOT NULL DEFAULT 'RASCUNHO',
    "assinanteNome" TEXT,
    "assinanteIp" TEXT,
    "assinadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Proposta_status_updatedAt_idx" ON "Proposta"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Proposta_clienteId_idx" ON "Proposta"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Projeto_propostaId_key" ON "Projeto"("propostaId");

-- CreateIndex
CREATE INDEX "Projeto_statusGeral_prazoData_idx" ON "Projeto"("statusGeral", "prazoData");

-- CreateIndex
CREATE INDEX "Projeto_clienteId_idx" ON "Projeto"("clienteId");

-- CreateIndex
CREATE INDEX "Projeto_servicoId_idx" ON "Projeto"("servicoId");

-- CreateIndex
CREATE INDEX "ChecklistPreProducaoItem_projetoId_idx" ON "ChecklistPreProducaoItem"("projetoId");

-- CreateIndex
CREATE INDEX "Entrega_projetoId_idx" ON "Entrega"("projetoId");

-- CreateIndex
CREATE INDEX "Recebimento_status_vencimento_idx" ON "Recebimento"("status", "vencimento");

-- CreateIndex
CREATE INDEX "Recebimento_projetoId_idx" ON "Recebimento"("projetoId");

-- CreateIndex
CREATE INDEX "Custo_dataPrevista_idx" ON "Custo"("dataPrevista");

-- CreateIndex
CREATE INDEX "Custo_projetoId_idx" ON "Custo"("projetoId");

-- CreateIndex
CREATE INDEX "AlocacaoEquipamento_equipamentoId_idx" ON "AlocacaoEquipamento"("equipamentoId");

-- CreateIndex
CREATE INDEX "AlocacaoEquipamento_projetoId_idx" ON "AlocacaoEquipamento"("projetoId");

-- CreateIndex
CREATE UNIQUE INDEX "Escala_custoId_key" ON "Escala"("custoId");

-- CreateIndex
CREATE INDEX "Escala_profissionalId_idx" ON "Escala"("profissionalId");

-- CreateIndex
CREATE INDEX "Escala_projetoId_idx" ON "Escala"("projetoId");

-- CreateIndex
CREATE INDEX "Documento_projetoId_idx" ON "Documento"("projetoId");

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
ALTER TABLE "ChecklistPreProducaoTemplate" ADD CONSTRAINT "ChecklistPreProducaoTemplate_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Projeto" ADD CONSTRAINT "Projeto_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjetoEtapa" ADD CONSTRAINT "ProjetoEtapa_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistPreProducaoItem" ADD CONSTRAINT "ChecklistPreProducaoItem_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recebimento" ADD CONSTRAINT "Recebimento_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Custo" ADD CONSTRAINT "Custo_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipamentoFoto" ADD CONSTRAINT "EquipamentoFoto_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlocacaoEquipamento" ADD CONSTRAINT "AlocacaoEquipamento_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlocacaoEquipamento" ADD CONSTRAINT "AlocacaoEquipamento_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateEquipamento" ADD CONSTRAINT "TemplateEquipamento_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateEquipamento" ADD CONSTRAINT "TemplateEquipamento_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_custoId_fkey" FOREIGN KEY ("custoId") REFERENCES "Custo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateEquipe" ADD CONSTRAINT "TemplateEquipe_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "Plano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeloDocumento" ADD CONSTRAINT "ModeloDocumento_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "Projeto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_modeloDocumentoId_fkey" FOREIGN KEY ("modeloDocumentoId") REFERENCES "ModeloDocumento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

