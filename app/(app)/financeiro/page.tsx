import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, MetricasEmLinha } from "@/components/ui";
import { AssistenteDaTela } from "@/components/AssistenteDaTela";
import { formatMoeda, formatData } from "@/lib/utils";
import { startOfMonth, addMonths, eachMonthOfInterval, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { exigirModulo } from "@/lib/acesso";

export default async function FinanceiroPage() {
  await exigirModulo("financeiro");
  const inicioProjecao = startOfMonth(new Date());
  const fimProjecao = addMonths(inicioProjecao, 5);

  const [projetos, recebimentosPendentes, recebimentosFuturos, custosFuturos, custosSemData] =
    await Promise.all([
      prisma.projeto.findMany({
        select: {
          id: true,
          nome: true,
          cliente: { select: { nome: true } },
          servico: { select: { id: true, nome: true, pilar: { select: { id: true, nome: true } } } },
          recebimentos: { select: { status: true, valor: true } },
          custos: { select: { valor: true } },
        },
      }),
      prisma.recebimento.findMany({
        where: { status: { in: ["PENDENTE", "ATRASADO"] } },
        include: { projeto: { select: { id: true, nome: true, cliente: { select: { nome: true } } } } },
        orderBy: { vencimento: "asc" },
      }),
      prisma.recebimento.findMany({
        where: {
          status: { not: "PAGO" },
          vencimento: { gte: inicioProjecao, lt: addMonths(fimProjecao, 1) },
          projeto: { statusGeral: { not: "CANCELADO" } },
        },
      }),
      prisma.custo.findMany({
        where: {
          dataPrevista: { gte: inicioProjecao, lt: addMonths(fimProjecao, 1) },
          projeto: { statusGeral: { not: "CANCELADO" } },
        },
      }),
      prisma.custo.aggregate({
        where: { dataPrevista: null, projeto: { statusGeral: { not: "CANCELADO" } } },
        _count: true,
        _sum: { valor: true },
      }),
    ]);

  const fluxoCaixa: { mes: Date; aReceber: number; aPagar: number; saldoMes: number; saldoAcumulado: number }[] = [];
  for (const mes of eachMonthOfInterval({ start: inicioProjecao, end: fimProjecao })) {
    const chave = format(mes, "yyyy-MM");
    const aReceber = recebimentosFuturos
      .filter((r) => format(r.vencimento, "yyyy-MM") === chave)
      .reduce((acc, r) => acc + r.valor, 0);
    const aPagar = custosFuturos
      .filter((c) => c.dataPrevista && format(c.dataPrevista, "yyyy-MM") === chave)
      .reduce((acc, c) => acc + c.valor, 0);
    const saldoMes = aReceber - aPagar;
    const saldoAcumulado = (fluxoCaixa.at(-1)?.saldoAcumulado ?? 0) + saldoMes;
    fluxoCaixa.push({ mes, aReceber, aPagar, saldoMes, saldoAcumulado });
  }

  const porPilar = new Map<string, { nome: string; receita: number; custo: number }>();
  const porServico = new Map<string, { nome: string; receita: number; custo: number }>();
  let receitaTotal = 0;
  let custoTotal = 0;

  for (const projeto of projetos) {
    const receita = projeto.recebimentos
      .filter((r) => r.status === "PAGO")
      .reduce((acc, r) => acc + r.valor, 0);
    const custo = projeto.custos.reduce((acc, c) => acc + c.valor, 0);

    receitaTotal += receita;
    custoTotal += custo;

    const pilar = projeto.servico.pilar;
    const atualPilar = porPilar.get(pilar.id) ?? { nome: pilar.nome, receita: 0, custo: 0 };
    atualPilar.receita += receita;
    atualPilar.custo += custo;
    porPilar.set(pilar.id, atualPilar);

    const servico = projeto.servico;
    const atualServico = porServico.get(servico.id) ?? { nome: servico.nome, receita: 0, custo: 0 };
    atualServico.receita += receita;
    atualServico.custo += custo;
    porServico.set(servico.id, atualServico);
  }

  const margemTotal = receitaTotal - custoTotal;

  return (
    <div>
      <PageHeader
        eyebrow="Financeiro"
        title="Margens e *recebimentos*"
        description="Margem por projeto, pilar e recebimentos"
        actions={<AssistenteDaTela chave="financeiro" />}
      />

      <MetricasEmLinha
        id="metricas"
        className="mb-14"
        itens={[
          { rotulo: "Receita recebida", valor: formatMoeda(receitaTotal), apoio: "total" },
          { rotulo: "Custos", valor: formatMoeda(custoTotal), apoio: "total" },
          { rotulo: "Margem", valor: formatMoeda(margemTotal), apoio: "recebido menos custos", destaque: margemTotal >= 0, negativo: margemTotal < 0 },
        ]}
      />

      <section id="financeiro-fluxo" className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Fluxo de caixa projetado</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
          Previsto a receber e a pagar nos próximos 6 meses — recebimentos ainda não pagos e
          custos com data prevista (não é o já efetivado, que já está nos cards acima).
        </p>
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4 font-medium">Mês</th>
                <th className="py-2 pr-4 font-medium">A receber</th>
                <th className="py-2 pr-4 font-medium">A pagar</th>
                <th className="py-2 pr-4 font-medium">Saldo do mês</th>
                <th className="py-2 font-medium">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {fluxoCaixa.map((linha) => (
                <tr key={linha.mes.toISOString()} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <td className="py-2 pr-4 capitalize">{format(linha.mes, "MMMM yyyy", { locale: ptBR })}</td>
                  <td className="py-2 pr-4">{formatMoeda(linha.aReceber)}</td>
                  <td className="py-2 pr-4">{formatMoeda(linha.aPagar)}</td>
                  <td className={`py-2 pr-4 ${linha.saldoMes < 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-100"}`}>
                    {formatMoeda(linha.saldoMes)}
                  </td>
                  <td className={linha.saldoAcumulado < 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-100"}>
                    {formatMoeda(linha.saldoAcumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        {custosSemData._count > 0 && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            {custosSemData._count} custo(s) sem data prevista ({formatMoeda(custosSemData._sum.valor ?? 0)}) não
            entram nessa projeção.
          </p>
        )}
      </section>

      <section id="financeiro-pilar" className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Margem por pilar</h2>
        <div className="space-y-2">
          {Array.from(porPilar.entries()).map(([id, v]) => (
            <Card key={id} className="p-3 flex items-center justify-between">
              <span className="text-sm font-medium">{v.nome}</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {formatMoeda(v.receita)} − {formatMoeda(v.custo)} ={" "}
                <span className={v.receita - v.custo < 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-100"}>
                  {formatMoeda(v.receita - v.custo)}
                </span>
              </span>
            </Card>
          ))}
          {porPilar.size === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">Sem dados ainda.</p>}
        </div>
      </section>

      <section id="financeiro-servico" className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Margem por serviço</h2>
        <div className="space-y-2">
          {Array.from(porServico.entries()).map(([id, v]) => (
            <Card key={id} className="p-3 flex items-center justify-between">
              <span className="text-sm font-medium">{v.nome}</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {formatMoeda(v.receita)} − {formatMoeda(v.custo)} ={" "}
                <span className={v.receita - v.custo < 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-100"}>
                  {formatMoeda(v.receita - v.custo)}
                </span>
              </span>
            </Card>
          ))}
          {porServico.size === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">Sem dados ainda.</p>}
        </div>
      </section>

      <section id="financeiro-recebimentos" className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Recebimentos pendentes / atrasados</h2>
        <div className="space-y-2">
          {recebimentosPendentes.map((r) => (
            <Link key={r.id} href={`/projetos/${r.projeto.id}`}>
              <Card className="p-3 flex items-center justify-between hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
                <div>
                  <p className="text-sm font-medium">
                    {r.projeto.nome} — {r.projeto.cliente.nome}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">vencimento {formatData(r.vencimento)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{formatMoeda(r.valor)}</span>
                  <Badge variant={r.status === "ATRASADO" ? "danger" : "neutral"}>{r.status}</Badge>
                </div>
              </Card>
            </Link>
          ))}
          {recebimentosPendentes.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum recebimento pendente.</p>
          )}
        </div>
      </section>

      <section id="financeiro-projeto">
        <h2 className="text-lg font-semibold mb-3">Margem por projeto</h2>
        <div className="space-y-2">
          {projetos.map((projeto) => {
            const receita = projeto.recebimentos
              .filter((r) => r.status === "PAGO")
              .reduce((acc, r) => acc + r.valor, 0);
            const custo = projeto.custos.reduce((acc, c) => acc + c.valor, 0);
            const margem = receita - custo;
            return (
              <Link key={projeto.id} href={`/projetos/${projeto.id}`}>
                <Card className="p-3 flex items-center justify-between hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
                  <span className="text-sm font-medium">
                    {projeto.nome} — {projeto.cliente.nome}
                  </span>
                  <span className={`text-sm ${margem < 0 ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-neutral-100"}`}>
                    {formatMoeda(margem)}
                  </span>
                </Card>
              </Link>
            );
          })}
          {projetos.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum projeto ainda.</p>}
        </div>
      </section>
    </div>
  );
}
