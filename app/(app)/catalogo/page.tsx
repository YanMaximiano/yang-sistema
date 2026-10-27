import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, Input, Button, Select, LinkButton } from "@/components/ui";
import { AssistenteDaTela } from "@/components/AssistenteDaTela";
import { createPilar, createServico, togglePilarAtivo } from "./actions";
import { formatFaixaValor } from "@/lib/utils";
import { exigirModulo } from "@/lib/acesso";

const TIPO_LABEL: Record<string, string> = {
  PROJETO_UNICO: "Projeto único",
  RECORRENCIA_MENSAL: "Recorrência mensal",
  LOCACAO_HORA: "Locação/hora",
};

export default async function CatalogoPage() {
  await exigirModulo("catalogo");
  const pilares = await prisma.pilar.findMany({
    orderBy: { ordem: "asc" },
    include: {
      servicos: {
        orderBy: { ordem: "asc" },
        include: { planos: { where: { ativo: true }, orderBy: { ordem: "asc" } } },
      },
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo" title="Catálogo de *serviços*"
        description="Pilares, serviços, planos e adicionais — editável livremente, sem depender de deploy."
        actions={<AssistenteDaTela chave="catalogo" />}
      />

      <Card id="novo-pilar" className="p-4 mb-8">
        <form action={createPilar} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Novo pilar</label>
            <Input name="nome" placeholder="Ex: Conteúdo para Empresas" required />
          </div>
          <Button type="submit">Adicionar pilar</Button>
        </form>
      </Card>

      <div id="lista-pilares" className="space-y-8">
        {pilares.map((pilar) => (
          <div key={pilar.id}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-semibold">{pilar.nome}</h2>
              {!pilar.ativo && <Badge variant="warning">Inativo</Badge>}
              <form action={togglePilarAtivo}>
                <input type="hidden" name="id" value={pilar.id} />
                <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                  {pilar.ativo ? "Desativar" : "Ativar"}
                </Button>
              </form>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mb-3">
              {pilar.servicos.map((servico) => (
                <LinkButton
                  key={servico.id}
                  href={`/catalogo/servicos/${servico.id}`}
                  variant="secondary"
                  className="!justify-start !items-start flex-col !py-3 h-full"
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium">{servico.nome}</span>
                    {!servico.ativo && <Badge variant="warning">Inativo</Badge>}
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{TIPO_LABEL[servico.tipoCobranca]}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {servico.planos.length} plano(s)
                    {servico.planos[0] &&
                      ` · ${formatFaixaValor(servico.planos[0].valorMin, servico.planos[0].valorMax)}`}
                  </span>
                </LinkButton>
              ))}
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-neutral-500 dark:text-neutral-400">Adicionar serviço a este pilar</summary>
              <form action={createServico} className="flex items-end gap-2 mt-2 max-w-xl">
                <input type="hidden" name="pilarId" value={pilar.id} />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nome</label>
                  <Input name="nome" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Cobrança</label>
                  <Select name="tipoCobranca" required>
                    <option value="PROJETO_UNICO">Projeto único</option>
                    <option value="RECORRENCIA_MENSAL">Recorrência mensal</option>
                    <option value="LOCACAO_HORA">Locação/hora</option>
                  </Select>
                </div>
                <Button type="submit" variant="secondary">
                  Criar
                </Button>
              </form>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
