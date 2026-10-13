import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, Card, Badge, Button, Input, Label } from "@/components/ui";
import { formatMoeda, formatData } from "@/lib/utils";
import {
  avancarEtapa,
  voltarEtapa,
  iniciarEtapa,
  criarEntrega,
  atualizarStatusEntrega,
  criarRecebimento,
  atualizarRecebimento,
  criarCusto,
  deletarCusto,
} from "../actions";
import { StatusGeralSelect } from "./StatusGeralSelect";

const ETAPA_VARIANT: Record<string, "neutral" | "success" | "info"> = {
  PENDENTE: "neutral",
  EM_ANDAMENTO: "info",
  CONCLUIDA: "success",
};

const RECEBIMENTO_VARIANT: Record<string, "neutral" | "success" | "danger"> = {
  PENDENTE: "neutral",
  PAGO: "success",
  ATRASADO: "danger",
};

const ENTREGA_VARIANT: Record<string, "neutral" | "success" | "danger"> = {
  EM_REVISAO: "neutral",
  APROVADA: "success",
  REPROVADA: "danger",
};

export default async function ProjetoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const projeto = await prisma.projeto.findUnique({
    where: { id },
    include: {
      cliente: true,
      servico: true,
      etapas: { orderBy: { ordem: "asc" } },
      entregas: { orderBy: { versao: "desc" } },
      recebimentos: { orderBy: { vencimento: "asc" } },
      custos: true,
    },
  });

  if (!projeto) notFound();

  const totalRecebido = projeto.recebimentos
    .filter((r) => r.status === "PAGO")
    .reduce((acc, r) => acc + r.valor, 0);
  const totalPrevisto = projeto.recebimentos.reduce((acc, r) => acc + r.valor, 0);
  const totalCustos = projeto.custos.reduce((acc, c) => acc + c.valor, 0);
  const margem = totalRecebido - totalCustos;

  return (
    <div className="pb-16 max-w-3xl">
      <PageHeader
        title={projeto.nome}
        description={`${projeto.cliente.nome} · ${projeto.servico.nome} · ${formatMoeda(projeto.valor)} · prazo ${formatData(projeto.prazoData)}`}
        actions={<StatusGeralSelect projetoId={projeto.id} statusAtual={projeto.statusGeral} />}
      />

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Pipeline</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {projeto.etapas.map((etapa) => (
            <Card key={etapa.id} className="p-3 min-w-[180px] shrink-0">
              <Badge variant={ETAPA_VARIANT[etapa.status]} className="mb-2">
                {etapa.status}
              </Badge>
              <p className="text-sm font-medium mb-2">{etapa.nome}</p>
              <p className="text-xs text-neutral-400 mb-2">
                {etapa.dataInicio && `início ${formatData(etapa.dataInicio)}`}
                {etapa.dataFim && ` · fim ${formatData(etapa.dataFim)}`}
              </p>
              <div className="flex gap-1">
                {etapa.status === "PENDENTE" && (
                  <form action={iniciarEtapa}>
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <input type="hidden" name="etapaId" value={etapa.id} />
                    <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                      Iniciar
                    </Button>
                  </form>
                )}
                {etapa.status === "EM_ANDAMENTO" && (
                  <>
                    <form action={voltarEtapa}>
                      <input type="hidden" name="projetoId" value={projeto.id} />
                      <input type="hidden" name="etapaId" value={etapa.id} />
                      <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                        ← Voltar
                      </Button>
                    </form>
                    <form action={avancarEtapa}>
                      <input type="hidden" name="projetoId" value={projeto.id} />
                      <input type="hidden" name="etapaId" value={etapa.id} />
                      <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                        Concluir →
                      </Button>
                    </form>
                  </>
                )}
                {etapa.status === "CONCLUIDA" && (
                  <form action={voltarEtapa}>
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <input type="hidden" name="etapaId" value={etapa.id} />
                    <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                      ← Reabrir
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Entregas / versões</h2>
        <div className="space-y-2 mb-3">
          {projeto.entregas.map((entrega) => (
            <Card key={entrega.id} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Versão {entrega.versao}</span>
                <Badge variant={ENTREGA_VARIANT[entrega.status]}>{entrega.status}</Badge>
              </div>
              {entrega.link && (
                <a
                  href={entrega.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 underline break-all"
                >
                  {entrega.link}
                </a>
              )}
              {entrega.comentarioCliente && (
                <p className="text-xs text-neutral-500 mt-1">&quot;{entrega.comentarioCliente}&quot;</p>
              )}
              {entrega.status === "EM_REVISAO" && (
                <div className="flex gap-2 mt-2">
                  <form action={atualizarStatusEntrega}>
                    <input type="hidden" name="id" value={entrega.id} />
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <input type="hidden" name="status" value="APROVADA" />
                    <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                      Marcar aprovada
                    </Button>
                  </form>
                  <form action={atualizarStatusEntrega}>
                    <input type="hidden" name="id" value={entrega.id} />
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <input type="hidden" name="status" value="REPROVADA" />
                    <Button type="submit" variant="ghost" className="text-xs px-2 py-1 text-red-600">
                      Marcar reprovada
                    </Button>
                  </form>
                </div>
              )}
            </Card>
          ))}
        </div>
        <form action={criarEntrega} className="flex items-end gap-2">
          <input type="hidden" name="projetoId" value={projeto.id} />
          <div className="flex-1">
            <Label>Link da nova versão (Drive/WeTransfer/Frame.io)</Label>
            <Input name="link" placeholder="https://..." />
          </div>
          <Button type="submit" variant="secondary">
            Registrar nova versão
          </Button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Financeiro do projeto</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-3">
            <p className="text-xs text-neutral-500">Recebido</p>
            <p className="font-semibold">{formatMoeda(totalRecebido)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-neutral-500">Custos</p>
            <p className="font-semibold">{formatMoeda(totalCustos)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-neutral-500">Margem</p>
            <p className={`font-semibold ${margem < 0 ? "text-red-600" : "text-green-700"}`}>
              {formatMoeda(margem)}
            </p>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold mb-2">
              Recebimentos ({formatMoeda(totalPrevisto)} previsto)
            </h3>
            <div className="space-y-2 mb-3">
              {projeto.recebimentos.map((r) => (
                <Card key={r.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{formatMoeda(r.valor)}</span>
                    <Badge variant={RECEBIMENTO_VARIANT[r.status]}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-neutral-500">
                    vencimento {formatData(r.vencimento)} {r.formaPagamento && `· ${r.formaPagamento}`}
                  </p>
                  {r.status !== "PAGO" && (
                    <form action={atualizarRecebimento} className="mt-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="projetoId" value={projeto.id} />
                      <input type="hidden" name="status" value="PAGO" />
                      <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                        Marcar pago
                      </Button>
                    </form>
                  )}
                </Card>
              ))}
            </div>
            <form action={criarRecebimento} className="space-y-2">
              <input type="hidden" name="projetoId" value={projeto.id} />
              <div className="grid grid-cols-2 gap-2">
                <Input name="valor" type="number" step="1" placeholder="Valor" required />
                <Input name="vencimento" type="date" required />
              </div>
              <Input name="formaPagamento" placeholder="Forma de pagamento (opcional)" />
              <Button type="submit" variant="secondary" className="w-full">
                Adicionar parcela
              </Button>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Custos</h3>
            <div className="space-y-2 mb-3">
              {projeto.custos.map((c) => (
                <Card key={c.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {c.tipo} — {formatMoeda(c.valor)}
                    </span>
                  </div>
                  {c.descricao && <p className="text-xs text-neutral-500">{c.descricao}</p>}
                  <form action={deletarCusto} className="mt-1">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <Button type="submit" variant="ghost" className="text-xs px-2 py-1 text-red-600">
                      Remover
                    </Button>
                  </form>
                </Card>
              ))}
            </div>
            <form action={criarCusto} className="space-y-2">
              <input type="hidden" name="projetoId" value={projeto.id} />
              <Input name="tipo" placeholder="Tipo (cachê, equipamento, transporte...)" required />
              <Input name="valor" type="number" step="1" placeholder="Valor" required />
              <Input name="descricao" placeholder="Descrição (opcional)" />
              <Button type="submit" variant="secondary" className="w-full">
                Adicionar custo
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
