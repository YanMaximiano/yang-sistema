import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader, Card, Badge } from "@/components/ui";
import { AssistenteDaTela } from "@/components/AssistenteDaTela";
import { formatMoeda, formatData } from "@/lib/utils";
import Link from "next/link";
import { PROJETO_STATUS_VARIANT } from "@/lib/status";

export default async function PortalHomePage() {
  const session = await auth();
  const clienteId = session?.user.clienteId;
  if (!clienteId) redirect("/login");

  const [propostasPendentes, projetos] = await Promise.all([
    prisma.proposta.findMany({
      where: { clienteId, status: { in: ["ENVIADA", "NEGOCIACAO"] } },
      include: { servico: { select: { nome: true } }, plano: { select: { nome: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.projeto.findMany({
      where: { clienteId },
      include: { servico: { select: { nome: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Portal"
        title="Meus *projetos*"
        description="Acompanhe suas propostas e projetos com a Yang"
        actions={<AssistenteDaTela chave="portal" />}
      />

      {propostasPendentes.length > 0 && (
        <section id="portal-propostas" className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Propostas aguardando resposta</h2>
          <div className="space-y-2">
            {propostasPendentes.map((p) => (
              <Link key={p.id} href={`/portal/propostas/${p.id}`}>
                <Card className="p-4 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {p.servico.nome} — {p.plano.nome}
                    </span>
                    <Badge variant="warning">Aguardando resposta</Badge>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{formatMoeda(p.valorProposto)}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="portal-projetos">
        <h2 className="text-lg font-semibold mb-3">Projetos</h2>
        <div className="space-y-2">
          {projetos.map((proj) => (
            <Link key={proj.id} href={`/portal/projetos/${proj.id}`}>
              <Card className="p-4 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{proj.nome}</span>
                  <Badge variant={PROJETO_STATUS_VARIANT[proj.statusGeral]}>{proj.statusGeral}</Badge>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {proj.servico.nome} · prazo {formatData(proj.prazoData)}
                </p>
              </Card>
            </Link>
          ))}
          {projetos.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum projeto ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
}
