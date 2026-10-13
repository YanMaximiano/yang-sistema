import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { formatMoeda, formatData } from "@/lib/utils";
import { responderProposta } from "../../actions";

const STATUS_VARIANT: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  ENVIADA: "neutral",
  NEGOCIACAO: "warning",
  APROVADA: "success",
  RECUSADA: "danger",
};

export default async function PortalPropostaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const clienteId = session?.user.clienteId;
  if (!clienteId) redirect("/login");

  const proposta = await prisma.proposta.findUnique({
    where: { id },
    include: {
      servico: true,
      plano: true,
      adicionais: { include: { adicional: true } },
    },
  });

  if (!proposta || proposta.clienteId !== clienteId) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`${proposta.servico.nome} — ${proposta.plano.nome}`}
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
          <span className="text-neutral-500">Recebida em</span>
          <span>{formatData(proposta.createdAt)}</span>
        </div>
        <div>
          <p className="text-neutral-500 mb-1">Entregas incluídas</p>
          <ul className="list-disc list-inside">
            {proposta.plano.entregas.map((entrega, i) => (
              <li key={i}>{entrega}</li>
            ))}
          </ul>
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

      {(proposta.status === "ENVIADA" || proposta.status === "NEGOCIACAO") && (
        <Card className="p-5">
          <p className="text-sm font-medium mb-3">O que você decide?</p>
          <div className="flex gap-2">
            <form action={responderProposta}>
              <input type="hidden" name="id" value={proposta.id} />
              <input type="hidden" name="status" value="APROVADA" />
              <Button type="submit">Aprovar proposta</Button>
            </form>
            <form action={responderProposta}>
              <input type="hidden" name="id" value={proposta.id} />
              <input type="hidden" name="status" value="RECUSADA" />
              <Button type="submit" variant="danger">
                Recusar
              </Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
