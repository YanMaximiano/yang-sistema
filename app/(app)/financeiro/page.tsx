import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatMoeda, formatData } from "@/lib/utils";
import Link from "next/link";

export default async function FinanceiroPage() {
  const projetos = await prisma.projeto.findMany({
    include: {
      cliente: true,
      servico: { include: { pilar: true } },
      recebimentos: true,
      custos: true,
    },
  });

  const recebimentosPendentes = await prisma.recebimento.findMany({
    where: { status: { in: ["PENDENTE", "ATRASADO"] } },
    include: { projeto: { include: { cliente: true } } },
    orderBy: { vencimento: "asc" },
  });

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
      <PageHeader title="Financeiro" description="Margem por projeto, pilar e recebimentos" />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Receita recebida (total)</p>
          <p className="text-xl font-semibold">{formatMoeda(receitaTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Custos (total)</p>
          <p className="text-xl font-semibold">{formatMoeda(custoTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500">Margem</p>
          <p className={`text-xl font-semibold ${margemTotal < 0 ? "text-red-600" : "text-green-700"}`}>
            {formatMoeda(margemTotal)}
          </p>
        </Card>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Margem por pilar</h2>
        <div className="space-y-2">
          {Array.from(porPilar.entries()).map(([id, v]) => (
            <Card key={id} className="p-3 flex items-center justify-between">
              <span className="text-sm font-medium">{v.nome}</span>
              <span className="text-sm text-neutral-500">
                {formatMoeda(v.receita)} − {formatMoeda(v.custo)} ={" "}
                <span className={v.receita - v.custo < 0 ? "text-red-600" : "text-green-700"}>
                  {formatMoeda(v.receita - v.custo)}
                </span>
              </span>
            </Card>
          ))}
          {porPilar.size === 0 && <p className="text-sm text-neutral-500">Sem dados ainda.</p>}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Margem por serviço</h2>
        <div className="space-y-2">
          {Array.from(porServico.entries()).map(([id, v]) => (
            <Card key={id} className="p-3 flex items-center justify-between">
              <span className="text-sm font-medium">{v.nome}</span>
              <span className="text-sm text-neutral-500">
                {formatMoeda(v.receita)} − {formatMoeda(v.custo)} ={" "}
                <span className={v.receita - v.custo < 0 ? "text-red-600" : "text-green-700"}>
                  {formatMoeda(v.receita - v.custo)}
                </span>
              </span>
            </Card>
          ))}
          {porServico.size === 0 && <p className="text-sm text-neutral-500">Sem dados ainda.</p>}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Recebimentos pendentes / atrasados</h2>
        <div className="space-y-2">
          {recebimentosPendentes.map((r) => (
            <Link key={r.id} href={`/projetos/${r.projeto.id}`}>
              <Card className="p-3 flex items-center justify-between hover:border-neutral-400 transition-colors">
                <div>
                  <p className="text-sm font-medium">
                    {r.projeto.nome} — {r.projeto.cliente.nome}
                  </p>
                  <p className="text-xs text-neutral-500">vencimento {formatData(r.vencimento)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{formatMoeda(r.valor)}</span>
                  <Badge variant={r.status === "ATRASADO" ? "danger" : "neutral"}>{r.status}</Badge>
                </div>
              </Card>
            </Link>
          ))}
          {recebimentosPendentes.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhum recebimento pendente.</p>
          )}
        </div>
      </section>

      <section>
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
                <Card className="p-3 flex items-center justify-between hover:border-neutral-400 transition-colors">
                  <span className="text-sm font-medium">
                    {projeto.nome} — {projeto.cliente.nome}
                  </span>
                  <span className={`text-sm ${margem < 0 ? "text-red-600" : "text-green-700"}`}>
                    {formatMoeda(margem)}
                  </span>
                </Card>
              </Link>
            );
          })}
          {projetos.length === 0 && <p className="text-sm text-neutral-500">Nenhum projeto ainda.</p>}
        </div>
      </section>
    </div>
  );
}
