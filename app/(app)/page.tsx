import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Badge } from "@/components/ui";
import { formatMoeda } from "@/lib/utils";
import Link from "next/link";

export default async function PainelPage() {
  const session = await auth();
  const role = session?.user.role;

  if (role === "CLIENTE") {
    return (
      <div>
        <PageHeader title="Bem-vindo(a)" />
        <p className="text-neutral-600">
          O portal do cliente ainda está em desenvolvimento. Fale com a equipe Yang para
          acompanhar seu projeto.
        </p>
      </div>
    );
  }

  const [propostasPorStatus, projetosAtivos, recebimentosPendentes, recebimentosAtrasados, custos] =
    await Promise.all([
      prisma.proposta.groupBy({ by: ["status"], _count: true }),
      prisma.projeto.findMany({
        where: { statusGeral: "ATIVO" },
        include: { cliente: true, servico: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.recebimento.aggregate({ where: { status: "PENDENTE" }, _sum: { valor: true } }),
      prisma.recebimento.aggregate({ where: { status: "ATRASADO" }, _sum: { valor: true } }),
      prisma.custo.aggregate({ _sum: { valor: true } }),
    ]);

  const receitaPaga = await prisma.recebimento.aggregate({
    where: { status: "PAGO" },
    _sum: { valor: true },
  });

  const margem = (receitaPaga._sum.valor ?? 0) - (custos._sum.valor ?? 0);

  const statusMap = Object.fromEntries(
    propostasPorStatus.map((p) => [p.status, p._count])
  );

  return (
    <div>
      <PageHeader title="Painel" description="Visão geral da produtora" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Propostas enviadas</p>
          <p className="text-2xl font-semibold">{statusMap.ENVIADA ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Em negociação</p>
          <p className="text-2xl font-semibold">{statusMap.NEGOCIACAO ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Projetos ativos</p>
          <p className="text-2xl font-semibold">{projetosAtivos.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Margem (recebido − custos)</p>
          <p className={`text-2xl font-semibold ${margem < 0 ? "text-red-600" : "text-green-700"}`}>
            {formatMoeda(margem)}
          </p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-medium mb-3">Financeiro</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Recebimentos pendentes</span>
              <span>{formatMoeda(recebimentosPendentes._sum.valor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Recebimentos atrasados</span>
              <span className="text-red-600">{formatMoeda(recebimentosAtrasados._sum.valor)}</span>
            </div>
            <Link href="/financeiro" className="text-sm underline text-neutral-700">
              Ver financeiro completo →
            </Link>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-medium mb-3">Projetos ativos recentes</h2>
          <div className="space-y-2">
            {projetosAtivos.length === 0 && (
              <p className="text-sm text-neutral-500">Nenhum projeto ativo ainda.</p>
            )}
            {projetosAtivos.map((p) => (
              <Link
                key={p.id}
                href={`/projetos/${p.id}`}
                className="flex items-center justify-between text-sm rounded-md px-2 py-1.5 hover:bg-neutral-50"
              >
                <span>
                  {p.nome} <span className="text-neutral-400">— {p.cliente.nome}</span>
                </span>
                <Badge>{p.servico.nome}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
