import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PageHeader, Card, Input, Select, Button, Badge, Label } from "@/components/ui";
import { createUsuario, updateUsuario, alternarAtivoUsuario } from "./actions";
import { exigirAdmin } from "@/lib/acesso";
import { MODULOS, modulosDoUsuario } from "@/lib/permissoes";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  EQUIPE: "Equipe",
  FREELANCER: "Freelancer",
};

export default async function UsuariosPage() {
  await exigirAdmin();
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
            <Input name="senha" type="text" required minLength={8} placeholder="defina uma senha (mín. 8)" />
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
          <p className="md:col-span-4 text-xs text-neutral-500 dark:text-neutral-400">
            As áreas liberadas começam pelo padrão do perfil. Depois de criar, abra &quot;Áreas liberadas&quot; do usuário
            para marcar ou desmarcar cada parte do sistema.
          </p>
        </form>
      </Card>

      <div className="space-y-2">
        {usuarios.map((u) => {
          const souEu = u.id === meuId;
          const liberadas = modulosDoUsuario(u);
          return (
            <Card key={u.id} className="p-4">
              {souEu ? (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium">
                      {u.name} <span className="text-neutral-400 dark:text-neutral-500 text-sm">(você)</span>
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{u.email}</p>
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
                    <Input value={u.email} disabled className="bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400" />
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
                    <Input name="senha" type="text" minLength={8} placeholder="deixe em branco p/ manter" />
                  </div>

                  {u.role === "ADMIN" ? (
                    <p className="w-full text-xs text-neutral-500 dark:text-neutral-400">
                      Admin acessa todas as áreas do sistema. Para limitar o acesso, troque o perfil para Equipe ou Freelancer
                      e marque as áreas.
                    </p>
                  ) : (
                    <details className="w-full" open={u.permissoesPersonalizadas}>
                      <summary className="text-sm cursor-pointer w-fit">
                        Áreas liberadas ({liberadas.length} de {MODULOS.length}){" "}
                        {u.permissoesPersonalizadas && <Badge variant="info">Personalizado</Badge>}
                      </summary>
                      <input type="hidden" name="editarModulos" value="1" />
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 mt-3">
                        {MODULOS.map((m) => (
                          <label key={m.chave} className="flex items-start gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              name="modulos"
                              value={m.chave}
                              defaultChecked={liberadas.includes(m.chave)}
                              className="mt-1"
                            />
                            <span>
                              <span className="font-medium">{m.rotulo}</span>
                              <span className="block text-xs text-neutral-500 dark:text-neutral-400">{m.descricao}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                        Clique em Salvar para aplicar. Vale na próxima página que a pessoa abrir. Voltar às marcações padrão
                        do perfil remove a personalização.
                      </p>
                    </details>
                  )}

                  <Button type="submit" variant="secondary">
                    Salvar
                  </Button>
                  {!u.ativo && <Badge variant="warning">Desativado</Badge>}
                  <Button
                    type="submit"
                    formAction={alternarAtivoUsuario}
                    variant={u.ativo ? "ghost" : "secondary"}
                    className={u.ativo ? "text-red-600 dark:text-red-400" : ""}
                  >
                    {u.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </form>
              )}
            </Card>
          );
        })}
        {usuarios.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum usuário além de você ainda.</p>
        )}
      </div>
    </div>
  );
}
