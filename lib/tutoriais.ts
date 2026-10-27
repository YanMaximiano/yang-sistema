/**
 * Assistentes guiados do sistema: um por tela. A chave é gravada em User.tutoriaisVistos quando a
 * pessoa conclui ou pula; o roteiro de cada tela fica em lib/passos-assistente.ts.
 */
export const TUTORIAIS = [
  "calculadora",
  "painel",
  "catalogo",
  "servico",
  "clientes",
  "cliente",
  "propostas",
  "proposta-nova",
  "proposta",
  "projetos",
  "projeto-novo",
  "projeto",
  "calendario",
  "equipamentos",
  "equipe",
  "avisos",
  "financeiro",
  "usuarios",
  "conta",
  "portal",
  "portal-projeto",
  "portal-proposta",
] as const;
export type Tutorial = (typeof TUTORIAIS)[number];

export function ehTutorial(chave: string): chave is Tutorial {
  return (TUTORIAIS as readonly string[]).includes(chave);
}

// Um passo do assistente (texto pré-programado, sem IA). `alvo` é o seletor da parte da tela que
// fica em destaque (passos cujo alvo não existe na tela, por exemplo por falta de permissão, são
// omitidos); seções fechadas são abertas sozinhas. Em `titulo`, *palavra* vira a ênfase serifada.
export type Passo = {
  id: string;
  alvo?: string;
  titulo: string;
  texto: string[];
  formula?: string;
  exemplo?: string;
  dica?: string;
};
