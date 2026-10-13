import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CLIENTE") redirect("/login");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-4 md:px-6 py-4">
        <Link href="/portal">
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">Yang</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Portal do Cliente</p>
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden md:block">
            {session.user.email}
          </p>
          <Link
            href="/portal/conta"
            className="text-xs underline text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
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
      <main className="flex-1 px-4 md:px-6 py-6 md:py-8 max-w-4xl w-full mx-auto">{children}</main>
    </div>
  );
}
