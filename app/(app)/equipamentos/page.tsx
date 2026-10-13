import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Input, Button, Badge, Label } from "@/components/ui";
import {
  createEquipamento,
  updateEquipamento,
  alternarStatusEquipamento,
  alternarAtivoEquipamento,
} from "./actions";

export default async function EquipamentosPage() {
  const equipamentos = await prisma.equipamento.findMany({
    orderBy: [{ categoria: "asc" }, { nome: "asc" }],
  });

  return (
    <div>
      <PageHeader title="Equipamentos" description="Inventário e disponibilidade" />

      <Card className="p-4 mb-8">
        <p className="text-sm font-medium mb-2">Novo equipamento</p>
        <form
          action={createEquipamento}
          encType="multipart/form-data"
          className="grid md:grid-cols-4 gap-3 items-end"
        >
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
          <div>
            <Label>Foto</Label>
            <Input type="file" name="foto" accept="image/*" />
          </div>
          <Button type="submit" className="md:col-span-4 md:w-fit">
            Adicionar equipamento
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        {equipamentos.map((eq) => (
          <Card key={eq.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {eq.foto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={eq.foto}
                    alt={eq.nome}
                    className="w-14 h-14 rounded-md object-cover border border-neutral-200 shrink-0"
                  />
                )}
                <div>
                  <p className="font-medium">
                    {eq.nome} {!eq.ativo && <span className="text-neutral-400">(inativo)</span>}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {eq.categoria} {eq.observacoes && `· ${eq.observacoes}`}
                  </p>
                </div>
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
            </div>

            <details className="mt-3">
              <summary className="text-xs text-neutral-500 cursor-pointer w-fit">Editar</summary>
              <form
                action={updateEquipamento}
                encType="multipart/form-data"
                className="grid md:grid-cols-4 gap-3 items-end mt-2"
              >
                <input type="hidden" name="id" value={eq.id} />
                <div>
                  <Label>Nome</Label>
                  <Input name="nome" defaultValue={eq.nome} required />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Input name="categoria" defaultValue={eq.categoria} required />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input name="observacoes" defaultValue={eq.observacoes ?? ""} />
                </div>
                <div>
                  <Label>Trocar foto</Label>
                  <Input type="file" name="foto" accept="image/*" />
                </div>
                <Button type="submit" variant="secondary" className="md:col-span-4 md:w-fit">
                  Salvar
                </Button>
              </form>
            </details>
          </Card>
        ))}
        {equipamentos.length === 0 && (
          <p className="text-sm text-neutral-500">Nenhum equipamento cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
