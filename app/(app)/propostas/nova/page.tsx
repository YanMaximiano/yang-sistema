import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { NovaPropostaForm } from "./NovaPropostaForm";

export default async function NovaPropostaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const { clienteId } = await searchParams;

  const [clientes, servicos] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nome: "asc" } }),
    prisma.servico.findMany({
      where: { ativo: true, pilar: { ativo: true } },
      orderBy: { ordem: "asc" },
      include: {
        pilar: true,
        planos: { where: { ativo: true }, orderBy: { ordem: "asc" } },
        adicionais: { where: { ativo: true }, orderBy: { nome: "asc" } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Nova proposta" description="Cliente → serviço → plano → adicionais" />
      <NovaPropostaForm clientes={clientes} servicos={servicos} clienteIdInicial={clienteId} />
    </div>
  );
}
