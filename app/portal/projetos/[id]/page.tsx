import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { PageHeader, Card, Badge, Button, Textarea, Label, Input } from "@/components/ui";
import { formatMoeda, formatData } from "@/lib/utils";
import { avaliarEntrega, assinarDocumento } from "../../actions";
import {
  ETAPA_STATUS_VARIANT as ETAPA_VARIANT,
  ENTREGA_STATUS_VARIANT as ENTREGA_VARIANT,
  RECEBIMENTO_STATUS_VARIANT as RECEBIMENTO_VARIANT,
  DOCUMENTO_STATUS_VARIANT,
  DOCUMENTO_STATUS_LABEL,
  DOCUMENTO_TIPO_LABEL,
} from "@/lib/status";

export default async function PortalProjetoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const clienteId = session?.user.clienteId;
  if (!clienteId) redirect("/login");

  const projeto = await prisma.projeto.findUnique({
    where: { id },
    include: {
      servico: true,
      etapas: { orderBy: { ordem: "asc" } },
      entregas: { orderBy: { versao: "desc" } },
      recebimentos: { orderBy: { vencimento: "asc" } },
      documentos: {
        where: { status: { in: ["AGUARDANDO_ASSINATURA", "ASSINADO"] } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!projeto || projeto.clienteId !== clienteId) notFound();

  return (
    <div className="pb-16 max-w-2xl">
      <PageHeader
        title={projeto.nome}
        description={`${projeto.servico.nome} · prazo ${formatData(projeto.prazoData)}`}
      />

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Andamento</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {projeto.etapas.map((etapa) => (
            <Card key={etapa.id} className="p-3 min-w-[160px] shrink-0">
              <Badge variant={ETAPA_VARIANT[etapa.status]} className="mb-2">
                {etapa.status === "CONCLUIDA"
                  ? "Concluída"
                  : etapa.status === "EM_ANDAMENTO"
                    ? "Em andamento"
                    : "Pendente"}
              </Badge>
              <p className="text-sm font-medium">{etapa.nome}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Entregas para aprovação</h2>
        <div className="space-y-3">
          {projeto.entregas.map((entrega) => (
            <Card key={entrega.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Versão {entrega.versao}</span>
                <Badge variant={ENTREGA_VARIANT[entrega.status]}>
                  {entrega.status === "EM_REVISAO"
                    ? "Aguardando sua avaliação"
                    : entrega.status === "APROVADA"
                      ? "Aprovada"
                      : "Reprovada"}
                </Badge>
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
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Seu comentário: &quot;{entrega.comentarioCliente}&quot;
                </p>
              )}
              {entrega.status === "EM_REVISAO" && (
                <form action={avaliarEntrega} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={entrega.id} />
                  <div>
                    <Label>Comentário (opcional)</Label>
                    <Textarea name="comentarioCliente" rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" name="status" value="APROVADA">
                      Aprovar
                    </Button>
                    <Button type="submit" name="status" value="REPROVADA" variant="danger">
                      Solicitar ajustes
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          ))}
          {projeto.entregas.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma entrega enviada ainda.</p>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Documentos</h2>
        <div className="space-y-3">
          {projeto.documentos.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
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
                <pre className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300 font-sans mt-1 bg-neutral-50 dark:bg-neutral-900 p-3 rounded max-h-64 overflow-y-auto">
                  {doc.conteudo}
                </pre>
              )}
              {doc.status === "ASSINADO" ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  Assinado por {doc.assinanteNome} em {formatData(doc.assinadoEm)}
                </p>
              ) : (
                <form action={assinarDocumento} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={doc.id} />
                  <div>
                    <Label>Digite seu nome completo</Label>
                    <Input name="nomeCompleto" required />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <input type="checkbox" name="concordo" required />
                    Li e concordo com o conteúdo acima
                  </label>
                  <Button type="submit">Assinar</Button>
                </form>
              )}
            </Card>
          ))}
          {projeto.documentos.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum documento para assinar ainda.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Financeiro</h2>
        <div className="space-y-2">
          {projeto.recebimentos.map((r) => (
            <Card key={r.id} className="p-3 flex items-center justify-between">
              <span className="text-sm">
                vencimento {formatData(r.vencimento)} {r.formaPagamento && `· ${r.formaPagamento}`}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{formatMoeda(r.valor)}</span>
                <Badge variant={RECEBIMENTO_VARIANT[r.status]}>{r.status}</Badge>
              </div>
            </Card>
          ))}
          {projeto.recebimentos.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhuma parcela lançada ainda.</p>
          )}
        </div>
      </section>
    </div>
  );
}
