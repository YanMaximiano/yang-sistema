import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { PageHeader, Card, Badge, Button, Textarea, Label } from "@/components/ui";
import { formatMoeda, formatData } from "@/lib/utils";
import { avaliarEntrega } from "../../actions";

const ETAPA_VARIANT: Record<string, "neutral" | "success" | "info"> = {
  PENDENTE: "neutral",
  EM_ANDAMENTO: "info",
  CONCLUIDA: "success",
};

const ENTREGA_VARIANT: Record<string, "neutral" | "success" | "danger"> = {
  EM_REVISAO: "neutral",
  APROVADA: "success",
  REPROVADA: "danger",
};

const RECEBIMENTO_VARIANT: Record<string, "neutral" | "success" | "danger"> = {
  PENDENTE: "neutral",
  PAGO: "success",
  ATRASADO: "danger",
};

export default async function PortalProjetoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const clienteId = session?.user.clienteId;
  if (!clienteId) redirect("/login");

  const projeto = await prisma.projeto.findUnique({
    where: { id },
    include: {
      servico: true,
      etapas: { orderBy: { ordem: "asc" } },
      entregas: { orderBy: { versao: "desc" } },
      recebimentos: { orderBy: { vencimento: "asc" } },
    },
  });

  if (!projeto || projeto.clienteId !== clienteId) notFound();

  return (
    <div className="pb-16 max-w-2xl">
      <PageHeader
        title={projeto.nome}
        description={`${projeto.servico.nome} · prazo ${formatData(projeto.prazoData)}`}
      />

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Andamento</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {projeto.etapas.map((etapa) => (
            <Card key={etapa.id} className="p-3 min-w-[160px] shrink-0">
              <Badge variant={ETAPA_VARIANT[etapa.status]} className="mb-2">
                {etapa.status === "CONCLUIDA"
                  ? "Concluída"
                  : etapa.status === "EM_ANDAMENTO"
                    ? "Em andamento"
                    : "Pendente"}
              </Badge>
              <p className="text-sm font-medium">{etapa.nome}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Entregas para aprovação</h2>
        <div className="space-y-3">
          {projeto.entregas.map((entrega) => (
            <Card key={entrega.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Versão {entrega.versao}</span>
                <Badge variant={ENTREGA_VARIANT[entrega.status]}>
                  {entrega.status === "EM_REVISAO"
                    ? "Aguardando sua avaliação"
                    : entrega.status === "APROVADA"
                      ? "Aprovada"
                      : "Reprovada"}
                </Badge>
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
                <p className="text-xs text-neutral-500 mt-1">
                  Seu comentário: &quot;{entrega.comentarioCliente}&quot;
                </p>
              )}
              {entrega.status === "EM_REVISAO" && (
                <form action={avaliarEntrega} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={entrega.id} />
                  <div>
                    <Label>Comentário (opcional)</Label>
                    <Textarea name="comentarioCliente" rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" name="status" value="APROVADA">
                      Aprovar
                    </Button>
                    <Button type="submit" name="status" value="REPROVADA" variant="danger">
                      Solicitar ajustes
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          ))}
          {projeto.entregas.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhuma entrega enviada ainda.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Financeiro</h2>
        <div className="space-y-2">
          {projeto.recebimentos.map((r) => (
            <Card key={r.id} className="p-3 flex items-center justify-between">
              <span className="text-sm">
                vencimento {formatData(r.vencimento)} {r.formaPagamento && `· ${r.formaPagamento}`}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatMoeda(r.valor)}</span>
                <Badge variant={RECEBIMENTO_VARIANT[r.status]}>{r.status}</Badge>
              </div>
            </Card>
          ))}
          {projeto.recebimentos.length === 0 && (
            <p className="text-sm text-neutral-500">Nenhuma parcela lançada ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
}
