import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/acesso";
import { PageHeader, Badge, MetricasEmLinha, SectionTitle, type ItemDeMetrica } from "@/components/ui";
import { AssistenteDaTela } from "@/components/AssistenteDaTela";
import { formatMoeda } from "@/lib/utils";
import Link from "next/link";

export default async function PainelPage() {
  const acesso = await exigirModulo("painel");
  // cada bloco do painel só aparece (e só consulta o banco) para quem tem a área correspondente
  const verFunil = acesso.tem("propostas");
  const verProjetos = acesso.tem("projetos");
  const verFinanceiro = acesso.tem("financeiro");

  const [propostasPorStatus, projetosAtivos, totalProjetosAtivos, recebimentosPendentes, recebimentosAtrasados, custos, receitaPaga] =
    await Promise.all([
      verFunil ? prisma.proposta.groupBy({ by: ["status"], _count: true }) : [],
      verProjetos
        ? prisma.projeto.findMany({
            where: { statusGeral: "ATIVO" },
            include: { cliente: { select: { nome: true } }, servico: { select: { nome: true } } },
            orderBy: { createdAt: "desc" },
            take: 8,
          })
        : [],
      verProjetos ? prisma.projeto.count({ where: { statusGeral: "ATIVO" } }) : 0,
      verFinanceiro ? prisma.recebimento.aggregate({ where: { status: "PENDENTE" }, _sum: { valor: true } }) : null,
      verFinanceiro ? prisma.recebimento.aggregate({ where: { status: "ATRASADO" }, _sum: { valor: true } }) : null,
      verFinanceiro ? prisma.custo.aggregate({ _sum: { valor: true } }) : null,
      verFinanceiro ? prisma.recebimento.aggregate({ where: { status: "PAGO" }, _sum: { valor: true } }) : null,
    ]);

  const margem = (receitaPaga?._sum.valor ?? 0) - (custos?._sum.valor ?? 0);
  const statusMap = Object.fromEntries(propostasPorStatus.map((p) => [p.status, p._count]));

  const metricas: ItemDeMetrica[] = [];
  if (verFunil) {
    metricas.push({ rotulo: "Propostas enviadas", valor: statusMap.ENVIADA ?? 0, apoio: "aguardando resposta" });
    metricas.push({ rotulo: "Em negociação", valor: statusMap.NEGOCIACAO ?? 0, apoio: "propostas abertas" });
  }
  if (verProjetos) metricas.push({ rotulo: "Projetos ativos", valor: totalProjetosAtivos, apoio: "em produção" });
  if (verFinanceiro) {
    metricas.push({
      rotulo: "Margem",
      valor: formatMoeda(margem),
      apoio: "recebido menos custos",
      destaque: margem >= 0,
      negativo: margem < 0,
    });
  }

  return (
    <div>
      <PageHeader eyebrow="Painel" title="Visão geral da *produtora*" actions={<AssistenteDaTela chave="painel" />} />

      {metricas.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Use o menu ao lado para abrir as áreas liberadas para você.
        </p>
      )}

      {metricas.length > 0 && <MetricasEmLinha id="metricas" itens={metricas} className="mb-14" />}

      <div className="grid gap-x-12 gap-y-12 md:grid-cols-2">
        {verFinanceiro && (
          <section id="painel-financeiro">
            <SectionTitle aside={<Link href="/financeiro" className="underline-offset-2 hover:underline">Ver tudo →</Link>}>
              Financeiro
            </SectionTitle>
            <dl className="divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
              <div className="flex justify-between py-3">
                <dt className="text-neutral-500 dark:text-neutral-400">Recebimentos pendentes</dt>
                <dd className="font-semibold tabular-nums">{formatMoeda(recebimentosPendentes?._sum.valor)}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-neutral-500 dark:text-neutral-400">Recebimentos atrasados</dt>
                <dd className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {formatMoeda(recebimentosAtrasados?._sum.valor)}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {verProjetos && (
          <section id="painel-projetos">
            <SectionTitle aside={<Link href="/projetos" className="underline-offset-2 hover:underline">Ver todos →</Link>}>
              Projetos ativos recentes
            </SectionTitle>
            {projetosAtivos.length === 0 && (
              <p className="py-3 text-sm text-neutral-500 dark:text-neutral-400">Nenhum projeto ativo ainda.</p>
            )}
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {projetosAtivos.map((p) => (
                <Link
                  key={p.id}
                  href={`/projetos/${p.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-sm transition-colors hover:text-neutral-500 dark:hover:text-neutral-400"
                >
                  <span className="min-w-0 font-semibold">
                    {p.nome} <span className="font-normal text-neutral-500 dark:text-neutral-400">— {p.cliente.nome}</span>
                  </span>
                  <Badge>{p.servico.nome}</Badge>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
