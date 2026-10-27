import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { AssistenteDaTela } from "@/components/AssistenteDaTela";
import { NovaPropostaForm } from "./NovaPropostaForm";
import { exigirModulo } from "@/lib/acesso";

export default async function NovaPropostaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  await exigirModulo("propostas");
  const { clienteId } = await searchParams;

  const [clientes, servicos] = await Promise.all([
    // só os campos que o formulário usa (ver comentário em projetos/novo/page.tsx)
    prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.servico.findMany({
      where: { ativo: true, pilar: { ativo: true } },
      orderBy: { ordem: "asc" },
      select: {
        id: true,
        nome: true,
        pilar: { select: { nome: true } },
        planos: {
          where: { ativo: true },
          orderBy: { ordem: "asc" },
          select: { id: true, nome: true, valorMin: true, valorMax: true, prazoDias: true, entregas: true },
        },
        adicionais: {
          where: { ativo: true },
          orderBy: { nome: "asc" },
          select: { id: true, nome: true, valor: true },
        },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Comercial"
        title="Nova *proposta*"
        description="Cliente → serviço → plano → adicionais"
        actions={<AssistenteDaTela chave="proposta-nova" />}
      />
      <div id="form-proposta">
        <NovaPropostaForm clientes={clientes} servicos={servicos} clienteIdInicial={clienteId} />
      </div>
    </div>
  );
}
