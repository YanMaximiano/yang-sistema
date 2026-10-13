import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Input, Button, Badge, Label } from "@/components/ui";
import { createEquipamento, alternarStatusEquipamento, alternarAtivoEquipamento } from "./actions";

export default async function EquipamentosPage() {
  const equipamentos = await prisma.equipamento.findMany({
    orderBy: [{ categoria: "asc" }, { nome: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Equipamentos" description="Inventário e disponibilidade" />

      <Card className="p-4 mb-8">
        <p className="text-sm font-medium mb-2">Novo equipamento</p>
        <form action={createEquipamento} className="grid md:grid-cols-3 gap-3 items-end">
          <div>
            <Label>Nome</Label>
            <Input name="nome" required placeholder="Ex: Sony A7S III" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input name="categoria" required placeholder="Ex: Câmera, Lente, Áudio, Drone..." />
          </div>
          <div>
            <Label>Observações</Label>
            <Input name="observacoes" />
          </div>
          <Button type="submit">Adicionar equipamento</Button>
        </form>
      </Card>

      <div className="space-y-2">
        {equipamentos.map((eq) => (
          <Card key={eq.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium">
                {eq.nome} {!eq.ativo && <span className="text-neutral-400">(inativo)</span>}
              </p>
              <p className="text-sm text-neutral-500">
                {eq.categoria} {eq.observacoes && `· ${eq.observacoes}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={eq.status === "DISPONIVEL" ? "success" : "warning"}>
                {eq.status === "DISPONIVEL" ? "Disponível" : "Manutenção"}
              </Badge>
              <form action={alternarStatusEquipamento}>
                <input type="hidden" name="id" value={eq.id} />
                <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                  {eq.status === "DISPONIVEL" ? "Marcar manutenção" : "Marcar disponível"}
                </Button>
              </form>
              <form action={alternarAtivoEquipamento}>
                <input type="hidden" name="id" value={eq.id} />
                <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                  {eq.ativo ? "Desativar" : "Ativar"}
                </Button>
              </form>
            </div>
          </Card>
        ))}
        {equipamentos.length === 0 && (
          <p className="text-sm text-neutral-500">Nenhum equipamento cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
