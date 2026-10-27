-- AlterTable
ALTER TABLE "User" ADD COLUMN     "permissoes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "permissoesPersonalizadas" BOOLEAN NOT NULL DEFAULT false;

