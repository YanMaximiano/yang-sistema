"use client";

import { useActionState } from "react";
import { login } from "./actions";
import { Button, Input, Label, Card } from "@/components/ui";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-12">
      <p className="mb-10 text-[15px] font-extrabold tracking-[0.32em] text-neutral-900 dark:text-neutral-100">YANG</p>
      <Card className="w-full max-w-sm p-9">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
          Sistema de gestão
        </p>
        <h1 className="mb-2 text-3xl font-extrabold leading-[1.08] tracking-tight text-neutral-900 dark:text-neutral-100">
          Bem-vindo de <span className="destaque">volta</span>
        </h1>
        <p className="mb-8 text-sm text-neutral-500 dark:text-neutral-400">Entre com seu e-mail e senha.</p>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoFocus />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
