import { auth } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { AssistenteDaTela } from "@/components/AssistenteDaTela";
import { AlterarSenhaForm } from "@/components/AlterarSenhaForm";

export default async function PortalContaPage() {
  const session = await auth();

  return (
    <div>
      <PageHeader eyebrow="Conta" title="Minha *conta*" description={session?.user.email ?? undefined} actions={<AssistenteDaTela chave="conta" />} />
      <Card id="trocar-senha" className="p-5">
        <h2 className="font-medium mb-4">Alterar senha</h2>
        <AlterarSenhaForm />
      </Card>
    </div>
  );
}
