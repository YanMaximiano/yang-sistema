import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Input, Select, Button, Badge, Label } from "@/components/ui";
import { createCliente } from "./actions";
import Link from "next/link";
import { CLIENTE_STATUS_LABEL, CLIENTE_STATUS_VARIANT } from "@/lib/status";

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { propostas: true, projetos: true } } },
  });

  return (
    <div>
      <PageHeader title="Clientes" description="CRM — cadastro e relacionamento" />

      <Card className="p-4 mb-8">
        <p className="text-sm font-medium mb-2">Novo cliente</p>
        <form action={createCliente} className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <Label>Nome</Label>
            <Input name="nome" required />
          </div>
          <div>
            <Label>Empresa</Label>
            <Input name="empresa" />
          </div>
          <div>
            <Label>Contato</Label>
            <Input name="contato" placeholder="telefone/whatsapp" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input name="email" type="email" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input name="telefone" />
          </div>
          <div>
            <Label>Origem</Label>
            <Select name="origem" defaultValue="">
              <option value="">—</option>
              <option value="Indicação">Indicação</option>
              <option value="Instagram">Instagram</option>
              <option value="Site">Site</option>
              <option value="Outro">Outro</option>
            </Select>
          </div>
          <Button type="submit">Criar cliente</Button>
        </form>
      </Card>

      <div className="space-y-2">
        {clientes.map((cliente) => (
          <Link key={cliente.id} href={`/clientes/${cliente.id}`}>
            <Card className="p-4 flex items-center justify-between hover:border-neutral-400 transition-colors">
              <div>
                <p className="font-medium">{cliente.nome}</p>
                <p className="text-sm text-neutral-500">
                  {cliente.empresa ?? "—"} {cliente.origem && `· ${cliente.origem}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400">
                  {cliente._count.propostas} proposta(s) · {cliente._count.projetos} projeto(s)
                </span>
                <Badge variant={CLIENTE_STATUS_VARIANT[cliente.statusRelacionamento]}>
                  {CLIENTE_STATUS_LABEL[cliente.statusRelacionamento]}
                </Badge>
              </div>
            </Card>
          </Link>
        ))}
        {clientes.length === 0 && (
          <p className="text-sm text-neutral-500">Nenhum cliente cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
