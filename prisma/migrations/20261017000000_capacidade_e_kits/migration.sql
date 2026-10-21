-- AlterTable
ALTER TABLE "ConfigCalculadora" ADD COLUMN     "diasUsoMes" DOUBLE PRECISION NOT NULL DEFAULT 8,
ALTER COLUMN "ocupacaoPct" SET DEFAULT 75;

-- CreateTable
CREATE TABLE "PessoaHoras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "funcao" TEXT,
    "horasMes" DOUBLE PRECISION NOT NULL DEFAULT 176,
    "ocupacaoPct" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "escopo" TEXT NOT NULL DEFAULT 'COMPARTILHADO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PessoaHoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitEquipamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KitEquipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitEquipamentoItem" (
    "kitId" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,

    CONSTRAINT "KitEquipamentoItem_pkey" PRIMARY KEY ("kitId","equipamentoId")
);

-- AddForeignKey
ALTER TABLE "KitEquipamentoItem" ADD CONSTRAINT "KitEquipamentoItem_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "KitEquipamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitEquipamentoItem" ADD CONSTRAINT "KitEquipamentoItem_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

