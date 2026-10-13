import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ROTAS_ADMIN = ["/catalogo"];
const ROTAS_PUBLICAS = ["/login"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  if (ROTAS_PUBLICAS.some((r) => nextUrl.pathname.startsWith(r))) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (
    ROTAS_ADMIN.some((r) => nextUrl.pathname.startsWith(r)) &&
    role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (nextUrl.pathname.startsWith("/portal") && role !== "CLIENTE") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
