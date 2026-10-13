"use client";

import { useMemo, useState } from "react";
import { criarProjetoAvulso } from "../actions";
import { Button, Input, Label, Select, Card } from "@/components/ui";

type Servico = {
  id: string;
  nome: string;
  pilar: { nome: string };
  planos: { id: string; nome: string }[];
};

type Cliente = { id: string; nome: string };

export function NovoProjetoForm({ clientes, servicos }: { clientes: Cliente[]; servicos: Servico[] }) {
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? "");
  const servico = useMemo(() => servicos.find((s) => s.id === servicoId), [servicos, servicoId]);

  return (
    <Card className="p-5">
      <form action={criarProjetoAvulso} className="space-y-4">
        <div>
          <Label>Cliente</Label>
          <Select name="clienteId" required>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Serviço</Label>
          <Select name="servicoId" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.pilar.nome} — {s.nome}
              </option>
            ))}
          </Select>
        </div>
        {servico && servico.planos.length > 0 && (
          <div>
            <Label>Plano de referência (opcional)</Label>
            <Select name="planoId" defaultValue="" key={servico.id}>
              <option value="">— nenhum —</option>
              {servico.planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
            <p className="text-xs text-neutral-500 mt-1">
              Só serve para puxar as sugestões de equipe/equipamento desse plano no projeto.
            </p>
          </div>
        )}
        <div>
          <Label>Nome do projeto</Label>
          <Input name="nome" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Valor (R$)</Label>
            <Input name="valor" type="number" step="1" required />
          </div>
          <div>
            <Label>Prazo</Label>
            <Input name="prazoData" type="date" />
          </div>
        </div>
        <Button type="submit">Criar projeto</Button>
      </form>
    </Card>
  );
}
