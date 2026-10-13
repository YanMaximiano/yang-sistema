import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader, Card, Badge, Button, Input, Select, Label } from "@/components/ui";
import { formatMoeda, formatData } from "@/lib/utils";
import {
  avancarEtapa,
  voltarEtapa,
  reabrirEtapa,
  iniciarEtapa,
  criarEntrega,
  atualizarStatusEntrega,
  criarRecebimento,
  atualizarRecebimento,
  criarCusto,
  deletarCusto,
  alocarEquipamento,
  alternarChecklistEquipamento,
  alternarItemChecklist,
  removerAlocacaoEquipamento,
  criarEscala,
  removerEscala,
  gerarDocumento,
  criarDocumentoLink,
  enviarParaAssinatura,
  deletarDocumento,
} from "../actions";
import { StatusGeralSelect } from "./StatusGeralSelect";
import {
  ETAPA_STATUS_VARIANT as ETAPA_VARIANT,
  ENTREGA_STATUS_VARIANT as ENTREGA_VARIANT,
  RECEBIMENTO_STATUS_VARIANT as RECEBIMENTO_VARIANT,
  DOCUMENTO_STATUS_VARIANT,
  DOCUMENTO_STATUS_LABEL,
  DOCUMENTO_TIPO_LABEL,
} from "@/lib/status";

