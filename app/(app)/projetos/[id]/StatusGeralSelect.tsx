"use client";

import { atualizarStatusGeralProjeto } from "../actions";
import { Select } from "@/components/ui";

export function StatusGeralSelect({ projetoId, statusAtual }: { projetoId: string; statusAtual: string }) {
  return (
    <form action={atualizarStatusGeralProjeto} className="flex items-center gap-2">
      <input type="hidden" name="id" value={projetoId} />
      <Select
        name="statusGeral"
        defaultValue={statusAtual}
        onChange={(e) => e.target.form?.requestSubmit()}
      >
        <option value="ATIVO">Ativo</option>
        <option value="PAUSADO">Pausado</option>
        <option value="CONCLUIDO">Concluído</option>
        <option value="CANCELADO">Cancelado</option>
      </Select>
    </form>
  );
}
