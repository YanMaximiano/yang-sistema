import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      clienteId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    clienteId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    clienteId?: string | null;
  }
}