export default async function ProjetoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const projeto = await prisma.projeto.findUnique({
    where: { id },
    include: {
      cliente: true,
      servico: true,
      plano: {
        include: {
          templatesEquipe: { orderBy: { funcao: "asc" } },
          templatesEquipamento: { include: { equipamento: true } },
        },
      },
      etapas: { orderBy: { ordem: "asc" } },
      checklistItens: { orderBy: { ordem: "asc" } },
      entregas: { orderBy: { versao: "desc" } },
      recebimentos: { orderBy: { vencimento: "asc" } },
      custos: true,
      alocacoesEquipamento: { include: { equipamento: true }, orderBy: { data: "asc" } },
      escalas: { include: { profissional: true }, orderBy: { data: "asc" } },
      documentos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!projeto) notFound();

  const [equipamentosDisponiveis, profissionaisDisponiveis, modelosDocumento] = await Promise.all([
    prisma.equipamento.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.profissional.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.modeloDocumento.findMany({
      where: { servicoId: projeto.servicoId, ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const equipamentoIds = projeto.alocacoesEquipamento.map((a) => a.equipamentoId);
  const profissionalIds = projeto.escalas.map((e) => e.profissionalId);

  const [outrasAlocacoesMesmoEquip, outrasEscalasMesmoProfissional] = await Promise.all([
    equipamentoIds.length
      ? prisma.alocacaoEquipamento.findMany({
          where: { equipamentoId: { in: equipamentoIds }, projetoId: { not: projeto.id } },
          include: { projeto: true },
        })
      : Promise.resolve([]),
    profissionalIds.length
      ? prisma.escala.findMany({
          where: { profissionalId: { in: profissionalIds }, projetoId: { not: projeto.id } },
          include: { projeto: true },
        })
      : Promise.resolve([]),
  ]);

  function conflitoEquipamento(equipamentoId: string, data: Date) {
    return outrasAlocacoesMesmoEquip.find(
      (a) => a.equipamentoId === equipamentoId && a.data.toDateString() === data.toDateString()
    );
  }

  function conflitoProfissional(profissionalId: string, data: Date) {
    return outrasEscalasMesmoProfissional.find(
      (e) => e.profissionalId === profissionalId && e.data.toDateString() === data.toDateString()
    );
  }

  const totalRecebido = projeto.recebimentos
    .filter((r) => r.status === "PAGO")
    .reduce((acc, r) => acc + r.valor, 0);
  const totalPrevisto = projeto.recebimentos.reduce((acc, r) => acc + r.valor, 0);
  const totalCustos = projeto.custos.reduce((acc, c) => acc + c.valor, 0);
  const margem = totalRecebido - totalCustos;

  return (
    <div className="pb-16 max-w-3xl">
      <PageHeader
        title={projeto.nome}
        description={`${projeto.cliente.nome} · ${projeto.servico.nome} · ${formatMoeda(projeto.valor)} · prazo ${formatData(projeto.prazoData)}`}
        actions={<StatusGeralSelect projetoId={projeto.id} statusAtual={projeto.statusGeral} />}
      />

      {projeto.checklistItens.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">
            Checklist de pré-produção{" "}
            <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
              ({projeto.checklistItens.filter((i) => i.concluido).length}/
              {projeto.checklistItens.length} concluídos)
            </span>
          </h2>
          <Card className="p-4">
            <ul className="space-y-2">
              {projeto.checklistItens.map((item) => (
                <li key={item.id}>
                  <form action={alternarItemChecklist}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <button
                      type="submit"
                      className="flex items-center gap-2 text-sm text-left w-full hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      <span
                        className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                          item.concluido
                            ? "bg-green-600 border-green-600 text-white"
                            : "border-neutral-300"
                        }`}
                      >
                        {item.concluido && "✓"}
                      </span>
                      <span className={item.concluido ? "line-through text-neutral-400 dark:text-neutral-500" : ""}>
                        {item.nome}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Pipeline</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {projeto.etapas.map((etapa) => (
            <Card key={etapa.id} className="p-3 min-w-[180px] shrink-0">
              <Badge variant={ETAPA_VARIANT[etapa.status]} className="mb-2">
                {etapa.status}
              </Badge>
              <p className="text-sm font-medium mb-2">{etapa.nome}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">
                {etapa.dataInicio && `início ${formatData(etapa.dataInicio)}`}
                {etapa.dataFim && ` · fim ${formatData(etapa.dataFim)}`}
              </p>
              <div className="flex gap-1">
                {etapa.status === "PENDENTE" && (
                  <form action={iniciarEtapa}>
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <input type="hidden" name="etapaId" value={etapa.id} />
                    <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                      Iniciar
                    </Button>
                  </form>
                )}
                {etapa.status === "EM_ANDAMENTO" && (
                  <>
                    <form action={voltarEtapa}>
                      <input type="hidden" name="projetoId" value={projeto.id} />
                      <input type="hidden" name="etapaId" value={etapa.id} />
                      <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                        ← Voltar
                      </Button>
                    </form>
                    <form action={avancarEtapa}>
                      <input type="hidden" name="projetoId" value={projeto.id} />
                      <input type="hidden" name="etapaId" value={etapa.id} />
                      <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                        Concluir →
                      </Button>
                    </form>
                  </>
                )}
                {etapa.status === "CONCLUIDA" && (
                  <form action={reabrirEtapa}>
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <input type="hidden" name="etapaId" value={etapa.id} />
                    <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                      ← Reabrir
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Entregas / versões</h2>
        <div className="space-y-2 mb-3">
          {projeto.entregas.map((entrega) => (
            <Card key={entrega.id} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Versão {entrega.versao}</span>
                <Badge variant={ENTREGA_VARIANT[entrega.status]}>{entrega.status}</Badge>
              </div>
              {entrega.link && (
                <a
                  href={entrega.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 underline break-all"
                >
                  {entrega.link}
                </a>
              )}
              {entrega.comentarioCliente && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">&quot;{entrega.comentarioCliente}&quot;</p>
              )}
              {entrega.status === "EM_REVISAO" && (
                <div className="flex gap-2 mt-2">
                  <form action={atualizarStatusEntrega}>
                    <input type="hidden" name="id" value={entrega.id} />
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <input type="hidden" name="status" value="APROVADA" />
                    <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                      Marcar aprovada
                    </Button>
                  </form>
                  <form action={atualizarStatusEntrega}>
                    <input type="hidden" name="id" value={entrega.id} />
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <input type="hidden" name="status" value="REPROVADA" />
                    <Button type="submit" variant="ghost" className="text-xs px-2 py-1 text-red-600 dark:text-red-400">
                      Marcar reprovada
                    </Button>
                  </form>
                </div>
              )}
            </Card>
          ))}
        </div>
        <form action={criarEntrega} className="flex items-end gap-2">
          <input type="hidden" name="projetoId" value={projeto.id} />
          <div className="flex-1">
            <Label>Link da nova versão (Drive/WeTransfer/Frame.io)</Label>
            <Input name="link" placeholder="https://..." />
          </div>
          <Button type="submit" variant="secondary">
            Registrar nova versão
          </Button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Documentos</h2>
        <div className="space-y-2 mb-3">
          {projeto.documentos.map((doc) => (
            <Card key={doc.id} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">
                  {doc.nome} <span className="text-neutral-400 dark:text-neutral-500 text-xs">({DOCUMENTO_TIPO_LABEL[doc.tipo]})</span>
                </span>
                <Badge variant={DOCUMENTO_STATUS_VARIANT[doc.status]}>
                  {DOCUMENTO_STATUS_LABEL[doc.status]}
                </Badge>
              </div>
              {doc.link && (
                <a
                  href={doc.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 underline break-all"
                >
                  {doc.link}
                </a>
              )}
              {doc.conteudo && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-neutral-500 dark:text-neutral-400">Ver conteúdo</summary>
                  <pre className="whitespace-pre-wrap text-xs text-neutral-700 dark:text-neutral-300 font-sans mt-1 bg-neutral-50 dark:bg-neutral-900 p-2 rounded">
                    {doc.conteudo}
                  </pre>
                </details>
              )}
              {doc.status === "ASSINADO" && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Assinado por {doc.assinanteNome} em {formatData(doc.assinadoEm)} · IP {doc.assinanteIp}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                {doc.status === "RASCUNHO" && (
                  <>
                    <form action={enviarParaAssinatura}>
                      <input type="hidden" name="id" value={doc.id} />
                      <input type="hidden" name="projetoId" value={projeto.id} />
                      <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                        Enviar para assinatura
                      </Button>
                    </form>
                    <form action={deletarDocumento}>
                      <input type="hidden" name="id" value={doc.id} />
                      <input type="hidden" name="projetoId" value={projeto.id} />
                      <Button type="submit" variant="ghost" className="text-xs px-2 py-1 text-red-600 dark:text-red-400">
                        Remover
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </Card>
          ))}
          {projeto.documentos.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum documento ainda.</p>
          )}
        </div>

        {modelosDocumento.length > 0 && (
          <form action={gerarDocumento} className="flex items-end gap-2 mb-3">
            <input type="hidden" name="projetoId" value={projeto.id} />
            <div className="flex-1">
              <Label>Gerar a partir de um modelo</Label>
              <Select name="modeloDocumentoId" required>
                {modelosDocumento.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({DOCUMENTO_TIPO_LABEL[m.tipo]})
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Gerar documento
            </Button>
          </form>
        )}

        <details>
          <summary className="cursor-pointer text-sm text-neutral-500 dark:text-neutral-400">
            Ou adicionar só um link (documento já pronto em outro lugar)
          </summary>
          <form action={criarDocumentoLink} className="flex flex-wrap items-end gap-2 mt-2">
            <input type="hidden" name="projetoId" value={projeto.id} />
            <div className="flex-1 min-w-[160px]">
              <Label>Nome</Label>
              <Input name="nome" required />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select name="tipo" defaultValue="OUTRO">
                {Object.entries(DOCUMENTO_TIPO_LABEL).map(([valor, label]) => (
                  <option key={valor} value={valor}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label>Link</Label>
              <Input name="link" placeholder="https://..." required />
            </div>
            <Button type="submit" variant="secondary">
              Adicionar
            </Button>
          </form>
        </details>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Equipamento</h2>
        {projeto.plano && projeto.plano.templatesEquipamento.length > 0 && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            Sugerido pelo plano {projeto.plano.nome}:{" "}
            {projeto.plano.templatesEquipamento.map((t) => t.equipamento.nome).join(", ")}
          </p>
        )}
        <div className="space-y-2 mb-3">
          {projeto.alocacoesEquipamento.map((alocacao) => {
            const conflito = conflitoEquipamento(alocacao.equipamentoId, alocacao.data);
            return (
              <Card key={alocacao.id} className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{alocacao.equipamento.nome}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatData(alocacao.data)}</span>
                </div>
                {conflito && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    ⚠ também alocado em &quot;{conflito.projeto.nome}&quot; nesse dia
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <form action={alternarChecklistEquipamento}>
                    <input type="hidden" name="id" value={alocacao.id} />
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <input type="hidden" name="campo" value="checklistSaida" />
                    <Button
                      type="submit"
                      variant={alocacao.checklistSaida ? "secondary" : "ghost"}
                      className="text-xs px-2 py-1"
                    >
                      {alocacao.checklistSaida ? "✓ Saída conferida" : "Conferir saída"}
                    </Button>
                  </form>
                  <form action={alternarChecklistEquipamento}>
                    <input type="hidden" name="id" value={alocacao.id} />
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <input type="hidden" name="campo" value="checklistRetorno" />
                    <Button
                      type="submit"
                      variant={alocacao.checklistRetorno ? "secondary" : "ghost"}
                      className="text-xs px-2 py-1"
                    >
                      {alocacao.checklistRetorno ? "✓ Retorno conferido" : "Conferir retorno"}
                    </Button>
                  </form>
                  <form action={removerAlocacaoEquipamento}>
                    <input type="hidden" name="id" value={alocacao.id} />
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <Button type="submit" variant="ghost" className="text-xs px-2 py-1 text-red-600 dark:text-red-400">
                      Remover
                    </Button>
                  </form>
                </div>
              </Card>
            );
          })}
          {projeto.alocacoesEquipamento.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum equipamento alocado ainda.</p>
          )}
        </div>
        <form action={alocarEquipamento} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="projetoId" value={projeto.id} />
          <div className="flex-1 min-w-[180px]">
            <Label>Equipamento</Label>
            <Select name="equipamentoId" required>
              {equipamentosDisponiveis.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nome} ({eq.categoria})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Data</Label>
            <Input name="data" type="date" required />
          </div>
          <Button type="submit" variant="secondary">
            Alocar
          </Button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Equipe</h2>
        {projeto.plano && projeto.plano.templatesEquipe.length > 0 && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            Sugerido pelo plano {projeto.plano.nome}:{" "}
            {projeto.plano.templatesEquipe.map((t) => `${t.quantidade}x ${t.funcao}`).join(", ")}
          </p>
        )}
        <div className="space-y-2 mb-3">
          {projeto.escalas.map((escala) => {
            const conflito = conflitoProfissional(escala.profissionalId, escala.data);
            return (
              <Card key={escala.id} className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {escala.profissional.nome} — {escala.funcao}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatData(escala.data)}</span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {escala.cache != null ? formatMoeda(escala.cache) : "sem cachê lançado"}
                </p>
                {conflito && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    ⚠ também escalado em &quot;{conflito.projeto.nome}&quot; nesse dia
                  </p>
                )}
                <form action={removerEscala} className="mt-1">
                  <input type="hidden" name="id" value={escala.id} />
                  <input type="hidden" name="projetoId" value={projeto.id} />
                  <Button type="submit" variant="ghost" className="text-xs px-2 py-1 text-red-600 dark:text-red-400">
                    Remover
                  </Button>
                </form>
              </Card>
            );
          })}
          {projeto.escalas.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Ninguém escalado ainda.</p>
          )}
        </div>
        <form action={criarEscala} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="projetoId" value={projeto.id} />
          <div className="flex-1 min-w-[160px]">
            <Label>Profissional</Label>
            <Select name="profissionalId" required>
              {profissionaisDisponiveis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.funcao})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <Label>Função nesta escala</Label>
            <Input name="funcao" required />
          </div>
          <div>
            <Label>Data</Label>
            <Input name="data" type="date" required />
          </div>
          <div className="w-32">
            <Label>Cachê (R$)</Label>
            <Input name="cache" type="number" step="1" />
          </div>
          <Button type="submit" variant="secondary">
            Escalar
          </Button>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Financeiro do projeto</h2>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="p-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Recebido</p>
            <p className="font-semibold">{formatMoeda(totalRecebido)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Custos</p>
            <p className="font-semibold">{formatMoeda(totalCustos)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Margem</p>
            <p className={`font-semibold ${margem < 0 ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
              {formatMoeda(margem)}
            </p>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold mb-2">
              Recebimentos ({formatMoeda(totalPrevisto)} previsto)
            </h3>
            <div className="space-y-2 mb-3">
              {projeto.recebimentos.map((r) => (
                <Card key={r.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{formatMoeda(r.valor)}</span>
                    <Badge variant={RECEBIMENTO_VARIANT[r.status]}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    vencimento {formatData(r.vencimento)} {r.formaPagamento && `· ${r.formaPagamento}`}
                  </p>
                  {r.status !== "PAGO" && (
                    <form action={atualizarRecebimento} className="mt-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="projetoId" value={projeto.id} />
                      <input type="hidden" name="status" value="PAGO" />
                      <Button type="submit" variant="secondary" className="text-xs px-2 py-1">
                        Marcar pago
                      </Button>
                    </form>
                  )}
                </Card>
              ))}
            </div>
            <form action={criarRecebimento} className="space-y-2">
              <input type="hidden" name="projetoId" value={projeto.id} />
              <div className="grid grid-cols-2 gap-2">
                <Input name="valor" type="number" step="1" placeholder="Valor" required />
                <Input name="vencimento" type="date" required />
              </div>
              <Input name="formaPagamento" placeholder="Forma de pagamento (opcional)" />
              <Button type="submit" variant="secondary" className="w-full">
                Adicionar parcela
              </Button>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Custos</h3>
            <div className="space-y-2 mb-3">
              {projeto.custos.map((c) => (
                <Card key={c.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {c.tipo} — {formatMoeda(c.valor)}
                    </span>
                  </div>
                  {c.descricao && <p className="text-xs text-neutral-500 dark:text-neutral-400">{c.descricao}</p>}
                  {c.dataPrevista && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Previsto para {formatData(c.dataPrevista)}</p>
                  )}
                  <form action={deletarCusto} className="mt-1">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="projetoId" value={projeto.id} />
                    <Button type="submit" variant="ghost" className="text-xs px-2 py-1 text-red-600 dark:text-red-400">
                      Remover
                    </Button>
                  </form>
                </Card>
              ))}
            </div>
            <form action={criarCusto} className="space-y-2">
              <input type="hidden" name="projetoId" value={projeto.id} />
              <Input name="tipo" placeholder="Tipo (cachê, equipamento, transporte...)" required />
              <Input name="valor" type="number" step="1" placeholder="Valor" required />
              <Input name="descricao" placeholder="Descrição (opcional)" />
              <div>
                <Label>Data prevista (opcional)</Label>
                <Input name="dataPrevista" type="date" />
              </div>
              <Button type="submit" variant="secondary" className="w-full">
                Adicionar custo
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
