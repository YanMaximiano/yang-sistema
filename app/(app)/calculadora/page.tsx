import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Input, Select, Button, Badge, Label } from "@/components/ui";
import { formatMoeda } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import {
  CATEGORIAS_CUSTO_FIXO,
  configComPadrao,
  calcularCustoHora,
  depreciacaoMensalDe,
  depreciacaoPorDiaria,
  precoComMargem,
  resumoAporte,
  pontoDeEquilibrio,
  ESCOPOS,
  mesesAPartirDe,
  rotuloMes,
  valorDoMes,
  MES_VALIDO,
  type ConfigCalculadora,
} from "@/lib/calculadora";
import {
  salvarConfig,
  criarCustoFixo,
  atualizarCustoFixo,
  alternarAtivoCustoFixo,
  excluirCustoFixo,
  salvarValoresMensais,
  criarPessoaHoras,
  salvarPessoasHoras,
  excluirPessoaHoras,
  salvarEquipamentos,
  criarKit,
  excluirKit,
  salvarSalarios,
} from "./actions";
import { SimuladorProjeto } from "./SimuladorProjeto";
import { exigirModulo } from "@/lib/acesso";

function classificar(margem: number) {
  if (margem <= 10) return { label: "Apertado", variant: "danger" as const };
  if (margem <= 20) return { label: "Baixo", variant: "warning" as const };
  if (margem <= 30) return { label: "Saudável", variant: "info" as const };
  return { label: "Ótimo", variant: "success" as const };
}

function Secao({
  titulo,
  descricao,
  id,
  children,
}: {
  titulo: string;
  descricao?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-4">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {descricao && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 mb-3 max-w-3xl">{descricao}</p>
      )}
      {!descricao && <div className="mb-3" />}
      {children}
    </section>
  );
}

function CampoConfig({
  label,
  name,
  valor,
  hint,
  step = "any",
}: {
  label: string;
  name: string;
  valor: number;
  hint?: string;
  step?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input name={name} type="number" min="0" step={step} defaultValue={valor} required />
      {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{hint}</p>}
    </div>
  );
}

