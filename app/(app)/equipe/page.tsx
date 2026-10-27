import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Input, Select, Button, Badge, Label } from "@/components/ui";
import { createProfissional, alternarAtivoProfissional } from "./actions";
import { formatMoeda } from "@/lib/utils";
import { exigirModulo } from "@/lib/acesso";

export default async function EquipePage() {
  await exigirModulo("equipe");
  const profissionais = await prisma.profissional.findMany({
    orderBy: [{ nome: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Equipe" description="Profissionais fixos e freelancers" />

      <Card className="p-4 mb-8">
        <p className="text-sm font-medium mb-2">Novo profissional</p>
        <form action={createProfissional} className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <Label>Nome</Label>
            <Input name="nome" required />
          </div>
          <div>
            <Label>Função</Label>
            <Input name="funcao" required placeholder="Ex: Diretor de fotografia" />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select name="tipo" defaultValue="FREELANCER">
              <option value="FIXO">Fixo</option>
              <option value="FREELANCER">Freelancer</option>
            </Select>
          </div>
          <div>
            <Label>Diária padrão (R$)</Label>
            <Input name="diariaPadrao" type="number" step="0.01" />
          </div>
          <div>
            <Label>Contato</Label>
            <Input name="contato" placeholder="telefone/whatsapp" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input name="email" type="email" />
          </div>
          <Button type="submit">Adicionar profissional</Button>
        </form>
      </Card>

      <div className="space-y-2">
        {profissionais.map((p) => (
          <Card key={p.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium">
                {p.nome} {!p.ativo && <span className="text-neutral-400 dark:text-neutral-500">(inativo)</span>}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {p.funcao} {p.diariaPadrao != null && `· ${formatMoeda(p.diariaPadrao)}/diária`}
                {p.contato && ` · ${p.contato}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.tipo === "FIXO" ? "info" : "neutral"}>
                {p.tipo === "FIXO" ? "Fixo" : "Freelancer"}
              </Badge>
              <form action={alternarAtivoProfissional}>
                <input type="hidden" name="id" value={p.id} />
                <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                  {p.ativo ? "Desativar" : "Ativar"}
                </Button>
              </form>
            </div>
          </Card>
        ))}
        {profissionais.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum profissional cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
