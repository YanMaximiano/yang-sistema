import { auth, signOut, sessaoAindaValida } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENTE" || !(await sessaoAindaValida(session))) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-5 dark:border-neutral-800 md:px-12">
        <Link href="/portal" className="block">
          <span className="block text-[15px] font-extrabold tracking-[0.32em] text-neutral-900 dark:text-neutral-100">
            YANG
          </span>
          <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
            Portal do cliente
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-neutral-500 dark:text-neutral-400 md:block">{session.user.email}</p>
          <Link
            href="/portal/conta"
            className="text-xs font-semibold text-neutral-600 underline-offset-2 hover:underline dark:text-neutral-300"
          >
            Minha conta
          </Link>
          <ThemeToggle />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button type="submit" variant="secondary" className="text-xs">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 md:px-12 md:py-12">{children}</main>
    </div>
  );
}
