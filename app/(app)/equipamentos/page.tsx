import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/lib/acesso";
import { PageHeader, Card, Input, Button, Badge, Label } from "@/components/ui";
import { AssistenteDaTela } from "@/components/AssistenteDaTela";
import { formatMoeda } from "@/lib/utils";
import { configComPadrao, depreciacaoMensalDe, depreciacaoPorDiaria } from "@/lib/calculadora";
import {
  createEquipamento,
  updateEquipamento,
  definirStatusEquipamento,
  alternarAtivoEquipamento,
} from "./actions";

export default async function EquipamentosPage() {
  // o custo de aluguel (depreciação) deriva do valor pago: só quem vê a calculadora enxerga
  const acesso = await exigirModulo("equipamentos");
  const verCustos = acesso.tem("calculadora");

  const [equipamentos, configSalva] = await Promise.all([
    prisma.equipamento.findMany({ orderBy: [{ categoria: "asc" }, { nome: "asc" }] }),
    verCustos ? prisma.configCalculadora.findUnique({ where: { id: "singleton" } }) : null,
  ]);
  const config = configComPadrao(configSalva);

  function custoDeAluguel(eq: (typeof equipamentos)[number]) {
    if (eq.status === "ESTRAGADO") return "fora do cálculo (estragado)";
    if (!eq.valorCompra) return "informe o valor pago em Calculadora";
    return `${formatMoeda(depreciacaoPorDiaria(eq, config))} por diária · ${formatMoeda(depreciacaoMensalDe(eq, config.depreciacaoPct))} por mês`;
  }

  return (
    <div>
      <PageHeader eyebrow="Inventário" title="Seus *equipamentos*" description="Inventário e disponibilidade" actions={<AssistenteDaTela chave="equipamentos" />} />

      <Card id="novo-equipamento" className="p-4 mb-8">
        <p className="text-sm font-medium mb-2">Novo equipamento</p>
        <form action={createEquipamento} className="grid md:grid-cols-4 gap-3 items-end">
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
            <Label>Foto (JPG, PNG ou WebP, até 5 MB)</Label>
            <Input type="file" name="foto" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" />
          </div>
          <Button type="submit" className="md:col-span-4 md:w-fit">
            Adicionar equipamento
          </Button>
        </form>
      </Card>

      <div id="lista-equipamentos" className="space-y-2">
        {equipamentos.map((eq) => (
          <Card key={eq.id} className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {eq.foto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={eq.foto}
                    alt={eq.nome}
                    className="w-14 h-14 rounded-md object-cover border border-neutral-200 dark:border-neutral-800 shrink-0"
                  />
                )}
                <div>
                  <p className="font-medium">
                    {eq.nome} {!eq.ativo && <span className="text-neutral-400 dark:text-neutral-500">(inativo)</span>}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {eq.categoria} {eq.observacoes && `· ${eq.observacoes}`}
                  </p>
                  {verCustos && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                      Custo de aluguel (depreciação): <strong>{custoDeAluguel(eq)}</strong>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={eq.status === "DISPONIVEL" ? "success" : eq.status === "ESTRAGADO" ? "danger" : "warning"}
                >
                  {eq.status === "DISPONIVEL" ? "Disponível" : eq.status === "ESTRAGADO" ? "Estragado" : "Manutenção"}
                </Badge>
                {(
                  [
                    { status: "DISPONIVEL", rotulo: "Marcar disponível" },
                    { status: "MANUTENCAO", rotulo: "Marcar manutenção" },
                    { status: "ESTRAGADO", rotulo: "Marcar estragado" },
                  ] as const
                )
                  .filter((o) => o.status !== eq.status)
                  .map((o) => (
                    <form key={o.status} action={definirStatusEquipamento}>
                      <input type="hidden" name="id" value={eq.id} />
                      <input type="hidden" name="status" value={o.status} />
                      <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                        {o.rotulo}
                      </Button>
                    </form>
                  ))}
                <form action={alternarAtivoEquipamento}>
                  <input type="hidden" name="id" value={eq.id} />
                  <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                    {eq.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </form>
              </div>
            </div>

            <details className="mt-3">
              <summary className="text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer w-fit">Editar</summary>
              <form action={updateEquipamento} className="grid md:grid-cols-4 gap-3 items-end mt-2">
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
                  <Label>Trocar foto (até 5 MB)</Label>
                  <Input type="file" name="foto" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" />
                </div>
                <Button type="submit" variant="secondary" className="md:col-span-4 md:w-fit">
                  Salvar
                </Button>
              </form>
            </details>
          </Card>
        ))}
        {equipamentos.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum equipamento cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
