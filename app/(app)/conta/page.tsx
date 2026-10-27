import { auth } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { AlterarSenhaForm } from "@/components/AlterarSenhaForm";

export default async function ContaPage() {
  const session = await auth();

  return (
    <div>
      <PageHeader eyebrow="Conta" title="Minha *conta*" description={session?.user.email ?? undefined} />
      <Card className="p-5">
        <h2 className="font-medium mb-4">Alterar senha</h2>
        <AlterarSenhaForm />
      </Card>
    </div>
  );
}
