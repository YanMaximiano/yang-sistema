"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Button, Input, Label, Card } from "@/components/ui";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-neutral-900 mb-1">Yang — Sistema de Gestão</h1>
        <p className="text-sm text-neutral-500 mb-6">Entre com seu e-mail e senha.</p>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoFocus />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
