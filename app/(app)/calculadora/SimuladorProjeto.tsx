"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Card, Input, Label, Button } from "@/components/ui";
import { formatMoeda } from "@/lib/utils";
import { simularProjeto, type ConfigCalculadora } from "@/lib/calculadora";

type LinhaCusto = { id: number; descricao: string; valor: string };

const n = (s: string) => {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : 0;
};

function Campo({
  label,
  value,
  onChange,
  hint,
  step = "any",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  step?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
      {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{hint}</p>}
    </div>
  );
}

function ListaDeCustos({
  titulo,
  ajuda,
  linhas,
  setLinhas,
  placeholder,
  atalhos = [],
}: {
  titulo: string;
  ajuda: string;
  linhas: LinhaCusto[];
  setLinhas: Dispatch<SetStateAction<LinhaCusto[]>>;
  placeholder: string;
  atalhos?: { descricao: string; valor: number }[];
}) {
  // forma funcional: dois cliques seguidos não perdem a linha anterior
  const adicionar = (descricao: string, valor: string) =>
    setLinhas((atual) => [
      ...atual,
      { id: Math.max(0, ...atual.map((l) => l.id)) + 1, descricao, valor },
    ]);
  const atualizar = (id: number, campo: "descricao" | "valor", v: string) =>
    setLinhas(linhas.map((l) => (l.id === id ? { ...l, [campo]: v } : l)));
  return (
    <div>
      <p className="text-sm font-medium">{titulo}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">{ajuda}</p>
      <div className="space-y-2">
        {linhas.map((l) => (
          <div key={l.id} className="flex gap-2">
            <Input
              value={l.descricao}
              onChange={(e) => atualizar(l.id, "descricao", e.target.value)}
              placeholder={placeholder}
              aria-label={`${titulo} — descrição`}
            />
            <Input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              className="w-32 shrink-0"
              value={l.valor}
              onChange={(e) => atualizar(l.id, "valor", e.target.value)}
              placeholder="R$"
              aria-label={`${titulo} — valor`}
            />
            <Button
              type="button"
              variant="ghost"
              className="px-2"
              onClick={() => setLinhas(linhas.filter((x) => x.id !== l.id))}
              aria-label="Remover linha"
            >
              ×
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        <Button
          type="button"
          variant="secondary"
          className="text-xs px-2 py-1"
          onClick={() => adicionar("", "")}
        >
          + Adicionar
        </Button>
        {atalhos.map((a) => (
          <Button
            key={a.descricao}
            type="button"
            variant="ghost"
            className="text-xs px-2 py-1 border border-dashed border-neutral-300 dark:border-neutral-700"
            onClick={() => adicionar(a.descricao, String(a.valor))}
          >
            + {a.descricao} ({formatMoeda(a.valor)})
          </Button>
        ))}
      </div>
    </div>
  );
}

function Linha({ nome, valor, destaque }: { nome: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-1.5 text-sm ${destaque ? "font-semibold" : ""}`}>
      <span className={destaque ? "" : "text-neutral-600 dark:text-neutral-400"}>{nome}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

export type KitDoProjeto = { id: string; nome: string; equipamentoIds: string[]; estragados: string[] };

export type EquipamentoDoProjeto = { id: string; nome: string; categoria: string; porDiaria: number };

export function SimuladorProjeto({
  config,
  custoHora,
  mesRotulo,
  equipamentos,
  kits,
  depreciacaoNaHora,
}: {
  config: ConfigCalculadora;
  custoHora: number;
  mesRotulo: string;
  equipamentos: EquipamentoDoProjeto[];
  kits: KitDoProjeto[];
  // true quando a hora base já embute a depreciação: o projeto não paga de novo
  depreciacaoNaHora: boolean;
}) {
  const [horas, setHoras] = useState("");
  const [km, setKm] = useState("");
  const [pessoas, setPessoas] = useState("");
  const [dias, setDias] = useState("");
  const [noites, setNoites] = useState("");
  const [trafego, setTrafego] = useState("");
  const [valorPretendido, setValorPretendido] = useState("");
  const [comissao, setComissao] = useState(false);
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [diariasUso, setDiariasUso] = useState("1");
  const alternar = (id: string) =>
    setEscolhidos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  const porDiariaEscolhidos = equipamentos
    .filter((e) => escolhidos.has(e.id))
    .reduce((acc, e) => acc + e.porDiaria, 0);
  // aplicar um kit marca todos os itens; se todos já estavam marcados, desmarca —
  // menos os itens que outro kit ativo também usa (o mesmo item pode estar em dois kits)
  const aplicarKit = (kit: KitDoProjeto) =>
    setEscolhidos((atual) => {
      const novo = new Set(atual);
      const todos = kit.equipamentoIds.every((id) => novo.has(id));
      if (!todos) {
        for (const id of kit.equipamentoIds) novo.add(id);
        return novo;
      }
      const protegidos = new Set(
        kits
          .filter((k) => k.id !== kit.id && k.equipamentoIds.length > 0 && k.equipamentoIds.every((id) => novo.has(id)))
          .flatMap((k) => k.equipamentoIds)
      );
      for (const id of kit.equipamentoIds) if (!protegidos.has(id)) novo.delete(id);
      return novo;
    });
  const categorias = Array.from(new Set(equipamentos.map((e) => e.categoria)));
  const [terceiros, setTerceiros] = useState<LinhaCusto[]>([]);
  const [outros, setOutros] = useState<LinhaCusto[]>([]);

  const soma = (ls: LinhaCusto[]) => ls.reduce((s, l) => s + n(l.valor), 0);

  const r = simularProjeto(config, custoHora, {
    horas: n(horas),
    km: n(km),
    pessoasEmCampo: n(pessoas),
    diasEmCampo: n(dias),
    noitesHospedagem: n(noites),
    trafegoPago: n(trafego),
    terceiros: soma(terceiros),
    equipamentos: depreciacaoNaHora ? 0 : porDiariaEscolhidos * n(diariasUso),
    outros: soma(outros),
    comissao,
    valorPretendido: n(valorPretendido) > 0 ? n(valorPretendido) : null,
  });

  const temDados = r.custoTotal > 0;
  const moeda = (v: number | null) => (v == null ? "—" : formatMoeda(v));

  return (
    <div className="grid lg:grid-cols-5 gap-4 items-start">
      <Card className="p-4 lg:col-span-3 space-y-5">
        <div className="grid sm:grid-cols-3 gap-3">
          <Campo
            label="Horas de trabalho"
            value={horas}
            onChange={setHoras}
            hint="Pré-produção + captação + edição + reuniões"
          />
          <Campo label="Km rodados" value={km} onChange={setKm} hint="Soma de ida e volta" />
          <Campo
            label="Tráfego pago (R$)"
            value={trafego}
            onChange={setTrafego}
            hint="Verba de anúncios deste projeto"
          />
          <Campo label="Pessoas em campo" value={pessoas} onChange={setPessoas} step="1" />
          <Campo label="Dias em campo" value={dias} onChange={setDias} step="1" hint="Para alimentação" />
          <Campo label="Noites de hospedagem" value={noites} onChange={setNoites} step="1" />
        </div>

        <div>
          <p className="text-sm font-medium">Equipamentos usados neste projeto</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
            {depreciacaoNaHora
              ? "A hora base já inclui a depreciação, então o projeto não paga os equipamentos de novo."
              : `Só o que for convocado paga depreciação: valor × ${String(config.depreciacaoPct).replace('.', ',')}% ao mês ÷ ${config.diasUsoMes} diárias de uso por mês, por diária.`}
          </p>
          {!depreciacaoNaHora && (
            <>
              <div className="max-w-xs mb-2">
                <Campo
                  label="Diárias de uso dos equipamentos"
                  value={diariasUso}
                  onChange={setDiariasUso}
                  step="1"
                  hint="Dias em que esse kit trabalha no projeto"
                />
              </div>
              {kits.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">Kits:</span>
                  {kits.map((k) => {
                    const ativo = k.equipamentoIds.length > 0 && k.equipamentoIds.every((id) => escolhidos.has(id));
                    return (
                      <Button
                        key={k.id}
                        type="button"
                        variant={ativo ? "primary" : "secondary"}
                        className="text-xs px-2 py-1"
                        onClick={() => aplicarKit(k)}
                        aria-pressed={ativo}
                      >
                        {k.nome}
                      </Button>
                    );
                  })}
                </div>
              )}
              {kits
                .filter((k) => k.estragados.length > 0)
                .map((k) => (
                  <p key={k.id} className="text-xs text-red-700 dark:text-red-400 mb-2">
                    {k.nome}: estragado e fora do custo — {k.estragados.join(", ")}.
                  </p>
                ))}
              <details className="rounded-md border border-neutral-200 dark:border-neutral-800">
                <summary className="cursor-pointer px-3 py-2 text-sm">
                  {escolhidos.size === 0
                    ? "Escolher equipamentos"
                    : `${escolhidos.size} equipamento(s): ${formatMoeda(porDiariaEscolhidos)} por diária`}
                </summary>
                <div className="max-h-72 overflow-y-auto px-3 pb-3 space-y-3">
                  {categorias.map((cat) => (
                    <div key={cat}>
                      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{cat}</p>
                      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                        {equipamentos
                          .filter((e) => e.categoria === cat)
                          .map((e) => (
                            <label key={e.id} className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={escolhidos.has(e.id)}
                                  onChange={() => alternar(e.id)}
                                />
                                <span className="truncate">{e.nome}</span>
                              </span>
                              <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums shrink-0">
                                {formatMoeda(e.porDiaria)}
                              </span>
                            </label>
                          ))}
                      </div>
                    </div>
                  ))}
                  {equipamentos.length === 0 && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum equipamento com valor cadastrado.</p>
                  )}
                </div>
              </details>
            </>
          )}
        </div>

        <ListaDeCustos
          titulo="Terceirizados"
          ajuda="Freelancers e fornecedores que você paga para este projeto. Gestor de tráfego terceirizado varia de R$ 500 a R$ 1.200 por cliente, conforme a complexidade."
          linhas={terceiros}
          setLinhas={setTerceiros}
          placeholder="Ex: Drone, editor, locução"
          atalhos={[
            { descricao: "Social media terceirizado", valor: 500 },
            { descricao: "Gestor de tráfego terceirizado", valor: 500 },
          ]}
        />
        <ListaDeCustos
          titulo="Outros custos diretos"
          ajuda="Aluguel de equipamento, locação, estacionamento, pedágio..."
          linhas={outros}
          setLinhas={setOutros}
          placeholder="Ex: Pedágio"
        />

        <label className="flex items-start gap-2 text-sm border-t border-neutral-200 dark:border-neutral-800 pt-4">
          <input
            type="checkbox"
            className="mt-1"
            checked={comissao}
            onChange={(e) => setComissao(e.target.checked)}
          />
          <span>
            Venda fechada pelo comercial (comissão de {config.comissaoPct}%)
            <span className="block text-xs text-neutral-500 dark:text-neutral-400">
              A comissão sai do preço cobrado, como o imposto, e aumenta o valor mínimo.
            </span>
          </span>
        </label>

        <div className="max-w-xs">
          <Campo
            label="Quanto pretende cobrar? (opcional)"
            value={valorPretendido}
            onChange={setValorPretendido}
            hint="Preencha para ver se esse valor dá lucro."
          />
        </div>
      </Card>

      <Card className="p-4 lg:col-span-2 lg:sticky lg:top-4">
        <p className="text-sm font-medium">Resultado</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          Custo/hora de {mesRotulo}
        </p>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <div>
            <Linha nome={`Horas (${n(horas) || 0}h × ${formatMoeda(custoHora)})`} valor={moeda(r.custoHoras)} />
            <Linha nome="Combustível e desgaste" valor={moeda(r.combustivel)} />
            <Linha nome="Alimentação" valor={moeda(r.alimentacao)} />
            <Linha nome="Hospedagem" valor={moeda(r.hospedagem)} />
            <Linha nome="Tráfego pago" valor={moeda(r.trafegoPago)} />
            <Linha nome="Terceirizados" valor={moeda(r.terceiros)} />
            <Linha nome="Depreciação dos equipamentos" valor={moeda(r.equipamentos)} />
            <Linha nome="Outros custos" valor={moeda(r.outros)} />
          </div>
          <Linha nome="Custo total do projeto" valor={moeda(r.custoTotal)} destaque />
        </div>

        <div className="mt-4 space-y-2">
          <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Preço mínimo (cobre custos, {config.impostoPct}% de imposto
              {comissao ? ` e ${config.comissaoPct}% de comissão` : ""}; lucro zero)
            </p>
            <p className="text-xl font-semibold text-amber-900 dark:text-amber-200">
              {temDados ? moeda(r.precoMinimo) : "—"}
            </p>
          </div>
          <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 p-3">
            <p className="text-xs text-green-800 dark:text-green-300">
              Preço sugerido (com {config.margemPct}% de margem)
            </p>
            <p className="text-xl font-semibold text-green-900 dark:text-green-200">
              {temDados ? moeda(r.precoSugerido) : "—"}
            </p>
          </div>
        </div>

        {r.lucro != null && (
          <div
            className={`mt-4 rounded-md border p-3 text-sm ${
              r.lucro < 0
                ? "bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-900 dark:text-red-200"
                : "bg-neutral-50 border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800"
            }`}
          >
            <p className="font-medium mb-1">
              Cobrando {formatMoeda(n(valorPretendido))}
            </p>
            <Linha nome="Lucro depois de imposto, comissão e custos" valor={moeda(r.lucro)} />
            <Linha nome="Margem real" valor={`${(r.margemReal ?? 0).toFixed(1)}%`} />
            {r.horaEfetiva != null && (
              <Linha nome="Sobra por hora trabalhada" valor={moeda(r.horaEfetiva)} />
            )}
            {r.lucro < 0 && (
              <p className="text-xs mt-1">Esse valor não cobre os custos do projeto.</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
