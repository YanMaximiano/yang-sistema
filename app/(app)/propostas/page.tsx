import { prisma } from "@/lib/prisma";
import { PageHeader, Card, LinkButton } from "@/components/ui";
import { formatMoeda } from "@/lib/utils";
import Link from "next/link";
import { exigirModulo } from "@/lib/acesso";

const COLUNAS: { status: "ENVIADA" | "NEGOCIACAO" | "APROVADA" | "RECUSADA"; label: string }[] = [
  { status: "ENVIADA", label: "Enviada" },
  { status: "NEGOCIACAO", label: "Em negociação" },
  { status: "APROVADA", label: "Aprovada" },
  { status: "RECUSADA", label: "Recusada" },
];

export default async function PropostasPage() {
  await exigirModulo("propostas");
  const propostas = await prisma.proposta.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      cliente: { select: { nome: true } },
      servico: { select: { nome: true } },
      plano: { select: { nome: true } },
    },
  });

  const porStatus = Object.fromEntries(
    COLUNAS.map((c) => [c.status, propostas.filter((p) => p.status === c.status)])
  );

  const totalAprovadas = porStatus.APROVADA?.length ?? 0;
  const taxaConversao =
    propostas.length > 0 ? Math.round((totalAprovadas / propostas.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Comercial" title="Funil de *propostas*"
        description={`Funil comercial · taxa de conversão geral: ${taxaConversao}%`}
        actions={<LinkButton href="/propostas/nova">Nova proposta</LinkButton>}
      />

      <div className="grid md:grid-cols-4 gap-4">
        {COLUNAS.map((coluna) => (
          <div key={coluna.status}>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">
              {coluna.label} ({porStatus[coluna.status]?.length ?? 0})
            </p>
            <div className="space-y-2">
              {(porStatus[coluna.status] ?? []).map((p) => (
                <Link key={p.id} href={`/propostas/${p.id}`}>
                  <Card className="p-3 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
                    <p className="text-sm font-medium">{p.cliente.nome}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {p.servico.nome} — {p.plano.nome}
                    </p>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1">{formatMoeda(p.valorProposto)}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
