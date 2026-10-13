import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, LinkButton } from "@/components/ui";
import { formatData } from "@/lib/utils";
import Link from "next/link";
import { PROJETO_STATUS_VARIANT } from "@/lib/status";

export default async function ProjetosPage() {
  const projetos = await prisma.projeto.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      cliente: true,
      servico: true,
      etapas: { orderBy: { ordem: "asc" } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Projetos"
        description="Pipeline de produção"
        actions={<LinkButton href="/projetos/novo">Novo projeto avulso</LinkButton>}
      />

      <div className="space-y-2">
        {projetos.map((projeto) => {
          const etapaAtual =
            projeto.etapas.find((e) => e.status === "EM_ANDAMENTO") ??
            projeto.etapas.find((e) => e.status === "PENDENTE");
          const concluidas = projeto.etapas.filter((e) => e.status === "CONCLUIDA").length;

          return (
            <Link key={projeto.id} href={`/projetos/${projeto.id}`}>
              <Card className="p-4 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{projeto.nome}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {projeto.cliente.nome} · {projeto.servico.nome}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      {concluidas}/{projeto.etapas.length} etapas · prazo {formatData(projeto.prazoData)}
                    </span>
                    {etapaAtual && <Badge variant="info">{etapaAtual.nome}</Badge>}
                    <Badge variant={PROJETO_STATUS_VARIANT[projeto.statusGeral]}>{projeto.statusGeral}</Badge>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
        {projetos.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum projeto ainda. Projetos são criados a partir de uma proposta aprovada, ou avulsos.
          </p>
        )}
      </div>
    </div>
  );
}
