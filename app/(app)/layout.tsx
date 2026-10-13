import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { ROTAS_APP, type Role } from "@/lib/rotas";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  const nav = ROTAS_APP.filter((item) => item.roles.includes(role));

  return (
    <div className="flex flex-col md:flex-row min-h-screen flex-1">
      <aside className="w-full md:w-56 md:shrink-0 border-b md:border-b-0 md:border-r border-neutral-200 bg-white flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 md:py-5 md:border-b border-neutral-200">
          <div>
            <p className="font-semibold text-neutral-900">Yang</p>
            <p className="text-xs text-neutral-500 hidden md:block">Sistema de Gestão</p>
          </div>
          <p className="text-xs text-neutral-500 truncate md:hidden">{session.user.email}</p>
        </div>
        <nav className="flex md:flex-1 overflow-x-auto md:overflow-visible px-2 py-2 md:py-4 gap-1 md:gap-0 md:space-y-1 md:flex-col border-t md:border-t-0 border-neutral-100">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block px-4 py-4 border-t border-neutral-200">
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
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="md:hidden px-4 py-2 border-t border-neutral-100"
        >
          <Button type="submit" variant="ghost" className="w-full text-xs">
            Sair
          </Button>
        </form>
      </aside>
      <main className="flex-1 px-4 md:px-6 py-6 md:py-8 max-w-6xl w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
