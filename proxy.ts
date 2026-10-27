import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Role } from "@/lib/rotas";

const ROTAS_PUBLICAS = ["/login"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role as Role | undefined;

  if (ROTAS_PUBLICAS.some((r) => nextUrl.pathname.startsWith(r))) {
    return NextResponse.next();
  }

  if (!isLoggedIn || !role) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (nextUrl.pathname.startsWith("/portal")) {
    if (role !== "CLIENTE") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  if (role === "CLIENTE") {
    // cliente só acessa o portal, nunca as telas administrativas
    return NextResponse.redirect(new URL("/portal", nextUrl));
  }

  // equipe e freelancers: o que cada pessoa pode abrir é liberado pelo admin e conferido no banco
  // em cada página e ação (lib/acesso.ts) — o token daqui pode estar desatualizado.
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
