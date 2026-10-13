import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";

const NAV = [
  { href: "/", label: "Painel", roles: ["ADMIN", "EQUIPE", "FREELANCER"] },
  { href: "/catalogo", label: "Catálogo", roles: ["ADMIN"] },
  { href: "/clientes", label: "Clientes", roles: ["ADMIN", "EQUIPE"] },
  { href: "/propostas", label: "Propostas", roles: ["ADMIN", "EQUIPE"] },
  { href: "/projetos", label: "Projetos", roles: ["ADMIN", "EQUIPE", "FREELANCER"] },
  { href: "/calendario", label: "Calendário", roles: ["ADMIN", "EQUIPE", "FREELANCER"] },
  { href: "/financeiro", label: "Financeiro", roles: ["ADMIN"] },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const nav = NAV.filter((item) => item.roles.includes(role));

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="w-56 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
        <div className="px-4 py-5 border-b border-neutral-200">
          <p className="font-semibold text-neutral-900">Yang</p>
          <p className="text-xs text-neutral-500">Sistema de Gestão</p>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-neutral-200">
          <p className="text-xs text-neutral-500 truncate mb-2">{session.user.email}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="secondary" className="w-full text-xs">
              Sair
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-6 py-8 max-w-6xl">{children}</main>
    </div>
  );
}
