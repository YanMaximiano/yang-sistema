import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROTEIROS } from "@/lib/passos-assistente";
import type { Tutorial } from "@/lib/tutoriais";
import { Assistente } from "@/components/Assistente";

/**
 * Botão "Assistente" de uma tela, para ficar em `actions` do PageHeader. Abre sozinho na primeira
 * visita de cada pessoa a essa tela (o "já viu" fica gravado no usuário) e pode ser chamado de
 * novo a qualquer momento. O roteiro de cada tela fica em lib/passos-assistente.ts.
 */
export async function AssistenteDaTela({ chave }: { chave: Tutorial }) {
  const session = await auth();
  if (!session?.user) return null;
  const usuario = await prisma.user.findUnique({ where: { id: session.user.id }, select: { tutoriaisVistos: true } });
  const roteiro = ROTEIROS[chave];

  return (
    <Assistente
      passos={roteiro.passos}
      jaViu={usuario?.tutoriaisVistos.includes(chave) ?? false}
      chave={chave}
      rotulo={roteiro.rotulo}
    />
  );
}
