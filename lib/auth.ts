import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/rotas";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string | undefined)?.trim();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (!user || !user.ativo) return null;

        const senhaValida = await bcrypt.compare(password, user.passwordHash);
        if (!senhaValida) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          clienteId: user.clienteId,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.clienteId = user.clienteId;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.clienteId = token.clienteId as string | null;
      }
      return session;
    },
  },
});

/**
 * O token de login vale por dias; as telas (layouts) conferem no banco se a pessoa ainda
 * está ativa e com o mesmo cargo, senão desativar alguém ou rebaixar um admin só teria
 * efeito no próximo login.
 */
export async function sessaoAindaValida(session: { user: { id: string; role: string } }) {
  const usuario = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ativo: true, role: true },
  });
  return !!usuario?.ativo && usuario.role === session.user.role;
}

/**
 * Toda Server Action de área restrita precisa chamar isso primeiro — a
 * proteção de rota em proxy.ts/lib/rotas.ts só filtra por pathname da
 * página, e o Next.js despacha uma Server Action pelo id da própria
 * action (Next-Action header), não pelo path que a renderizou. Sem essa
 * checagem aqui, qualquer usuário autenticado (inclusive CLIENTE) pode
 * chamar a action diretamente e pular a página que a esconderia.
 *
 * Confere o cargo/status contra o banco (não o token JWT): a sessão
 * fica válida por dias, então revogar acesso ou trocar o cargo de
 * alguém só surtiria efeito no próximo login se confiássemos no token.
 */
export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autorizado");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ativo: true, role: true },
  });
  if (!user?.ativo || !roles.includes(user.role as Role)) {
    throw new Error("Não autorizado");
  }
  return session;
}
