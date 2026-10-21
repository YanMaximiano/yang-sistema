-- AlterTable
ALTER TABLE "Equipamento" ADD COLUMN     "valorCompra" DOUBLE PRECISION,
ADD COLUMN     "vidaUtilMeses" INTEGER;

-- AlterTable
ALTER TABLE "Profissional" ADD COLUMN     "salarioMensal" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "CustoFixo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "valorMensal" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "escopo" TEXT NOT NULL DEFAULT 'YANG',
    "doAporte" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustoFixo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustoFixoMes" (
    "custoFixoId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CustoFixoMes_pkey" PRIMARY KEY ("custoFixoId","mes")
);

-- CreateTable
CREATE TABLE "ConfigCalculadora" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "horasMensais" DOUBLE PRECISION NOT NULL DEFAULT 176,
    "pessoasFaturaveis" INTEGER NOT NULL DEFAULT 1,
    "ocupacaoPct" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "impostoPct" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "margemPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "comissaoPct" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "rateioYangPct" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "ticketCasamento" DOUBLE PRECISION NOT NULL DEFAULT 4500,
    "aporteTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aporteInicio" TEXT NOT NULL DEFAULT '2026-10',
    "aporteMeses" INTEGER NOT NULL DEFAULT 3,
    "encargosPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mesesRecuperacao" INTEGER NOT NULL DEFAULT 36,
    "precoCombustivel" DOUBLE PRECISION NOT NULL DEFAULT 6.2,
    "consumoKmL" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "desgasteKm" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "alimentacaoDia" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "diariaHospedagem" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigCalculadora_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustoFixoMes" ADD CONSTRAINT "CustoFixoMes_custoFixoId_fkey" FOREIGN KEY ("custoFixoId") REFERENCES "CustoFixo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

