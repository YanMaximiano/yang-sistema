import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader, Card, Input, Select, Button, Badge, Label } from "@/components/ui";
import { createUsuario, updateUsuario, alternarAtivoUsuario } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  EQUIPE: "Equipe",
  FREELANCER: "Freelancer",
};

export default async function UsuariosPage() {
  const session = await auth();
  const meuId = session?.user.id;

  const usuarios = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "EQUIPE", "FREELANCER"] } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Login da equipe interna e freelancers (clientes têm acesso próprio via a ficha do cliente)"
      />

      <Card className="p-4 mb-8">
        <p className="text-sm font-medium mb-2">Novo usuário</p>
        <form action={createUsuario} className="grid md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Nome</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>Senha</Label>
            <Input name="senha" type="text" required placeholder="defina uma senha" />
          </div>
          <div>
            <Label>Perfil</Label>
            <Select name="role" defaultValue="EQUIPE">
              <option value="ADMIN">Admin</option>
              <option value="EQUIPE">Equipe</option>
              <option value="FREELANCER">Freelancer</option>
            </Select>
          </div>
          <Button type="submit" className="md:col-span-4">
            Criar usuário
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        {usuarios.map((u) => {
          const souEu = u.id === meuId;
          return (
            <Card key={u.id} className="p-4">
              {souEu ? (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium">
                      {u.name} <span className="text-neutral-400 text-sm">(você)</span>
                    </p>
                    <p className="text-sm text-neutral-500">{u.email}</p>
                  </div>
                  <Badge variant="info">{ROLE_LABEL[u.role]}</Badge>
                </div>
              ) : (
                <form action={updateUsuario} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <div className="flex-1 min-w-[140px]">
                    <Label>Nome</Label>
                    <Input name="name" defaultValue={u.name} required />
                  </div>
                  <div className="min-w-[140px]">
                    <Label>E-mail</Label>
                    <Input value={u.email} disabled className="bg-neutral-50 text-neutral-500" />
                  </div>
                  <div>
                    <Label>Perfil</Label>
                    <Select name="role" defaultValue={u.role}>
                      <option value="ADMIN">Admin</option>
                      <option value="EQUIPE">Equipe</option>
                      <option value="FREELANCER">Freelancer</option>
                    </Select>
                  </div>
                  <div className="min-w-[140px]">
                    <Label>Nova senha (opcional)</Label>
                    <Input name="senha" type="text" placeholder="deixe em branco p/ manter" />
                  </div>
                  <Button type="submit" variant="secondary">
                    Salvar
                  </Button>
                  {!u.ativo && <Badge variant="warning">Desativado</Badge>}
                  <Button
                    type="submit"
                    formAction={alternarAtivoUsuario}
                    variant={u.ativo ? "ghost" : "secondary"}
                    className={u.ativo ? "text-red-600" : ""}
                  >
                    {u.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </form>
              )}
            </Card>
          );
        })}
        {usuarios.length === 0 && (
          <p className="text-sm text-neutral-500">Nenhum usuário além de você ainda.</p>
        )}
      </div>
    </div>
  );
}
