import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { NovoProjetoForm } from "./NovoProjetoForm";
import { exigirModulo } from "@/lib/acesso";

export default async function NovoProjetoPage() {
  await exigirModulo("projetos");
  const [clientes, servicos] = await Promise.all([
    // só os campos que o formulário usa: o resto (notas internas, contatos, roteiro de vendas)
    // vai para o navegador e não pode chegar a quem não tem a área correspondente
    prisma.cliente.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.servico.findMany({
      where: { ativo: true, pilar: { ativo: true } },
      orderBy: { ordem: "asc" },
      select: {
        id: true,
        nome: true,
        pilar: { select: { nome: true } },
        planos: { where: { ativo: true }, orderBy: { ordem: "asc" }, select: { id: true, nome: true } },
      },
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
