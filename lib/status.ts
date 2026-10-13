import type { BadgeVariant } from "@/components/ui";
import type {
  StatusRelacionamento,
  StatusProposta,
  StatusGeralProjeto,
  StatusEtapa,
  StatusEntrega,
  StatusRecebimento,
  StatusDocumento,
  TipoDocumento,
} from "@/app/generated/prisma/client";

/**
 * Mapas de cor de badge por status, usados tanto nas telas do admin quanto
 * no portal do cliente — uma fonte única evita que as duas visões da mesma
 * entidade mostrem cores diferentes pro mesmo status.
 */

export const CLIENTE_STATUS_VARIANT: Record<StatusRelacionamento, BadgeVariant> = {
  LEAD: "neutral",
  ORCAMENTO_ENVIADO: "warning",
  CLIENTE_ATIVO: "success",
  CLIENTE_RECORRENTE: "info",
};

export const CLIENTE_STATUS_LABEL: Record<StatusRelacionamento, string> = {
  LEAD: "Lead",
  ORCAMENTO_ENVIADO: "Orçamento enviado",
  CLIENTE_ATIVO: "Cliente ativo",
  CLIENTE_RECORRENTE: "Cliente recorrente",
};

export const PROPOSTA_STATUS_VARIANT: Record<StatusProposta, BadgeVariant> = {
  ENVIADA: "neutral",
  NEGOCIACAO: "warning",
  APROVADA: "success",
  RECUSADA: "danger",
};

export const PROJETO_STATUS_VARIANT: Record<StatusGeralProjeto, BadgeVariant> = {
  ATIVO: "success",
  PAUSADO: "warning",
  CONCLUIDO: "neutral",
  CANCELADO: "danger",
};

export const ETAPA_STATUS_VARIANT: Record<StatusEtapa, BadgeVariant> = {
  PENDENTE: "neutral",
  EM_ANDAMENTO: "info",
  CONCLUIDA: "success",
};

export const ENTREGA_STATUS_VARIANT: Record<StatusEntrega, BadgeVariant> = {
  EM_REVISAO: "neutral",
  APROVADA: "success",
  REPROVADA: "danger",
};

export const RECEBIMENTO_STATUS_VARIANT: Record<StatusRecebimento, BadgeVariant> = {
  PENDENTE: "neutral",
  PAGO: "success",
  ATRASADO: "danger",
};

export const DOCUMENTO_STATUS_VARIANT: Record<StatusDocumento, BadgeVariant> = {
  RASCUNHO: "neutral",
  AGUARDANDO_ASSINATURA: "warning",
  ASSINADO: "success",
};

export const DOCUMENTO_STATUS_LABEL: Record<StatusDocumento, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_ASSINATURA: "Aguardando assinatura",
  ASSINADO: "Assinado",
};

export const DOCUMENTO_TIPO_LABEL: Record<TipoDocumento, string> = {
  CONTRATO: "Contrato",
  TERMO_USO_IMAGEM: "Termo de uso de imagem",
  BRIEFING: "Briefing",
  OUTRO: "Outro",
};
