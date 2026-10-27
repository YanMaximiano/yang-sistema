import { auth, signOut } from "@/lib/auth";
import { acessoAtual } from "@/lib/acesso";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarNav } from "@/components/SidebarNav";
import { ROTAS_APP } from "@/lib/rotas";
import { listarAvisos, avisosVisiveis } from "@/lib/avisos";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const acesso = await acessoAtual();
  if (!session?.user || !acesso) redirect("/login");

  const totalAvisos = acesso.tem("avisos") ? avisosVisiveis(await listarAvisos(), acesso.tem).length : 0;
  const itens = ROTAS_APP.filter((item) => (item.modulo ? acesso.tem(item.modulo) : acesso.admin)).map((item) => ({
    href: item.href,
    label: item.label,
    badge: item.href === "/avisos" ? totalAvisos : 0,
  }));

  const sair = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <aside className="flex flex-col border-b border-neutral-200 dark:border-neutral-800 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-6 pb-2 pt-5 md:pb-6 md:pt-8">
          <Link href="/" className="block">
            <span className="block text-[15px] font-extrabold tracking-[0.32em] text-neutral-900 dark:text-neutral-100">
              YANG
            </span>
            <span className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400 md:block">
              Sistema de gestão
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/conta"
              title="Alterar minha senha"
              className="max-w-[9rem] truncate text-xs text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400 md:hidden"
            >
              {session.user.email}
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <SidebarNav itens={itens} />

        <div className="hidden border-t border-neutral-200 px-6 py-5 dark:border-neutral-800 md:block">
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{session.user.email}</p>
          <Link
            href="/conta"
            className="mt-1 block text-xs font-semibold text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
          >
            Alterar minha senha
          </Link>
          <form action={sair} className="mt-4">
            <Button type="submit" variant="secondary" className="w-full text-xs">
              Sair
            </Button>
          </form>
        </div>
        <form action={sair} className="border-t border-neutral-200 px-4 py-2 dark:border-neutral-800 md:hidden">
          <Button type="submit" variant="ghost" className="w-full text-xs">
            Sair
          </Button>
        </form>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-8 md:px-12 md:py-12">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
