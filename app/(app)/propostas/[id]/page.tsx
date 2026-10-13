import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, Card, Badge, Button, LinkButton } from "@/components/ui";
import { formatMoeda, formatData } from "@/lib/utils";
import { atualizarStatusProposta } from "../actions";

const STATUS_VARIANT: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  ENVIADA: "neutral",
  NEGOCIACAO: "warning",
  APROVADA: "success",
  RECUSADA: "danger",
};

export default async function PropostaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const proposta = await prisma.proposta.findUnique({
    where: { id },
    include: {
      cliente: true,
      servico: true,
      plano: true,
      adicionais: { include: { adicional: true } },
      projeto: true,
    },
  });

  if (!proposta) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`Proposta — ${proposta.cliente.nome}`}
        description={`${proposta.servico.nome} — ${proposta.plano.nome}`}
        actions={<Badge variant={STATUS_VARIANT[proposta.status]}>{proposta.status}</Badge>}
      />

      <Card className="p-5 mb-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Valor proposto</span>
          <span className="font-medium">{formatMoeda(proposta.valorProposto)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Prazo proposto</span>
          <span>{proposta.prazoPropostoDias ? `${proposta.prazoPropostoDias} dias` : "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">Criada em</span>
          <span>{formatData(proposta.createdAt)}</span>
        </div>
        {proposta.adicionais.length > 0 && (
          <div>
            <p className="text-neutral-500 mb-1">Adicionais</p>
            <ul className="list-disc list-inside">
              {proposta.adicionais.map((pa) => (
                <li key={pa.adicionalId}>{pa.adicional.nome}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {proposta.status !== "APROVADA" && proposta.status !== "RECUSADA" && (
        <Card className="p-5 mb-6">
          <p className="text-sm font-medium mb-3">Atualizar status</p>
          <div className="flex flex-wrap gap-2">
            {proposta.status === "ENVIADA" && (
              <form action={atualizarStatusProposta}>
                <input type="hidden" name="id" value={proposta.id} />
                <input type="hidden" name="status" value="NEGOCIACAO" />
                <Button type="submit" variant="secondary">
                  Mover para negociação
                </Button>
              </form>
            )}
            <form action={atualizarStatusProposta}>
              <input type="hidden" name="id" value={proposta.id} />
              <input type="hidden" name="status" value="APROVADA" />
              <Button type="submit">Aprovar proposta</Button>
            </form>
            <form action={atualizarStatusProposta}>
              <input type="hidden" name="id" value={proposta.id} />
              <input type="hidden" name="status" value="RECUSADA" />
              <Button type="submit" variant="danger">
                Recusar
              </Button>
            </form>
          </div>
        </Card>
      )}

      {proposta.projeto && (
        <LinkButton href={`/projetos/${proposta.projeto.id}`}>Ver projeto criado →</LinkButton>
      )}
    </div>
  );
}
