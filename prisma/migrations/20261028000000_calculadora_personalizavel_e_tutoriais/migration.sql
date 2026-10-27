-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tutoriaisVistos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ConfigCalculadora" ADD COLUMN     "categoriasCusto" TEXT[] DEFAULT ARRAY['Salários', 'Pró-labore', 'Aluguel', 'Energia', 'Água', 'Internet e telefone', 'Software e assinaturas', 'Tráfego pago', 'Terceirizados recorrentes', 'Contabilidade', 'Identidade visual', 'Reserva de caixa', 'Marketing', 'Veículo (seguro, IPVA)', 'Outros']::TEXT[],
ADD COLUMN     "faixasMargemLimites" DOUBLE PRECISION[] DEFAULT ARRAY[10, 20, 30]::DOUBLE PRECISION[],
ADD COLUMN     "faixasMargemNomes" TEXT[] DEFAULT ARRAY['Apertado', 'Baixo', 'Saudável', 'Ótimo']::TEXT[],
ADD COLUMN     "margensComparacao" DOUBLE PRECISION[] DEFAULT ARRAY[10, 20, 30, 40, 50]::DOUBLE PRECISION[],
ADD COLUMN     "mesesNaProjecao" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "rateiosComparacao" DOUBLE PRECISION[] DEFAULT ARRAY[50, 75, 100]::DOUBLE PRECISION[],
ADD COLUMN     "rotulosEscopo" TEXT[] DEFAULT ARRAY['YANG (produtora)', 'Compartilhado (YANG + perfil Yan)', 'Só perfil / infoprodutos']::TEXT[],
ADD COLUMN     "taxasDepreciacaoComparacao" DOUBLE PRECISION[] DEFAULT ARRAY[1, 1.6, 2, 2.8]::DOUBLE PRECISION[];

