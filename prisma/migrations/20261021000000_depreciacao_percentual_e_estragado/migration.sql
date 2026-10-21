-- AlterEnum
ALTER TYPE "StatusEquipamento" ADD VALUE 'ESTRAGADO';

-- AlterTable
ALTER TABLE "ConfigCalculadora" DROP COLUMN "mesesRecuperacao",
ADD COLUMN     "depreciacaoPct" DOUBLE PRECISION NOT NULL DEFAULT 1.6;

