"use client";

import { useMemo, useState } from "react";
import { createProposta } from "../actions";
import { Button, Input, Label, Select, Card } from "@/components/ui";
import { formatFaixaValor, formatMoeda } from "@/lib/utils";

type Plano = {
  id: string;
  nome: string;
  valorMin: number | null;
  valorMax: number | null;
  prazoDias: number | null;
  entregas: string[];
};

type Adicional = { id: string; nome: string; valor: number | null };

type Servico = {
  id: string;
  nome: string;
  pilar: { nome: string };
  planos: Plano[];
  adicionais: Adicional[];
};

type Cliente = { id: string; nome: string };

export function NovaPropostaForm({
  clientes,
  servicos,
  clienteIdInicial,
}: {
  clientes: Cliente[];
  servicos: Servico[];
  clienteIdInicial?: string;
}) {
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? "");
  const servico = useMemo(() => servicos.find((s) => s.id === servicoId), [servicos, servicoId]);
  const [planoId, setPlanoId] = useState(servico?.planos[0]?.id ?? "");
  const plano = useMemo(() => servico?.planos.find((p) => p.id === planoId), [servico, planoId]);

  function aoTrocarServico(id: string) {
    setServicoId(id);
    const novoServico = servicos.find((s) => s.id === id);
    setPlanoId(novoServico?.planos[0]?.id ?? "");
  }

  return (
    <form action={createProposta} className="space-y-6 max-w-2xl">
      <div>
        <Label>Cliente</Label>
        <Select name="clienteId" defaultValue={clienteIdInicial} required>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Serviço</Label>
        <Select
          name="servicoId"
          value={servicoId}
          onChange={(e) => aoTrocarServico(e.target.value)}
        >
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.pilar.nome} — {s.nome}
            </option>
          ))}
        </Select>
      </div>

      {servico && (
        <div>
          <Label>Plano</Label>
          <Select name="planoId" value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
            {servico.planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} ({formatFaixaValor(p.valorMin, p.valorMax)})
              </option>
            ))}
          </Select>
        </div>
      )}

      {plano && (
        <Card className="p-4 bg-neutral-50 dark:bg-neutral-900">
          <p className="text-sm font-medium mb-2">Entregas do plano {plano.nome}</p>
          <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
            {plano.entregas.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Card>
      )}

      {servico && servico.adicionais.length > 0 && (
        <div>
          <Label>Adicionais</Label>
          <div className="space-y-1">
            {servico.adicionais.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="adicionais" value={a.id} />
                {a.nome} {a.valor != null && `(${formatMoeda(a.valor)})`}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Valor proposto (R$)</Label>
          <Input
            name="valorProposto"
            type="number"
            step="0.01"
            required
            defaultValue={plano?.valorMin ?? undefined}
            key={plano?.id}
          />
        </div>
        <div>
          <Label>Prazo proposto (dias)</Label>
          <Input
            name="prazoPropostoDias"
            type="number"
            defaultValue={plano?.prazoDias ?? undefined}
            key={`${plano?.id}-prazo`}
          />
        </div>
      </div>

      <Button type="submit">Criar proposta</Button>
    </form>
  );
}
