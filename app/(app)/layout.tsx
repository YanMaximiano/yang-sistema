import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ROTAS_APP, type Role } from "@/lib/rotas";
import { listarAvisos } from "@/lib/avisos";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  const nav = ROTAS_APP.filter((item) => item.roles.includes(role));
  const totalAvisos = role === "ADMIN" || role === "EQUIPE" ? (await listarAvisos()).length : 0;

  return (
    <div className="flex flex-col md:flex-row min-h-screen flex-1">
      <aside className="w-full md:w-56 md:shrink-0 border-b md:border-b-0 md:border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 md:py-5 md:border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">Yang</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden md:block">
              Sistema de Gestão
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/conta"
              title="Alterar minha senha"
              className="text-xs text-neutral-500 dark:text-neutral-400 truncate md:hidden underline"
            >
              {session.user.email}
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex md:flex-1 overflow-x-auto md:overflow-visible px-2 py-2 md:py-4 gap-1 md:gap-0 md:space-y-1 md:flex-col border-t md:border-t-0 border-neutral-100 dark:border-neutral-800">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 whitespace-nowrap inline-flex items-center gap-2"
            >
              {item.label}
              {item.href === "/avisos" && totalAvisos > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs font-medium px-1">
                  {totalAvisos}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block px-4 py-4 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {session.user.email}
          </p>
          <Link
            href="/conta"
            className="block text-xs underline text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 mb-2"
          >
            Alterar minha senha
          </Link>
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
          className="md:hidden px-4 py-2 border-t border-neutral-100 dark:border-neutral-800"
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
