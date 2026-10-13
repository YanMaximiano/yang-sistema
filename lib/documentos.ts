import "server-only";
import { formatMoeda, formatData } from "@/lib/utils";

type DadosRenderizacao = {
  cliente: { nome: string; empresa: string | null };
  projeto: { nome: string; valor: number; prazoData: Date | null };
  servico: { nome: string };
};

/**
 * Substitui os placeholders {{...}} de um modelo de documento pelos dados
 * reais do projeto/cliente. Chamada só no momento de gerar o documento —
 * o resultado fica congelado (snapshot) em Documento.conteudo, então editar
 * o modelo depois não muda documentos já gerados.
 */
export function renderModeloDocumento(conteudo: string, dados: DadosRenderizacao): string {
  const valores: Record<string, string> = {
    "cliente.nome": dados.cliente.nome,
    "cliente.empresa": dados.cliente.empresa ?? "",
    "projeto.nome": dados.projeto.nome,
    "projeto.valor": formatMoeda(dados.projeto.valor),
    "projeto.prazoData": formatData(dados.projeto.prazoData),
    "servico.nome": dados.servico.nome,
    "data.hoje": formatData(new Date()),
  };

  return conteudo.replace(/{{\s*([\w.]+)\s*}}/g, (match, chave) => {
    return chave in valores ? valores[chave] : match;
  });
}
