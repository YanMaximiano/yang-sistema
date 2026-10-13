import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, Card, Input, Textarea, Select, Button, Label } from "@/components/ui";
import { formatFaixaValor } from "@/lib/utils";
import {
  updateServico,
  createPlano,
  updatePlano,
  deletePlano,
  createAdicional,
  updateAdicional,
  deleteAdicional,
  createEtapaTemplate,
  deleteEtapaTemplate,
  moverEtapaTemplate,
  createTemplateEquipe,
  deleteTemplateEquipe,
  createTemplateEquipamento,
  deleteTemplateEquipamento,
  createModeloDocumento,
  updateModeloDocumento,
  deleteModeloDocumento,
  createChecklistTemplateItem,
  deleteChecklistTemplateItem,
  moverChecklistTemplateItem,
} from "../../actions";
import { DOCUMENTO_TIPO_LABEL } from "@/lib/status";

export default async function ServicoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [servico, pilares, equipamentos] = await Promise.all([
    prisma.servico.findUnique({
      where: { id },
      include: {
        planos: {
          orderBy: { ordem: "asc" },
          include: {
            templatesEquipe: { orderBy: { funcao: "asc" } },
            templatesEquipamento: { include: { equipamento: true }, orderBy: { id: "asc" } },
          },
        },
        adicionais: { orderBy: { nome: "asc" } },
        etapasTemplate: { orderBy: { ordem: "asc" } },
        modelosDocumento: { orderBy: { nome: "asc" } },
        checklistTemplate: { orderBy: { ordem: "asc" } },
      },
    }),
    prisma.pilar.findMany({ orderBy: { ordem: "asc" } }),
    prisma.equipamento.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ]);

  if (!servico) notFound();

  return (
    <div className="pb-16">
      <PageHeader title={servico.nome} description="Edição completa do serviço no catálogo" />

      <Card className="p-5 mb-6">
        <form action={updateServico} className="space-y-4">
          <input type="hidden" name="id" value={servico.id} />
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome do serviço</Label>
              <Input name="nome" defaultValue={servico.nome} required />
            </div>
            <div>
              <Label>Pilar</Label>
              <Select name="pilarId" defaultValue={servico.pilarId}>
                {pilares.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Tipo de cobrança</Label>
              <Select name="tipoCobranca" defaultValue={servico.tipoCobranca}>
                <option value="PROJETO_UNICO">Projeto único</option>
                <option value="RECORRENCIA_MENSAL">Recorrência mensal</option>
                <option value="LOCACAO_HORA">Locação/hora</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea name="descricao" defaultValue={servico.descricao ?? ""} rows={2} />
          </div>
          <div>
            <Label>Argumentação de venda</Label>
            <Textarea name="argumentacaoVenda" defaultValue={servico.argumentacaoVenda ?? ""} rows={3} />
          </div>
          <div>
            <Label>Objeções comuns</Label>
            <Textarea name="objecoesComuns" defaultValue={servico.objecoesComuns ?? ""} rows={3} />
          </div>
          <Button type="submit">Salvar serviço</Button>
        </form>
      </Card>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Planos</h2>
        <div className="space-y-3">
          {servico.planos.map((plano) => (
            <Card key={plano.id} className="p-4">
              <form action={updatePlano} className="space-y-3">
                <input type="hidden" name="id" value={plano.id} />
                <input type="hidden" name="servicoId" value={servico.id} />
                <div className="grid md:grid-cols-4 gap-3">
                  <div className="md:col-span-1">
                    <Label>Nome</Label>
                    <Input name="nome" defaultValue={plano.nome} required />
                  </div>
                  <div>
                    <Label>Valor mín. (R$)</Label>
                    <Input name="valorMin" type="number" step="1" defaultValue={plano.valorMin ?? ""} />
                  </div>
                  <div>
                    <Label>Valor máx. (R$)</Label>
                    <Input name="valorMax" type="number" step="1" defaultValue={plano.valorMax ?? ""} />
                  </div>
                  <div>
                    <Label>Prazo (dias)</Label>
                    <Input name="prazoDias" type="number" defaultValue={plano.prazoDias ?? ""} />
                  </div>
                </div>
                <div>
                  <Label>Prazo (texto livre, ex: &quot;Ciclo mensal&quot;)</Label>
                  <Input name="prazoTexto" defaultValue={plano.prazoTexto ?? ""} />
                </div>
                <div>
                  <Label>Entregas (uma por linha)</Label>
                  <Textarea name="entregas" defaultValue={plano.entregas.join("\n")} rows={4} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">
                    Faixa atual: {formatFaixaValor(plano.valorMin, plano.valorMax)}
                  </span>
                  <div className="flex gap-2">
                    <Button type="submit" variant="secondary">
                      Salvar
                    </Button>
                  </div>
                </div>
              </form>
              <details className="mt-3 border-t border-neutral-100 pt-3">
                <summary className="cursor-pointer text-sm text-neutral-500">
                  Equipe e equipamento sugeridos ({plano.templatesEquipe.length + plano.templatesEquipamento.length})
                </summary>
                <div className="grid md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs font-medium text-neutral-600 mb-2">Equipe sugerida</p>
                    <div className="space-y-1 mb-2">
                      {plano.templatesEquipe.map((te) => (
                        <div key={te.id} className="flex items-center justify-between text-sm">
                          <span>
                            {te.quantidade}x {te.funcao}
                          </span>
                          <form action={deleteTemplateEquipe}>
                            <input type="hidden" name="id" value={te.id} />
                            <input type="hidden" name="servicoId" value={servico.id} />
                            <Button type="submit" variant="ghost" className="text-xs px-2 py-0.5 text-red-600">
                              Remover
                            </Button>
                          </form>
                        </div>
                      ))}
                      {plano.templatesEquipe.length === 0 && (
                        <p className="text-xs text-neutral-400">Nenhuma sugestão ainda.</p>
                      )}
                    </div>
                    <form action={createTemplateEquipe} className="flex items-end gap-2">
                      <input type="hidden" name="planoId" value={plano.id} />
                      <input type="hidden" name="servicoId" value={servico.id} />
                      <Input name="funcao" placeholder="Função" required className="flex-1" />
                      <Input name="quantidade" type="number" defaultValue={1} className="w-16" />
                      <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                        Adicionar
                      </Button>
                    </form>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-600 mb-2">Equipamento sugerido</p>
                    <div className="space-y-1 mb-2">
                      {plano.templatesEquipamento.map((teq) => (
                        <div key={teq.id} className="flex items-center justify-between text-sm">
                          <span>{teq.equipamento.nome}</span>
                          <form action={deleteTemplateEquipamento}>
                            <input type="hidden" name="id" value={teq.id} />
                            <input type="hidden" name="servicoId" value={servico.id} />
                            <Button type="submit" variant="ghost" className="text-xs px-2 py-0.5 text-red-600">
                              Remover
                            </Button>
                          </form>
                        </div>
                      ))}
                      {plano.templatesEquipamento.length === 0 && (
                        <p className="text-xs text-neutral-400">Nenhuma sugestão ainda.</p>
                      )}
                    </div>
                    {equipamentos.length > 0 ? (
                      <form action={createTemplateEquipamento} className="flex items-end gap-2">
                        <input type="hidden" name="planoId" value={plano.id} />
                        <input type="hidden" name="servicoId" value={servico.id} />
                        <Select name="equipamentoId" required className="flex-1">
                          {equipamentos.map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              {eq.nome}
                            </option>
                          ))}
                        </Select>
                        <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                          Adicionar
                        </Button>
                      </form>
                    ) : (
                      <p className="text-xs text-neutral-400">
                        Cadastre equipamentos em &quot;Equipamentos&quot; para poder sugeri-los aqui.
                      </p>
                    )}
                  </div>
                </div>
              </details>
              <form action={deletePlano} className="mt-2">
                <input type="hidden" name="id" value={plano.id} />
                <input type="hidden" name="servicoId" value={servico.id} />
                <Button type="submit" variant="ghost" className="text-xs text-red-600 px-0">
                  Remover plano
                </Button>
              </form>
            </Card>
          ))}
        </div>

        <Card className="p-4 mt-3">
          <p className="text-sm font-medium mb-2">Novo plano</p>
          <form action={createPlano} className="grid md:grid-cols-4 gap-3 items-end">
            <input type="hidden" name="servicoId" value={servico.id} />
            <div>
              <Label>Nome</Label>
              <Input name="nome" required placeholder="Ex: Essencial" />
            </div>
            <div>
              <Label>Valor mín. (R$)</Label>
              <Input name="valorMin" type="number" step="1" />
            </div>
            <div>
              <Label>Valor máx. (R$)</Label>
              <Input name="valorMax" type="number" step="1" />
            </div>
            <div>
              <Label>Prazo (dias)</Label>
              <Input name="prazoDias" type="number" />
            </div>
            <div className="md:col-span-3">
              <Label>Entregas (uma por linha)</Label>
              <Textarea name="entregas" rows={3} />
            </div>
            <Button type="submit">Adicionar plano</Button>
          </form>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Adicionais</h2>
        <div className="space-y-2">
          {servico.adicionais.map((adicional) => (
            <Card key={adicional.id} className="p-3">
              <form action={updateAdicional} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={adicional.id} />
                <input type="hidden" name="servicoId" value={servico.id} />
                <div className="flex-1 min-w-[160px]">
                  <Label>Nome</Label>
                  <Input name="nome" defaultValue={adicional.nome} required />
                </div>
                <div className="w-32">
                  <Label>Valor (R$)</Label>
                  <Input name="valor" type="number" step="1" defaultValue={adicional.valor ?? ""} />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <Label>Descrição</Label>
                  <Input name="descricao" defaultValue={adicional.descricao ?? ""} />
                </div>
                <Button type="submit" variant="secondary">
                  Salvar
                </Button>
              </form>
              <form action={deleteAdicional} className="mt-1">
                <input type="hidden" name="id" value={adicional.id} />
                <input type="hidden" name="servicoId" value={servico.id} />
                <Button type="submit" variant="ghost" className="text-xs text-red-600 px-0">
                  Remover
                </Button>
              </form>
            </Card>
          ))}
        </div>
        <Card className="p-4 mt-3">
          <p className="text-sm font-medium mb-2">Novo adicional</p>
          <form action={createAdicional} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="servicoId" value={servico.id} />
            <div className="flex-1 min-w-[160px]">
              <Label>Nome</Label>
              <Input name="nome" required />
            </div>
            <div className="w-32">
              <Label>Valor (R$)</Label>
              <Input name="valor" type="number" step="1" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label>Descrição</Label>
              <Input name="descricao" />
            </div>
            <Button type="submit">Adicionar</Button>
          </form>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Pipeline de etapas (template)</h2>
        <p className="text-sm text-neutral-500 mb-3">
          Ao criar um projeto a partir deste serviço, essas etapas serão copiadas para o Kanban do
          projeto.
        </p>
        <Card className="p-4">
          <ol className="space-y-2">
            {servico.etapasTemplate.map((etapa, idx) => (
              <li key={etapa.id} className="flex items-center gap-2">
                <span className="w-6 text-sm text-neutral-400">{idx + 1}.</span>
                <span className="flex-1 text-sm">{etapa.nome}</span>
                <form action={moverEtapaTemplate}>
                  <input type="hidden" name="id" value={etapa.id} />
                  <input type="hidden" name="servicoId" value={servico.id} />
                  <input type="hidden" name="direcao" value="cima" />
                  <Button type="submit" variant="ghost" className="px-2 py-1 text-xs" disabled={idx === 0}>
                    ↑
                  </Button>
                </form>
                <form action={moverEtapaTemplate}>
                  <input type="hidden" name="id" value={etapa.id} />
                  <input type="hidden" name="servicoId" value={servico.id} />
                  <input type="hidden" name="direcao" value="baixo" />
                  <Button
                    type="submit"
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    disabled={idx === servico.etapasTemplate.length - 1}
                  >
                    ↓
                  </Button>
                </form>
                <form action={deleteEtapaTemplate}>
                  <input type="hidden" name="id" value={etapa.id} />
                  <input type="hidden" name="servicoId" value={servico.id} />
                  <Button type="submit" variant="ghost" className="px-2 py-1 text-xs text-red-600">
                    Remover
                  </Button>
                </form>
              </li>
            ))}
          </ol>
          <form action={createEtapaTemplate} className="flex items-end gap-2 mt-4">
            <input type="hidden" name="servicoId" value={servico.id} />
            <div className="flex-1">
              <Label>Nova etapa</Label>
              <Input name="nome" required placeholder="Ex: Revisão do Cliente" />
            </div>
            <Button type="submit" variant="secondary">
              Adicionar etapa
            </Button>
          </form>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Modelos de documento</h2>
        <p className="text-sm text-neutral-500 mb-3">
          Contrato, termo de uso de imagem, briefing etc. Use placeholders como{" "}
          <code className="text-xs bg-neutral-100 px-1 rounded">{"{{cliente.nome}}"}</code>,{" "}
          <code className="text-xs bg-neutral-100 px-1 rounded">{"{{projeto.valor}}"}</code>,{" "}
          <code className="text-xs bg-neutral-100 px-1 rounded">{"{{projeto.prazoData}}"}</code>{" "}
          — eles viram os dados reais quando o documento é gerado no projeto.
        </p>
        <div className="space-y-3">
          {servico.modelosDocumento.map((modelo) => (
            <Card key={modelo.id} className="p-4">
              <form action={updateModeloDocumento} className="space-y-3">
                <input type="hidden" name="id" value={modelo.id} />
                <input type="hidden" name="servicoId" value={servico.id} />
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label>Nome</Label>
                    <Input name="nome" defaultValue={modelo.nome} required />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select name="tipo" defaultValue={modelo.tipo}>
                      {Object.entries(DOCUMENTO_TIPO_LABEL).map(([valor, label]) => (
                        <option key={valor} value={valor}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Conteúdo</Label>
                  <Textarea name="conteudo" defaultValue={modelo.conteudo} rows={8} required />
                </div>
                <Button type="submit" variant="secondary">
                  Salvar
                </Button>
              </form>
              <form action={deleteModeloDocumento} className="mt-2">
                <input type="hidden" name="id" value={modelo.id} />
                <input type="hidden" name="servicoId" value={servico.id} />
                <Button type="submit" variant="ghost" className="text-xs text-red-600 px-0">
                  Remover modelo
                </Button>
              </form>
            </Card>
          ))}
        </div>

        <Card className="p-4 mt-3">
          <p className="text-sm font-medium mb-2">Novo modelo</p>
          <form action={createModeloDocumento} className="space-y-3">
            <input type="hidden" name="servicoId" value={servico.id} />
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input name="nome" required placeholder="Ex: Contrato de prestação de serviço" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select name="tipo" defaultValue="CONTRATO">
                  {Object.entries(DOCUMENTO_TIPO_LABEL).map(([valor, label]) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                name="conteudo"
                rows={8}
                required
                placeholder={
                  "Contrato entre Yang e {{cliente.nome}} para {{projeto.nome}}, no valor de {{projeto.valor}}, com prazo até {{projeto.prazoData}}."
                }
              />
            </div>
            <Button type="submit">Adicionar modelo</Button>
          </form>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Checklist de pré-produção</h2>
        <p className="text-sm text-neutral-500 mb-3">
          Itens a conferir antes de começar a produção (autorizações, plano de captação, backup
          etc.). Ao criar um projeto a partir deste serviço, esses itens serão copiados para o
          projeto, desmarcados.
        </p>
        <Card className="p-4">
          <ol className="space-y-2">
            {servico.checklistTemplate.map((item, idx) => (
              <li key={item.id} className="flex items-center gap-2">
                <span className="w-6 text-sm text-neutral-400">{idx + 1}.</span>
                <span className="flex-1 text-sm">{item.nome}</span>
                <form action={moverChecklistTemplateItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="servicoId" value={servico.id} />
                  <input type="hidden" name="direcao" value="cima" />
                  <Button type="submit" variant="ghost" className="px-2 py-1 text-xs" disabled={idx === 0}>
                    ↑
                  </Button>
                </form>
                <form action={moverChecklistTemplateItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="servicoId" value={servico.id} />
                  <input type="hidden" name="direcao" value="baixo" />
                  <Button
                    type="submit"
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    disabled={idx === servico.checklistTemplate.length - 1}
                  >
                    ↓
                  </Button>
                </form>
                <form action={deleteChecklistTemplateItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="servicoId" value={servico.id} />
                  <Button type="submit" variant="ghost" className="px-2 py-1 text-xs text-red-600">
                    Remover
                  </Button>
                </form>
              </li>
            ))}
          </ol>
          <form action={createChecklistTemplateItem} className="flex items-end gap-2 mt-4">
            <input type="hidden" name="servicoId" value={servico.id} />
            <div className="flex-1">
              <Label>Novo item</Label>
              <Input name="nome" required placeholder="Ex: Autorização de uso de imagem" />
            </div>
            <Button type="submit" variant="secondary">
              Adicionar item
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
