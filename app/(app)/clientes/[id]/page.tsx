import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, Card, Input, Select, Textarea, Button, Badge, Label, LinkButton } from "@/components/ui";
import { updateCliente, addNota } from "../actions";
import { formatMoeda, formatData } from "@/lib/utils";
import Link from "next/link";

const STATUS_PROPOSTA_VARIANT: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  ENVIADA: "neutral",
  NEGOCIACAO: "warning",
  APROVADA: "success",
  RECUSADA: "danger",
};

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      propostas: {
        orderBy: { createdAt: "desc" },
        include: { servico: true, plano: true },
      },
      projetos: {
        orderBy: { createdAt: "desc" },
        include: { servico: true },
      },
    },
  });

  if (!cliente) notFound();

  return (
    <div className="pb-16">
      <PageHeader
        title={cliente.nome}
        description={cliente.empresa ?? undefined}
        actions={<LinkButton href={`/propostas/nova?clienteId=${cliente.id}`}>Nova proposta</LinkButton>}
      />

      <Card className="p-5 mb-8">
        <form action={updateCliente} className="space-y-4">
          <input type="hidden" name="id" value={cliente.id} />
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Nome</Label>
              <Input name="nome" defaultValue={cliente.nome} required />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input name="empresa" defaultValue={cliente.empresa ?? ""} />
            </div>
            <div>
              <Label>Status</Label>
              <Select name="statusRelacionamento" defaultValue={cliente.statusRelacionamento}>
                <option value="LEAD">Lead</option>
                <option value="ORCAMENTO_ENVIADO">Orçamento enviado</option>
                <option value="CLIENTE_ATIVO">Cliente ativo</option>
                <option value="CLIENTE_RECORRENTE">Cliente recorrente</option>
              </Select>
            </div>
            <div>
              <Label>Contato</Label>
              <Input name="contato" defaultValue={cliente.contato ?? ""} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input name="email" type="email" defaultValue={cliente.email ?? ""} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input name="telefone" defaultValue={cliente.telefone ?? ""} />
            </div>
          </div>
          <Button type="submit">Salvar cliente</Button>
        </form>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Propostas</h2>
          <div className="space-y-2">
            {cliente.propostas.map((p) => (
              <Link key={p.id} href={`/propostas/${p.id}`}>
                <Card className="p-3 hover:border-neutral-400 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {p.servico.nome} — {p.plano.nome}
                    </span>
                    <Badge variant={STATUS_PROPOSTA_VARIANT[p.status]}>{p.status}</Badge>
                  </div>
                  <p className="text-xs text-neutral-500">{formatMoeda(p.valorProposto)}</p>
                </Card>
              </Link>
            ))}
            {cliente.propostas.length === 0 && (
              <p className="text-sm text-neutral-500">Nenhuma proposta ainda.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Projetos</h2>
          <div className="space-y-2">
            {cliente.projetos.map((proj) => (
              <Link key={proj.id} href={`/projetos/${proj.id}`}>
                <Card className="p-3 hover:border-neutral-400 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{proj.nome}</span>
                    <Badge>{proj.statusGeral}</Badge>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {proj.servico.nome} · prazo {formatData(proj.prazoData)}
                  </p>
                </Card>
              </Link>
            ))}
            {cliente.projetos.length === 0 && (
              <p className="text-sm text-neutral-500">Nenhum projeto ainda.</p>
            )}
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Notas internas</h2>
        <Card className="p-4">
          <pre className="whitespace-pre-wrap text-sm text-neutral-700 font-sans mb-4">
            {cliente.notasInternas || "Nenhuma nota registrada ainda."}
          </pre>
          <form action={addNota} className="flex items-end gap-2">
            <input type="hidden" name="id" value={cliente.id} />
            <div className="flex-1">
              <Label>Adicionar nota</Label>
              <Textarea name="nota" rows={2} required />
            </div>
            <Button type="submit" variant="secondary">
              Adicionar
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
