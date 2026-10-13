import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Input, Select, Button, Label } from "@/components/ui";
import { criarProjetoAvulso } from "../actions";

export default async function NovoProjetoPage() {
  const [clientes, servicos] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nome: "asc" } }),
    prisma.servico.findMany({
      where: { ativo: true, pilar: { ativo: true } },
      orderBy: { ordem: "asc" },
      include: { pilar: true },
    }),
  ]);

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Novo projeto avulso"
        description="Para casos fora do fluxo padrão de proposta (o pipeline de etapas é copiado do serviço escolhido)"
      />
      <Card className="p-5">
        <form action={criarProjetoAvulso} className="space-y-4">
          <div>
            <Label>Cliente</Label>
            <Select name="clienteId" required>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Serviço</Label>
            <Select name="servicoId" required>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.pilar.nome} — {s.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Nome do projeto</Label>
            <Input name="nome" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor (R$)</Label>
              <Input name="valor" type="number" step="1" required />
            </div>
            <div>
              <Label>Prazo</Label>
              <Input name="prazoData" type="date" />
            </div>
          </div>
          <Button type="submit">Criar projeto</Button>
        </form>
      </Card>
    </div>
  );
}