export default async function CalculadoraPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; deprec?: string }>;
}) {
  await exigirModulo("calculadora");
  const { mes: mesParam, deprec } = await searchParams;
  // padrão: a depreciação NÃO entra na hora; cada projeto paga só os equipamentos que usa
  const comDepreciacao = deprec === "1";
  const mesAtual = format(new Date(), "yyyy-MM");
  const mes = mesParam && MES_VALIDO.test(mesParam) ? mesParam : mesAtual;
  // os 6 meses a partir do atual; se o escolhido estiver fora, ele entra na lista
  const hrefCom = (m: string, comDeprec: boolean) => {
    const q = new URLSearchParams();
    if (m !== mesAtual) q.set("mes", m);
    if (comDeprec) q.set("deprec", "1");
    const qs = q.toString();
    return qs ? `/calculadora?${qs}` : "/calculadora";
  };
  const meses = mesesAPartirDe(mesAtual, 6);
  if (!meses.includes(mes)) meses.push(mes);
  meses.sort();

  const [configSalva, equipamentos, fixos, custosFixos, pessoasHoras, kits] = await Promise.all([
    prisma.configCalculadora.findUnique({ where: { id: "singleton" } }),
    prisma.equipamento.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, categoria: true, status: true, valorCompra: true, vidaUtilMeses: true },
      orderBy: [{ categoria: "asc" }, { nome: "asc" }],
    }),
    prisma.profissional.findMany({
      where: { tipo: "FIXO", ativo: true },
      select: { id: true, nome: true, funcao: true, salarioMensal: true },
      orderBy: { nome: "asc" },
    }),
    prisma.custoFixo.findMany({
      include: { meses: { select: { mes: true, valor: true } } },
      orderBy: [{ categoria: "asc" }, { nome: "asc" }],
    }),
    prisma.pessoaHoras.findMany({ where: { ativo: true }, orderBy: { createdAt: "asc" } }),
    prisma.kitEquipamento.findMany({
      include: { itens: { select: { equipamentoId: true } } },
      orderBy: { nome: "asc" },
    }),
  ]);

  const config: ConfigCalculadora = configComPadrao(configSalva);

  // equipamento estragado fica fora da depreciação, do simulador e dos kits: só aparece em aviso
  const estragados = equipamentos.filter((e) => e.status === "ESTRAGADO");
  const emUso = equipamentos.filter((e) => e.status !== "ESTRAGADO");
  const salarios = fixos.map((p) => p.salarioMensal ?? 0);
  // quem recebe salário em Equipe também gera horas (100% YANG, pois a folha entra inteira)
  const pessoasCalc = [
    ...pessoasHoras.map((p) => ({
      nome: p.nome,
      horasMes: p.horasMes,
      ocupacaoPct: p.ocupacaoPct,
      escopo: p.escopo,
    })),
    ...fixos
      .filter((p) => (p.salarioMensal ?? 0) > 0)
      .map((p) => ({
        nome: `${p.nome} (Equipe)`,
        horasMes: config.horasMensais,
        ocupacaoPct: config.ocupacaoPct,
        escopo: "YANG",
      })),
  ];
  const custosAtivos = custosFixos.filter((c) => c.ativo);
  const calcularDoMes = (m: string, cfg: ConfigCalculadora = config) =>
    calcularCustoHora(
      cfg,
      emUso,
      salarios,
      custosAtivos.map((c) => ({
        categoria: c.categoria,
        valorMensal: valorDoMes(c, m),
        escopo: c.escopo,
      })),
      { incluirDepreciacao: comDepreciacao, pessoas: pessoasCalc }
    );
  // quanto a hora mínima muda com a fatia da YANG e com a taxa de depreciação
  const RATEIOS = [50, 75, 100];
  // a taxa só mexe na hora base quando a depreciação é rateada nela
  const TAXAS = comDepreciacao
    ? Array.from(new Set([1, 1.6, 2, 2.8, config.depreciacaoPct])).sort((a, b) => a - b)
    : [config.depreciacaoPct];
  const sensibilidade = RATEIOS.map((rateio) => ({
    rateio,
    celulas: TAXAS.map((taxa) => {
      const r = calcularDoMes(mes, { ...config, rateioYangPct: rateio, depreciacaoPct: taxa });
      return { taxa, horaMinima: precoComMargem(r.custoHora, config.impostoPct, 0) };
    }),
  }));
  const resultado = calcularDoMes(mes);
  const aporte = resumoAporte(config, custosFixos);
  const equilibrio = pontoDeEquilibrio(config, resultado.custoMensalTotal, resultado.custoNegocioTotal);
  const previsao = meses.map((m) => {
    const r = calcularDoMes(m);
    return {
      mes: m,
      custoMensal: r.custoMensalTotal,
      custoHora: r.custoHora,
      horaMinima: precoComMargem(r.custoHora, config.impostoPct, 0),
      horaSugerida: precoComMargem(r.custoHora, config.impostoPct, config.margemPct),
    };
  });

  const horaMinima = precoComMargem(resultado.custoHora, config.impostoPct, 0);
  const horaSugerida = precoComMargem(resultado.custoHora, config.impostoPct, config.margemPct);
  const semValor = emUso.filter((e) => !e.valorCompra).length;
  const semSalario = fixos.filter((p) => !p.salarioMensal).length;
  const margens = [10, 20, 30, 40, 50];

  return (
    <div>
      <PageHeader
        title="Calculadora de custo/hora"
        description="Quanto a Yang precisa cobrar por hora para cobrir todos os custos e ainda ter lucro"
      />

      <nav className="flex flex-wrap items-center gap-2 mb-4" aria-label="Mês de referência">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">Mês de referência:</span>
        {meses.map((m) => (
          <Link
            key={m}
            href={hrefCom(m, comDepreciacao)}
            aria-current={m === mes ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm border ${
              m === mes
                ? "bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {rotuloMes(m)}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-neutral-500 dark:text-neutral-400">Depreciação dos equipamentos:</span>
        {[
          { rotulo: "Cobrada por projeto (só o que usa)", valor: false },
          { rotulo: "Rateada na hora", valor: true },
        ].map((o) => (
          <Link
            key={o.rotulo}
            href={hrefCom(mes, o.valor)}
            aria-current={o.valor === comDepreciacao ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm border ${
              o.valor === comDepreciacao
                ? "bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 dark:border-neutral-100"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {o.rotulo}
          </Link>
        ))}
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {comDepreciacao
            ? `Os ${formatMoeda(resultado.depreciacaoMensal)}/mês dos equipamentos em uso entram na hora, usados ou não em cada projeto.`
            : "A hora não leva depreciação: o simulador cobra só os equipamentos escolhidos em cada projeto."}
        </span>
      </div>

      {/* ---------- resultado ---------- */}
      {resultado.horasFaturaveis <= 0 && (
        <div className="mb-4 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-800 dark:text-amber-300">
          Nenhuma hora cobrável para a YANG: a hora mínima e a sugerida aparecem zeradas. Confira em Capacidade
          (horas e ocupação de cada pessoa) e o rateio da YANG em Parâmetros.
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card className="p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Custo mensal da agência</p>
          <p className="text-xl font-semibold">{formatMoeda(resultado.custoMensalTotal)}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {comDepreciacao ? "equipe + equipamentos + custos fixos" : "equipe + custos fixos (sem depreciação)"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Horas cobráveis por mês</p>
          <p className="text-xl font-semibold">{resultado.horasFaturaveis.toFixed(1).replace(".", ",")}h</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {resultado.capacidade
              .map((l) => `${l.nome}: ${l.horasYang.toFixed(1).replace(".", ",")}h`)
              .join(" · ")}
            {" — "}
            <a href="#capacidade" className="underline">
              ver capacidade
            </a>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Hora mínima (lucro zero)</p>
          <p className="text-xl font-semibold text-amber-700 dark:text-amber-400">
            {horaMinima == null ? "—" : formatMoeda(horaMinima)}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            custo {formatMoeda(resultado.custoHora)} + {config.impostoPct}% de imposto
          </p>
        </Card>
        <Card className="p-4 border-green-300 dark:border-green-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Hora sugerida ({config.margemPct}% de margem)
          </p>
          <p className="text-xl font-semibold text-green-700 dark:text-green-400">
            {horaSugerida == null ? "—" : formatMoeda(horaSugerida)}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            abaixo da mínima você paga para trabalhar
          </p>
        </Card>
      </div>

      {estragados.length > 0 && (
        <Card className="p-3 mb-4 border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-900 dark:text-red-200">
            <strong>{estragados.length} equipamento(s) estragado(s) fora do cálculo</strong> (sem depreciação e
            fora dos kits): {estragados.map((e) => e.nome).join(", ")}. Quando voltarem a funcionar, marque como
            disponível em Equipamentos.
          </p>
        </Card>
      )}

      {(semValor > 0 || semSalario > 0 || custosFixos.length === 0) && (
        <Card className="p-3 mb-4 border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            O cálculo ainda está incompleto:
            {semValor > 0 && ` ${semValor} equipamento(s) sem valor de compra;`}
            {semSalario > 0 && ` ${semSalario} profissional(is) fixo(s) sem salário;`}
            {custosFixos.length === 0 && " nenhum custo fixo cadastrado (energia, água, internet...);"} preencha
            nas seções abaixo.
          </p>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mb-10">
        <Card className="p-4">
          <p className="text-sm font-medium">De onde vem o custo mensal ({rotuloMes(mes)})</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            Só o que a YANG absorve: custos compartilhados entram com {config.rateioYangPct}% do valor.
          </p>
          {comDepreciacao && resultado.depreciacaoMensal > 0 && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 rounded-md bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2">
              Depreciação: patrimônio de {formatMoeda(resultado.patrimonioTotal)} dividido em{" "}
              <strong>{String(config.depreciacaoPct).replace(".", ",")}% ao mês</strong>
              {config.depreciacaoPct > 0 &&
                ` (cerca de ${(100 / config.depreciacaoPct).toFixed(1).replace(".", ",")} meses)`}
              , salvo itens com prazo próprio.{" "}
              <a href="#parametros" className="underline">
                Ajustar a taxa
              </a>
            </p>
          )}
          {resultado.composicao.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nada cadastrado ainda.</p>
          )}
          <div className="space-y-2.5">
            {resultado.composicao.map((l) => {
              const pct = resultado.custoMensalTotal > 0 ? (l.valor / resultado.custoMensalTotal) * 100 : 0;
              return (
                <div key={l.nome}>
                  <div className="flex justify-between text-sm">
                    <span>{l.nome}</span>
                    <span className="tabular-nums text-neutral-600 dark:text-neutral-400">
                      {formatMoeda(l.valor)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 mt-1">
                    <div
                      className="h-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4 overflow-x-auto">
          <p className="text-sm font-medium">Valor da hora por margem de lucro</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            Já com {config.impostoPct}% de imposto. A margem é sobre o preço cobrado.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4 font-medium">Margem</th>
                <th className="py-2 pr-4 font-medium">Valor/hora</th>
                <th className="py-2 pr-4 font-medium">Lucro/hora</th>
                <th className="py-2 font-medium">Avaliação</th>
              </tr>
            </thead>
            <tbody>
              {margens.map((m) => {
                const preco = precoComMargem(resultado.custoHora, config.impostoPct, m);
                const c = classificar(m);
                return (
                  <tr key={m} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                    <td className="py-2 pr-4">{m}%</td>
                    <td className="py-2 pr-4 tabular-nums">{preco == null ? "—" : formatMoeda(preco)}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {preco == null ? "—" : formatMoeda(preco * (m / 100))}
                    </td>
                    <td className="py-2">
                      <Badge variant={c.variant}>{c.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <Secao
        titulo="O que mais pesa na hora mínima"
        descricao={`Hora mínima (lucro zero, com ${config.impostoPct}% de imposto) em ${rotuloMes(mes)} conforme a fatia da YANG nos custos e nas horas compartilhadas${comDepreciacao ? " e a taxa de depreciação dos equipamentos" : ""}. A célula em destaque é o cenário atual.`}
      >
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4 font-medium">Fatia da YANG no compartilhado</th>
                {TAXAS.map((v) => (
                  <th key={v} className="py-2 pr-4 font-medium text-right">
                    {comDepreciacao ? `Depreciação ${String(v).replace(".", ",")}% ao mês` : "Hora mínima"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensibilidade.map((linha) => (
                <tr key={linha.rateio} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <td className="py-2 pr-4">{linha.rateio}%</td>
                  {linha.celulas.map((c) => {
                    const atual = linha.rateio === config.rateioYangPct && c.taxa === config.depreciacaoPct;
                    return (
                      <td
                        key={c.taxa}
                        className={`py-2 pr-4 text-right tabular-nums ${
                          atual ? "font-semibold bg-neutral-100 dark:bg-neutral-800" : ""
                        }`}
                      >
                        {c.horaMinima == null ? "—" : formatMoeda(c.horaMinima)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3 max-w-3xl">
            Quanto mais tempo e custo compartilhado a YANG assume, mais horas ela tem para diluir o que já paga
            (custos só dela{comDepreciacao ? " e equipamentos" : ""}), e a hora cai. A fatia vale igual para custos e horas.
          </p>
        </Card>
      </Secao>

      {/* ---------- orçamento do lançamento ---------- */}
      <Secao
        titulo={`Orçamento do lançamento (aporte de ${formatMoeda(aporte.aporteTotal)})`}
        descricao="O que o plano prevê gastar com o dinheiro do investidor, mês a mês. Marque 'Sai do aporte' nos custos que o aporte paga (em Custos fixos mensais) e os valores de cada mês entram aqui."
      >
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4 font-medium">Linha do plano</th>
                {aporte.meses.map((m) => (
                  <th key={m} className="py-2 pr-4 font-medium text-right">
                    {rotuloMes(m)}
                  </th>
                ))}
                <th className="py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {aporte.linhas.map((l) => (
                <tr key={l.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 pr-4">{l.nome}</td>
                  {l.valores.map((v, i) => (
                    <td key={i} className="py-2 pr-4 text-right tabular-nums">
                      {v > 0 ? formatMoeda(v) : "—"}
                    </td>
                  ))}
                  <td className="py-2 text-right tabular-nums">{formatMoeda(l.total)}</td>
                </tr>
              ))}
              {aporte.linhas.length === 0 && (
                <tr>
                  <td colSpan={aporte.meses.length + 2} className="py-3 text-neutral-500 dark:text-neutral-400">
                    Nenhum custo marcado como “sai do aporte”.
                  </td>
                </tr>
              )}
              <tr className="font-semibold">
                <td className="py-2 pr-4">Planejado</td>
                {aporte.totaisPorMes.map((v, i) => (
                  <td key={i} className="py-2 pr-4 text-right tabular-nums">
                    {formatMoeda(v)}
                  </td>
                ))}
                <td className="py-2 text-right tabular-nums">{formatMoeda(aporte.planejado)}</td>
              </tr>
            </tbody>
          </table>
          <div
            className={`mt-4 rounded-md border p-3 text-sm ${
              aporte.saldo < 0
                ? "bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-900 dark:text-red-200"
                : "bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-900 dark:text-green-200"
            }`}
          >
            {aporte.saldo < 0 ? (
              <>
                O plano gasta <strong>{formatMoeda(aporte.planejado)}</strong> e o aporte é de{" "}
                <strong>{formatMoeda(aporte.aporteTotal)}</strong>: faltam{" "}
                <strong>{formatMoeda(-aporte.saldo)}</strong>. Esse valor precisa vir de vendas
                reinvestidas, de corte nas linhas acima ou de um aporte extra.
              </>
            ) : (
              <>
                O plano gasta <strong>{formatMoeda(aporte.planejado)}</strong> de{" "}
                <strong>{formatMoeda(aporte.aporteTotal)}</strong>: sobram{" "}
                <strong>{formatMoeda(aporte.saldo)}</strong> do aporte.
              </>
            )}
          </div>
        </Card>
      </Secao>

      <Secao
        titulo={`Ponto de equilíbrio (${rotuloMes(mes)})`}
        descricao="Quanto é preciso faturar no mês só para empatar, já descontando o imposto. Não inclui lucro nem comissão."
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">YANG precisa faturar</p>
            <p className="text-xl font-semibold">
              {equilibrio.faturamentoYang == null ? "—" : formatMoeda(equilibrio.faturamentoYang)}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              custo da produtora {formatMoeda(resultado.custoMensalTotal)} + {config.impostoPct}% de imposto
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Casamentos por mês ({formatMoeda(config.ticketCasamento)} cada)
            </p>
            <p className="text-xl font-semibold">
              {equilibrio.casamentosYang == null ? "—" : equilibrio.casamentosYang.toFixed(1).replace(".", ",")}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              só para pagar a produtora; troque o ticket médio em Parâmetros
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">As duas frentes juntas</p>
            <p className="text-xl font-semibold">
              {equilibrio.faturamentoNegocio == null ? "—" : formatMoeda(equilibrio.faturamentoNegocio)}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              YANG + perfil + infoprodutos: custo de {formatMoeda(resultado.custoNegocioTotal)} por mês
            </p>
          </Card>
        </div>
      </Secao>

      <Secao
        titulo="Custo/hora mês a mês"
        descricao="Salários e pró-labore mudam de um mês para o outro; aqui você vê o efeito disso na hora. Edite os valores de cada mês em Custos fixos mensais."
      >
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4 font-medium">Mês</th>
                <th className="py-2 pr-4 font-medium">Custo mensal</th>
                <th className="py-2 pr-4 font-medium">Custo/hora</th>
                <th className="py-2 pr-4 font-medium">Hora mínima</th>
                <th className="py-2 font-medium">Hora sugerida</th>
              </tr>
            </thead>
            <tbody>
              {previsao.map((l) => (
                <tr
                  key={l.mes}
                  className={`border-b border-neutral-100 dark:border-neutral-800 last:border-0 ${
                    l.mes === mes ? "font-medium" : ""
                  }`}
                >
                  <td className="py-2 pr-4">{rotuloMes(l.mes)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatMoeda(l.custoMensal)}</td>
                  <td className="py-2 pr-4 tabular-nums">{formatMoeda(l.custoHora)}</td>
                  <td className="py-2 pr-4 tabular-nums">{l.horaMinima == null ? "—" : formatMoeda(l.horaMinima)}</td>
                  <td className="py-2 tabular-nums">{l.horaSugerida == null ? "—" : formatMoeda(l.horaSugerida)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Secao>

      {/* ---------- simulador ---------- */}
      <Secao
        titulo="Simulador de projeto"
        descricao="Some as horas e os custos diretos (gasolina, hospedagem, alimentação, terceiros, tráfego e os equipamentos que o projeto usa) para saber o menor valor que vale a pena cobrar. Equipamento que não for convocado não entra na conta."
      >
        <SimuladorProjeto
          config={config}
          custoHora={resultado.custoHora}
          mesRotulo={rotuloMes(mes)}
          depreciacaoNaHora={comDepreciacao}
          kits={kits.map((k) => ({
            id: k.id,
            nome: k.nome,
            // item sem valor de compra ou estragado não aparece no simulador: fora do kit também
            equipamentoIds: k.itens
              .map((i) => i.equipamentoId)
              .filter((id) => emUso.some((e) => e.id === id && (e.valorCompra ?? 0) > 0)),
            estragados: estragados
              .filter((e) => k.itens.some((i) => i.equipamentoId === e.id))
              .map((e) => e.nome),
          }))}
          equipamentos={emUso
            .filter((e) => (e.valorCompra ?? 0) > 0)
            .map((e) => ({
              id: e.id,
              nome: e.nome,
              categoria: e.categoria,
              porDiaria: depreciacaoPorDiaria(e, config),
            }))}
        />
      </Secao>

      {/* ---------- dados de base ---------- */}
      <Secao
        id="parametros"
        titulo="Parâmetros"
        descricao="Estes números alimentam tudo acima. Os valores iniciais são estimativas — troque pelos da Yang."
      >
        <Card className="p-4">
          <form action={salvarConfig} className="space-y-5">
            <div>
              <p className="text-sm font-medium mb-2">Tempo e impostos</p>
              <div className="grid sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <CampoConfig label="Horas/mês por pessoa" name="horasMensais" valor={config.horasMensais} />
                <CampoConfig
                  label="Pessoas (se não houver lista)"
                  name="pessoasFaturaveis"
                  valor={config.pessoasFaturaveis}
                  step="1"
                  hint="Só vale sem ninguém em Capacidade"
                />
                <CampoConfig
                  label="Ocupação (%)"
                  name="ocupacaoPct"
                  valor={config.ocupacaoPct}
                  hint="Horas que viram trabalho cobrado"
                />
                <CampoConfig label="Imposto (%)" name="impostoPct" valor={config.impostoPct} />
                <CampoConfig
                  label="Margem alvo (%)"
                  name="margemPct"
                  valor={config.margemPct}
                  hint="Sobre o preço"
                />
                <CampoConfig
                  label="Comissão de venda (%)"
                  name="comissaoPct"
                  valor={config.comissaoPct}
                  hint="Comercial: sobre cada venda que fecha"
                />
                <CampoConfig
                  label="Encargos s/ salário (%)"
                  name="encargosPct"
                  valor={config.encargosPct}
                  hint="CLT ≈ 70%; PJ = 0"
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Equipamentos e estrada</p>
              <div className="grid sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <CampoConfig
                  label="Diárias de uso por mês"
                  name="diasUsoMes"
                  valor={config.diasUsoMes}
                  hint="Divide a depreciação do equipamento"
                />
                <CampoConfig
                  label="Depreciação (% ao mês)"
                  name="depreciacaoPct"
                  valor={config.depreciacaoPct}
                  hint="% do valor por mês; itens com prazo próprio usam o prazo"
                />
                <CampoConfig label="Gasolina (R$/litro)" name="precoCombustivel" valor={config.precoCombustivel} />
                <CampoConfig label="Consumo (km/litro)" name="consumoKmL" valor={config.consumoKmL} />
                <CampoConfig
                  label="Desgaste (R$/km)"
                  name="desgasteKm"
                  valor={config.desgasteKm}
                  hint="Pneus, óleo, manutenção"
                />
                <CampoConfig
                  label="Alimentação (R$/pessoa/dia)"
                  name="alimentacaoDia"
                  valor={config.alimentacaoDia}
                />
                <CampoConfig
                  label="Hospedagem (R$/pessoa/noite)"
                  name="diariaHospedagem"
                  valor={config.diariaHospedagem}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Rateio e lançamento</p>
              <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <CampoConfig
                  label="Rateio p/ YANG (%)"
                  name="rateioYangPct"
                  valor={config.rateioYangPct}
                  hint="Parte dos custos compartilhados"
                />
                <CampoConfig
                  label="Ticket de casamento (R$)"
                  name="ticketCasamento"
                  valor={config.ticketCasamento}
                />
                <CampoConfig label="Aporte do investidor (R$)" name="aporteTotal" valor={config.aporteTotal} />
                <div>
                  <Label>Aporte começa em</Label>
                  <Input name="aporteInicio" type="month" defaultValue={config.aporteInicio} required />
                </div>
                <CampoConfig
                  label="Meses do aporte"
                  name="aporteMeses"
                  valor={config.aporteMeses}
                  step="1"
                />
              </div>
            </div>
            <Button type="submit">Salvar parâmetros</Button>
          </form>
        </Card>
      </Secao>

      <Secao
        titulo="Custos fixos mensais"
        descricao="Tudo o que a agência paga todo mês, mesmo sem projeto: energia, água, internet, aluguel, softwares, tráfego pago, contador. Se a conta varia, use a média dos últimos meses."
      >
        <Card className="p-4 mb-3">
          <form action={criarCustoFixo} className="grid md:grid-cols-4 gap-3 items-end">
            <div>
              <Label>Nome</Label>
              <Input name="nome" required placeholder="Ex: Conta de luz" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select name="categoria" defaultValue="Outros">
                {CATEGORIAS_CUSTO_FIXO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Valor mensal (R$)</Label>
              <Input name="valorMensal" type="number" min="0" step="0.01" required />
            </div>
            <div>
              <Label>Pertence a</Label>
              <Select name="escopo" defaultValue="YANG">
                {ESCOPOS.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.rotulo}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" name="doAporte" /> Sai do aporte do investidor
            </label>
            <Button type="submit">Adicionar</Button>
          </form>
        </Card>
        <div className="space-y-2">
          {custosFixos.map((c) => (
            <Card key={c.id} className="p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium">
                    {c.nome} {!c.ativo && <span className="text-neutral-400 dark:text-neutral-500">(desativado)</span>}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {c.categoria} · {ESCOPOS.find((e) => e.valor === c.escopo)?.rotulo ?? c.escopo}
                    {c.doAporte && " · sai do aporte"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm tabular-nums">
                    {formatMoeda(valorDoMes(c, mes))}/mês
                    {c.meses.some((x) => x.mes === mes) && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400"> ({rotuloMes(mes)})</span>
                    )}
                  </span>
                  <form action={alternarAtivoCustoFixo}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                      {c.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </form>
                  <form action={excluirCustoFixo}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                      Excluir
                    </Button>
                  </form>
                </div>
              </div>
              <details className="mt-2">
                <summary className="text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer w-fit">Editar</summary>
                <form action={atualizarCustoFixo} className="grid md:grid-cols-4 gap-3 items-end mt-2">
                  <input type="hidden" name="id" value={c.id} />
                  <div>
                    <Label>Nome</Label>
                    <Input name="nome" defaultValue={c.nome} required />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select name="categoria" defaultValue={c.categoria}>
                      {[...new Set<string>([...CATEGORIAS_CUSTO_FIXO, c.categoria])].map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Valor mensal (R$)</Label>
                    <Input name="valorMensal" type="number" min="0" step="0.01" defaultValue={c.valorMensal} required />
                  </div>
                  <div>
                    <Label>Pertence a</Label>
                    <Select name="escopo" defaultValue={c.escopo}>
                      {ESCOPOS.map((e) => (
                        <option key={e.valor} value={e.valor}>
                          {e.rotulo}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-sm pb-2">
                    <input type="checkbox" name="doAporte" defaultChecked={c.doAporte} /> Sai do aporte do investidor
                  </label>
                  <Button type="submit" variant="secondary">
                    Salvar
                  </Button>
                </form>
                <form action={salvarValoresMensais} className="mt-4">
                  <input type="hidden" name="id" value={c.id} />
                  <p className="text-sm font-medium">Valor por mês</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                    Deixe em branco para usar o valor padrão ({formatMoeda(c.valorMensal)}).
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                    {meses.map((m) => (
                      <div key={m}>
                        <Label>{rotuloMes(m)}</Label>
                        <Input
                          name={`mes_${m}`}
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={c.meses.find((x) => x.mes === m)?.valor ?? ""}
                          placeholder={String(c.valorMensal)}
                        />
                      </div>
                    ))}
                  </div>
                  <Button type="submit" variant="secondary" className="mt-3">
                    Salvar valores por mês
                  </Button>
                </form>
              </details>
            </Card>
          ))}
          {custosFixos.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum custo fixo cadastrado ainda.</p>
          )}
        </div>
      </Secao>

      <Secao
        id="capacidade"
        titulo="Capacidade de horas"
        descricao="Quem trabalha de fato e quantas horas cobráveis cada um entrega por mês. Os custos de pessoas (salário, pró-labore, editor) só fazem sentido se as horas delas entrarem aqui. Quem é 'compartilhado' com o perfil dá à YANG só a fatia do rateio, igual aos custos."
      >
        <Card className="p-4 mb-3">
          <form action={criarPessoaHoras} className="grid md:grid-cols-5 gap-3 items-end">
            <div>
              <Label>Nome</Label>
              <Input name="nome" required placeholder="Ex: Editor" />
            </div>
            <div>
              <Label>Horas/mês</Label>
              <Input name="horasMes" type="number" min="1" step="any" defaultValue={config.horasMensais} />
            </div>
            <div>
              <Label>Ocupação (%)</Label>
              <Input name="ocupacaoPct" type="number" min="0" max="100" step="any" defaultValue={config.ocupacaoPct} />
            </div>
            <div>
              <Label>Pertence a</Label>
              <Select name="escopo" defaultValue="COMPARTILHADO">
                {ESCOPOS.filter((e) => e.valor !== "PESSOAL").map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.rotulo}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Adicionar pessoa</Button>
          </form>
        </Card>
        <Card className="p-4 overflow-x-auto">
          {pessoasHoras.length > 0 && (
            <form action={salvarPessoasHoras} className="mb-4">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="py-2 pr-4 font-medium">Pessoa</th>
                    <th className="py-2 pr-4 font-medium w-28">Horas/mês</th>
                    <th className="py-2 pr-4 font-medium w-28">Ocupação (%)</th>
                    <th className="py-2 pr-4 font-medium w-56">Pertence a</th>
                    <th className="py-2 font-medium text-right w-32">Horas da YANG</th>
                  </tr>
                </thead>
                <tbody>
                  {pessoasHoras.map((p) => {
                    const linha = resultado.capacidade.find((l) => l.nome === p.nome);
                    return (
                      <tr key={p.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                        <td className="py-1.5 pr-4">
                          <input type="hidden" name="ids" value={p.id} />
                          <span className="font-medium">{p.nome}</span>
                        </td>
                        <td className="py-1.5 pr-4">
                          <Input name={`horas_${p.id}`} type="number" min="1" step="any" defaultValue={p.horasMes} aria-label={`Horas por mês de ${p.nome}`} />
                        </td>
                        <td className="py-1.5 pr-4">
                          <Input name={`ocup_${p.id}`} type="number" min="0" max="100" step="any" defaultValue={p.ocupacaoPct} aria-label={`Ocupação de ${p.nome}`} />
                        </td>
                        <td className="py-1.5 pr-4">
                          <Select name={`escopo_${p.id}`} defaultValue={p.escopo} aria-label={`Escopo de ${p.nome}`}>
                            {ESCOPOS.filter((e) => e.valor !== "PESSOAL").map((e) => (
                              <option key={e.valor} value={e.valor}>
                                {e.rotulo}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {(linha?.horasYang ?? 0).toFixed(1).replace(".", ",")}h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Button type="submit" className="mt-3">
                Salvar capacidade
              </Button>
            </form>
          )}
          {pessoasHoras.map((p) => (
            <form key={p.id} action={excluirPessoaHoras} className="inline-block mr-2 mb-2">
              <input type="hidden" name="id" value={p.id} />
              <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                Remover {p.nome}
              </Button>
            </form>
          ))}
          {pessoasHoras.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Ninguém cadastrado: o cálculo usa {config.pessoasFaturaveis} pessoa(s) × {config.horasMensais}h ×{" "}
              {config.ocupacaoPct}% (Parâmetros).
            </p>
          )}
          <div className="border-t border-neutral-200 dark:border-neutral-800 mt-3 pt-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
            {resultado.capacidade.map((l) => (
              <span key={l.nome}>
                {l.nome}: <strong>{l.horasYang.toFixed(1).replace(".", ",")}h</strong>
                {l.horasYang !== l.horasCobraveis && (
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {" "}
                    (de {l.horasCobraveis.toFixed(1).replace(".", ",")}h)
                  </span>
                )}
              </span>
            ))}
            <span>
              Total da YANG: <strong>{resultado.horasFaturaveis.toFixed(1).replace(".", ",")}h/mês</strong>
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            Profissionais da Equipe com salário entram sozinhos aqui como “(Equipe)”, 100% YANG — não cadastre a
            mesma pessoa duas vezes.
          </p>
        </Card>
      </Secao>

      <Secao
        titulo="Equipe fixa"
        descricao="Salário mensal de quem trabalha fixo na Yang (cadastre pessoas em Equipe com o tipo Fixo). Freelancers não entram aqui: o cachê deles vira custo do projeto, no simulador."
      >
        <Card className="p-4">
          {fixos.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Nenhum profissional fixo ativo. Cadastre em Equipe com o tipo “Fixo”. Seu pró-labore entra em Custos
              fixos, na categoria Pró-labore.
            </p>
          ) : (
            <form action={salvarSalarios} className="space-y-3">
              {fixos.map((p) => (
                <div key={p.id} className="grid grid-cols-[1fr_10rem] gap-3 items-center">
                  <input type="hidden" name="ids" value={p.id} />
                  <div>
                    <p className="text-sm font-medium">{p.nome}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{p.funcao}</p>
                  </div>
                  <Input
                    name={`salario_${p.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={p.salarioMensal ?? ""}
                    placeholder="Salário R$/mês"
                    aria-label={`Salário de ${p.nome}`}
                  />
                </div>
              ))}
              <Button type="submit">Salvar salários</Button>
            </form>
          )}
        </Card>
      </Secao>

      <Secao
        titulo="Equipamentos e depreciação"
        descricao={`Informe quanto custou cada item. Sem prazo próprio, vale a taxa padrão (${String(config.depreciacaoPct).replace(".", ",")}% do valor por mês). Com prazo próprio, é valor ÷ meses. Dividida por ${config.diasUsoMes} diárias de uso por mês, vira o custo por diária que o projeto paga quando convoca o equipamento.`}
      >
        <Card className="p-4">
          <div className="flex gap-6 text-sm mb-4 flex-wrap">
            <span>
              Patrimônio em uso: <strong>{formatMoeda(resultado.patrimonioTotal)}</strong>
            </span>
            <span>
              Depreciação por mês (itens em uso): <strong>{formatMoeda(resultado.depreciacaoMensal)}</strong>
            </span>
          </div>
          {equipamentos.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum equipamento ativo.</p>
          ) : (
            <form action={salvarEquipamentos}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                      <th className="py-2 pr-4 font-medium">Equipamento</th>
                      <th className="py-2 pr-4 font-medium w-36">Valor pago (R$)</th>
                      <th className="py-2 pr-4 font-medium w-28">Vida útil (meses)</th>
                      <th className="py-2 pr-4 font-medium text-right w-28">Deprec./mês</th>
                      <th className="py-2 font-medium text-right w-36">Custo de aluguel / diária</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipamentos.map((e) => (
                      <tr key={e.id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                        <td className="py-1.5 pr-4">
                          <input type="hidden" name="ids" value={e.id} />
                          <span className="font-medium">{e.nome}</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400"> · {e.categoria}</span>
                          {e.status === "ESTRAGADO" && (
                            <Badge variant="danger" className="ml-2">
                              Estragado
                            </Badge>
                          )}
                        </td>
                        <td className="py-1.5 pr-4">
                          <Input
                            name={`valor_${e.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={e.valorCompra ?? ""}
                            aria-label={`Valor de ${e.nome}`}
                          />
                        </td>
                        <td className="py-1.5 pr-4">
                          <Input
                            name={`vida_${e.id}`}
                            type="number"
                            min="1"
                            step="1"
                            defaultValue={e.vidaUtilMeses ?? ""}
                            placeholder="padrão"
                            aria-label={`Vida útil de ${e.nome}`}
                          />
                        </td>
                        <td className="py-1.5 pr-4 text-right tabular-nums">
                          {e.status === "ESTRAGADO" ? "—" : formatMoeda(depreciacaoMensalDe(e, config.depreciacaoPct))}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {e.status === "ESTRAGADO" ? "—" : formatMoeda(depreciacaoPorDiaria(e, config))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="submit" className="mt-4">
                Salvar equipamentos
              </Button>
            </form>
          )}
        </Card>
      </Secao>

      <Secao
        titulo="Kits de equipamento"
        descricao="Conjuntos que saem juntos (ex.: kit leve para conteúdo simples). No simulador, um clique marca todos os itens do kit. O custo por diária é a soma dos itens."
      >
        <Card className="p-4 mb-3">
          <form action={criarKit} className="space-y-3">
            <div className="max-w-sm">
              <Label>Nome do kit</Label>
              <Input name="nome" required placeholder="Ex: Kit leve" />
            </div>
            <details className="rounded-md border border-neutral-200 dark:border-neutral-800">
              <summary className="cursor-pointer px-3 py-2 text-sm">Escolher os itens do kit</summary>
              <div className="max-h-72 overflow-y-auto px-3 pb-3 grid sm:grid-cols-2 gap-x-4 gap-y-1">
                {equipamentos.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="equipamentoIds" value={e.id} />
                    <span className="truncate">
                      {e.nome} <span className="text-xs text-neutral-500 dark:text-neutral-400">· {e.categoria}</span>
                    </span>
                  </label>
                ))}
              </div>
            </details>
            <Button type="submit">Criar kit</Button>
          </form>
        </Card>
        <div className="space-y-2">
          {kits.map((k) => {
            const itens = emUso.filter((e) => k.itens.some((i) => i.equipamentoId === e.id));
            const quebrados = estragados.filter((e) => k.itens.some((i) => i.equipamentoId === e.id));
            const porDiaria = itens.reduce((acc, e) => acc + depreciacaoPorDiaria(e, config), 0);
            return (
              <Card key={k.id} className="p-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {k.nome} <span className="tabular-nums text-neutral-600 dark:text-neutral-400">· {formatMoeda(porDiaria)} por diária</span>
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{itens.map((e) => e.nome).join(" · ")}</p>
                  {quebrados.length > 0 && (
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                      Estragado, fora do custo do kit: {quebrados.map((e) => e.nome).join(", ")}
                    </p>
                  )}
                </div>
                <form action={excluirKit}>
                  <input type="hidden" name="id" value={k.id} />
                  <Button type="submit" variant="ghost" className="text-xs px-2 py-1">
                    Excluir
                  </Button>
                </form>
              </Card>
            );
          })}
          {kits.length === 0 && <p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum kit criado ainda.</p>}
        </div>
      </Secao>
    </div>
  );
}
