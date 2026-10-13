import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { rotaPermitidaParaPerfil, type Role } from "@/lib/rotas";

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

  if (!rotaPermitidaParaPerfil(nextUrl.pathname, role)) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
