/** Assistentes guiados do sistema. A chave é gravada em User.tutoriaisVistos quando a pessoa conclui ou pula. */
export const TUTORIAIS = ["calculadora"] as const;
export type Tutorial = (typeof TUTORIAIS)[number];

export function ehTutorial(chave: string): chave is Tutorial {
  return (TUTORIAIS as readonly string[]).includes(chave);
}
