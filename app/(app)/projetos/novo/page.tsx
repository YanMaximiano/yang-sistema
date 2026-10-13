import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { NovoProjetoForm } from "./NovoProjetoForm";

export default async function NovoProjetoPage() {
  const [clientes, servicos] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nome: "asc" } }),
    prisma.servico.findMany({
      where: { ativo: true, pilar: { ativo: true } },
      orderBy: { ordem: "asc" },
      include: { pilar: true, planos: { where: { ativo: true }, orderBy: { ordem: "asc" } } },
    }),
  ]);

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Novo projeto avulso"
        description="Para casos fora do fluxo padrão de proposta (o pipeline de etapas é copiado do serviço escolhido)"
      />
      <NovoProjetoForm clientes={clientes} servicos={servicos} />
    </div>
  );
}
