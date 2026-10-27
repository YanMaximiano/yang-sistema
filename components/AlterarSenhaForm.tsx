"use client";

import { useActionState } from "react";
import { alterarMinhaSenha } from "@/app/(app)/conta/actions";
import { Button, Input, Label } from "@/components/ui";

export function AlterarSenhaForm() {
  const [estado, formAction, pending] = useActionState(alterarMinhaSenha, undefined);

  return (
    <form action={formAction} className="space-y-4 max-w-sm">
      <div>
        <Label htmlFor="atual">Senha atual</Label>
        <Input id="atual" name="atual" type="password" required autoComplete="current-password" />
      </div>
      <div>
        <Label htmlFor="nova">Nova senha</Label>
        <Input id="nova" name="nova" type="password" required minLength={8} autoComplete="new-password" />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Mínimo de 8 caracteres.</p>
      </div>
      <div>
        <Label htmlFor="confirmar">Confirmar nova senha</Label>
        <Input id="confirmar" name="confirmar" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      {estado?.erro && <p className="text-sm text-red-600 dark:text-red-400">{estado.erro}</p>}
      {estado?.ok && <p className="text-sm text-neutral-900 dark:text-neutral-100">Senha alterada com sucesso.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
