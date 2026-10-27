import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Input, Select, Button, Badge, Label, MetricasEmLinha, Nota, type ItemDeMetrica } from "@/components/ui";
import { formatMoeda } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import {
  CATEGORIA_RESERVA,
  configComPadrao,
  personalizacaoComPadrao,
  classificarMargem,
  escoposComRotulos,
  calcularCustoHora,
  depreciacaoMensalDe,
  depreciacaoPorDiaria,
  precoComMargem,
  resumoAporte,
  pontoDeEquilibrio,
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
  salvarPersonalizacao,
} from "./actions";
import { SimuladorProjeto } from "./SimuladorProjeto";
import { SecaoCalc } from "./SecaoCalc";
import { Assistente } from "./Assistente";
import { AbrirSecaoDoHash } from "./AbrirSecaoDoHash";
import { ListaDeTags } from "./ListaDeTags";
import { PASSOS_CALCULADORA } from "./passos";
import { exigirModulo } from "@/lib/acesso";

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
  const acesso = await exigirModulo("calculadora");
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

  const [configSalva, usuarioAtual, equipamentos, fixos, custosFixos, pessoasHoras, kits] = await Promise.all([
    prisma.configCalculadora.findUnique({ where: { id: "singleton" } }),
    prisma.user.findUnique({ where: { id: acesso.userId }, select: { tutoriaisVistos: true } }),
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
  const personalizacao = personalizacaoComPadrao(configSalva);
  const escopos = escoposComRotulos(personalizacao);
  const jaViuAssistente = usuarioAtual?.tutoriaisVistos.includes("calculadora") ?? false;

  // os meses a partir do atual; se o escolhido estiver fora da lista, ele entra nela
  const meses = mesesAPartirDe(mesAtual, personalizacao.mesesNaProjecao);
  if (!meses.includes(mes)) meses.push(mes);
  meses.sort();

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
  const RATEIOS = personalizacao.rateiosComparacao;
  // a taxa só mexe na hora base quando a depreciação é rateada nela
  const TAXAS = comDepreciacao
    ? Array.from(new Set([...personalizacao.taxasDepreciacaoComparacao, config.depreciacaoPct])).sort((a, b) => a - b)
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
  const margens = personalizacao.margensComparacao;

  const metricas: ItemDeMetrica[] = [
    {
      rotulo: "Custo mensal",
      valor: formatMoeda(resultado.custoMensalTotal),
      apoio: comDepreciacao ? "equipe, equipamentos e custos fixos" : "equipe e custos fixos, sem depreciação",
    },
    {
      rotulo: "Horas cobráveis",
      valor: `${resultado.horasFaturaveis.toFixed(1).replace(".", ",")} h`,
      apoio: resultado.capacidade.length
        ? resultado.capacidade.map((l) => `${l.nome} ${l.horasYang.toFixed(1).replace(".", ",")} h`).join(" · ")
        : "por mês",
    },
    {
      rotulo: "Hora mínima",
      valor: horaMinima == null ? "—" : formatMoeda(horaMinima),
      apoio: `lucro zero, com ${config.impostoPct}% de imposto`,
    },
    {
      rotulo: "Hora sugerida",
      valor: horaSugerida == null ? "—" : formatMoeda(horaSugerida),
      apoio: `com ${config.margemPct}% de margem`,
      destaque: true,
    },
  ];
  const pilula = (ativa: boolean) =>
    `inline-flex h-10 items-center rounded-full border px-4 text-[13px] font-semibold transition-colors ${
      ativa
        ? "border-neutral-900 bg-neutral-900 text-neutral-50 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950"
        : "border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-100"
    }`;

  return (
    <div>
      <div id="topo" className="scroll-mt-6">
        <PageHeader
          eyebrow="Financeiro · Calculadora"
          title="Quanto a Yang precisa cobrar *por hora*"
          description="O mínimo para não pagar para trabalhar e o valor sugerido para ter lucro, calculados a partir dos seus custos e das horas que você realmente vende."
          actions={<Assistente passos={PASSOS_CALCULADORA} jaViu={jaViuAssistente} chave="calculadora" />}
        />
      </div>
      <AbrirSecaoDoHash />

      <div id="controles" className="mb-10 space-y-5">
        <nav className="flex flex-wrap items-center gap-2" aria-label="Mês de referência">
          <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
            Mês
          </span>
          {meses.map((m) => (
            <Link key={m} href={hrefCom(m, comDepreciacao)} aria-current={m === mes ? "page" : undefined} className={pilula(m === mes)}>
              {rotuloMes(m)}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
            Depreciação
          </span>
          {[
            { rotulo: "Cobrada por projeto", valor: false },
            { rotulo: "Rateada na hora", valor: true },
          ].map((o) => (
            <Link
              key={o.rotulo}
              href={hrefCom(mes, o.valor)}
              aria-current={o.valor === comDepreciacao ? "page" : undefined}
              className={pilula(o.valor === comDepreciacao)}
            >
              {o.rotulo}
            </Link>
          ))}
        </div>
        <p className="max-w-3xl text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          {comDepreciacao
            ? `Os ${formatMoeda(resultado.depreciacaoMensal)} por mês dos equipamentos em uso entram na hora, usados ou não em cada projeto.`
            : "A hora não leva depreciação: o simulador cobra só os equipamentos escolhidos em cada projeto."}
        </p>
      </div>

      {resultado.horasFaturaveis <= 0 && (
        <Nota tom="atencao" className="mb-4">
          Nenhuma hora cobrável para a YANG: a hora mínima e a sugerida aparecem zeradas. Confira em Capacidade (horas e
          ocupação de cada pessoa) e o rateio da YANG em Parâmetros.
        </Nota>
      )}
      {estragados.length > 0 && (
        <Nota tom="perigo" className="mb-4">
          <strong>{estragados.length} equipamento(s) estragado(s) fora do cálculo</strong> (sem depreciação e fora dos
          kits): {estragados.map((e) => e.nome).join(", ")}. Quando voltarem a funcionar, marque como disponível em
          Equipamentos.
        </Nota>
      )}
      {(semValor > 0 || semSalario > 0 || custosFixos.length === 0) && (
        <Nota tom="atencao" className="mb-4">
          O cálculo ainda está incompleto:
          {semValor > 0 && ` ${semValor} equipamento(s) sem valor de compra;`}
          {semSalario > 0 && ` ${semSalario} profissional(is) fixo(s) sem salário;`}
          {custosFixos.length === 0 && " nenhum custo fixo cadastrado (energia, água, internet...);"} preencha nas seções
          abaixo.
        </Nota>
      )}

      <div id="resumo" className="mb-16 mt-6 scroll-mt-6">
        <MetricasEmLinha itens={metricas} />
      </div>

      <SecaoCalc
        id="pesa"
        numero="01"
        titulo="De onde vem o custo"
        resumo={`${resultado.composicao.length} itens em ${rotuloMes(mes)}`}
        descricao={`Só o que a YANG absorve: custos compartilhados entram com ${config.rateioYangPct}% do valor.`}
        ajuda="pesa"
        aberta
      >
        {comDepreciacao && resultado.depreciacaoMensal > 0 && (
          <Nota className="mb-6">
            Depreciação: patrimônio de {formatMoeda(resultado.patrimonioTotal)} dividido em{" "}
            <strong>{String(config.depreciacaoPct).replace(".", ",")}% ao mês</strong>
            {config.depreciacaoPct > 0 &&
              ` (cerca de ${(100 / config.depreciacaoPct).toFixed(1).replace(".", ",")} meses)`}
            , salvo itens com prazo próprio.{" "}
            <a href="#parametros" className="underline">
              Ajustar a taxa
            </a>
          </Nota>
        )}
        {resultado.composicao.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Nada cadastrado ainda.</p>
        )}
        <div className="max-w-3xl space-y-5">
          {[...resultado.composicao].sort((a, b) => b.valor - a.valor).map((l, i) => {
            const pct = resultado.custoMensalTotal > 0 ? (l.valor / resultado.custoMensalTotal) * 100 : 0;
            return (
              <div key={l.nome} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] items-center gap-4 text-sm">
                <span className="truncate font-semibold">{l.nome}</span>
                <span className="relative block h-0.5 bg-neutral-200 dark:bg-neutral-800">
                  <span
                    className={`absolute inset-y-0 left-0 ${i === 0 ? "fundo-destaque" : "bg-neutral-900 dark:bg-neutral-100"}`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                  {formatMoeda(l.valor)} · {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </SecaoCalc>

      <SecaoCalc
        id="margens"
        numero="02"
        titulo="Valor da hora por margem"
        resumo={`${margens.length} margens`}
        descricao={`Já com ${config.impostoPct}% de imposto. A margem é sobre o preço cobrado.`}
        ajuda="margens"
        aberta
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] max-w-3xl text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                <th className="py-3 pr-4 font-semibold">Margem</th>
                <th className="py-3 pr-4 font-semibold">Valor/hora</th>
                <th className="py-3 pr-4 font-semibold">Lucro/hora</th>
                <th className="py-3 font-semibold">Avaliação</th>
              </tr>
            </thead>
            <tbody>
              {margens.map((m) => {
                const preco = precoComMargem(resultado.custoHora, config.impostoPct, m);
                const c = classificarMargem(m, personalizacao);
                return (
                  <tr key={m} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="py-3 pr-4 font-semibold">{String(m).replace(".", ",")}%</td>
                    <td className="py-3 pr-4 tabular-nums">{preco == null ? "—" : formatMoeda(preco)}</td>
                    <td className="py-3 pr-4 tabular-nums">{preco == null ? "—" : formatMoeda(preco * (m / 100))}</td>
                    <td className="py-3">
                      <Badge variant={c.variante}>{c.nome}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SecaoCalc>

      <SecaoCalc
        id="sensibilidade"
        numero="03"
        titulo="Fatia da YANG na hora mínima"
        resumo={`${RATEIOS.length} cenários`}
        descricao={`Hora mínima (lucro zero, com ${config.impostoPct}% de imposto) em ${rotuloMes(mes)} conforme a fatia da YANG nos custos e nas horas compartilhadas${comDepreciacao ? " e a taxa de depreciação dos equipamentos" : ""}. A célula em destaque é o cenário atual.`}
        ajuda="sensibilidade"
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
      </SecaoCalc>

      {/* ---------- orçamento do lançamento ---------- */}
      <SecaoCalc
        id="aporte"
        numero="04"
        titulo="Orçamento do lançamento"
        resumo={`aporte de ${formatMoeda(aporte.aporteTotal)}`}
        descricao="O que o plano prevê gastar com o dinheiro do investidor, mês a mês. Marque 'Sai do aporte' nos custos que o aporte paga (em Custos fixos mensais) e os valores de cada mês entram aqui."
        ajuda="aporte"
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
          <Nota tom={aporte.saldo < 0 ? "perigo" : "ok"} className="mt-4">
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
          </Nota>
        </Card>
      </SecaoCalc>

      <SecaoCalc
        id="equilibrio"
        numero="05"
        titulo="Ponto de equilíbrio"
        resumo={rotuloMes(mes)}
        descricao="Quanto é preciso faturar no mês só para empatar, já descontando o imposto. Não inclui lucro nem comissão."
        ajuda="equilibrio"
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
      </SecaoCalc>

      <SecaoCalc
        id="mensal"
        numero="06"
        titulo="Custo/hora mês a mês"
        resumo={`${previsao.length} meses`}
        descricao="Salários e pró-labore mudam de um mês para o outro; aqui você vê o efeito disso na hora. Edite os valores de cada mês em Custos fixos mensais."
        ajuda="mensal"
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
      </SecaoCalc>

      {/* ---------- simulador ---------- */}
      <SecaoCalc
        id="simulador"
        numero="07"
        titulo="Simulador de projeto"
        descricao="Some as horas e os custos diretos (gasolina, hospedagem, alimentação, terceiros, tráfego e os equipamentos que o projeto usa) para saber o menor valor que vale a pena cobrar. Equipamento que não for convocado não entra na conta."
        ajuda="simulador"
        aberta
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
      </SecaoCalc>

      {/* ---------- dados de base ---------- */}
      <SecaoCalc
        id="parametros"
        numero="08"
        titulo="Parâmetros"
        descricao="Estes números alimentam tudo acima. Os valores iniciais são estimativas — troque pelos da Yang."
        ajuda="parametros"
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
        <div id="personalizar" className="mt-12 scroll-mt-6 border-t border-neutral-200 pt-10 dark:border-neutral-800">
          <h3 className="mb-1 text-lg font-bold tracking-tight">Personalizar listas e faixas</h3>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            Tudo o que aparece nas tabelas e nos formulários desta página é seu para ajustar. Adicione ou remova com o
            teclado ou o mouse e salve ao final.
          </p>
          <form action={salvarPersonalizacao} className="space-y-10">
            <ListaDeTags
              nome="categoria"
              valores={personalizacao.categoriasCusto}
              rotulo="Categorias de custo"
              placeholder="Nova categoria"
              fixas={[CATEGORIA_RESERVA]}
            />
            <div className="grid gap-10 md:grid-cols-3">
              <ListaDeTags
                nome="margem"
                valores={personalizacao.margensComparacao}
                rotulo="Margens comparadas"
                placeholder="Ex.: 35"
                sufixo="%"
                numerica
              />
              <ListaDeTags
                nome="rateio"
                valores={personalizacao.rateiosComparacao}
                rotulo="Fatias da YANG comparadas"
                placeholder="Ex.: 60"
                sufixo="%"
                numerica
              />
              <ListaDeTags
                nome="taxa"
                valores={personalizacao.taxasDepreciacaoComparacao}
                rotulo="Taxas de depreciação comparadas (ao mês)"
                placeholder="Ex.: 2,2"
                sufixo="%"
                numerica
              />
            </div>

            <div>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
                Faixas de avaliação da margem
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {personalizacao.faixasMargemNomes.map((nome, i) => (
                  <div key={i}>
                    <Label>Faixa {i + 1}</Label>
                    <Input name="faixaNome" defaultValue={nome} maxLength={24} required />
                    {i < personalizacao.faixasMargemLimites.length ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        até
                        <Input
                          name="faixaLimite"
                          type="number"
                          min="1"
                          max="99"
                          step="any"
                          defaultValue={personalizacao.faixasMargemLimites[i]}
                          className="w-24 py-1.5"
                          required
                        />
                        % de margem
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">acima do último limite</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <Label>Meses mostrados</Label>
                <Input
                  name="mesesNaProjecao"
                  type="number"
                  min="1"
                  max="12"
                  step="1"
                  defaultValue={personalizacao.mesesNaProjecao}
                  className="max-w-[8rem]"
                  required
                />
                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  No seletor de mês e na tabela de custo/hora mês a mês (de 1 a 12).
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
                  Nomes dos escopos de custo
                </p>
                {[
                  "O custo inteiro entra na hora da produtora",
                  "Entra só com a fatia (rateio) da produtora",
                  "Não entra na hora da produtora",
                ].map((explicacao, i) => (
                  <div key={i}>
                    <Input name="rotuloEscopo" defaultValue={personalizacao.rotulosEscopo[i]} maxLength={48} required />
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{explicacao}</p>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit">Salvar personalização</Button>
          </form>
        </div>
      </SecaoCalc>

      <SecaoCalc
        id="custos"
        numero="09"
        titulo="Custos fixos mensais"
        resumo={`${custosFixos.length} itens`}
        descricao="Tudo o que a agência paga todo mês, mesmo sem projeto: energia, água, internet, aluguel, softwares, tráfego pago, contador. Se a conta varia, use a média dos últimos meses."
        ajuda="custos"
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
                {personalizacao.categoriasCusto.map((c) => (
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
                {escopos.map((e) => (
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
                    {c.categoria} · {escopos.find((e) => e.valor === c.escopo)?.rotulo ?? c.escopo}
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
                      {[...new Set<string>([...personalizacao.categoriasCusto, c.categoria])].map((cat) => (
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
                      {escopos.map((e) => (
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
      </SecaoCalc>

      <SecaoCalc
        id="capacidade"
        numero="10"
        titulo="Capacidade de horas"
        resumo={`${pessoasHoras.length} pessoa(s)`}
        descricao="Quem trabalha de fato e quantas horas cobráveis cada um entrega por mês. Os custos de pessoas (salário, pró-labore, editor) só fazem sentido se as horas delas entrarem aqui. Quem é 'compartilhado' com o perfil dá à YANG só a fatia do rateio, igual aos custos."
        ajuda="capacidade"
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
                {escopos.filter((e) => e.valor !== "PESSOAL").map((e) => (
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
                            {escopos.filter((e) => e.valor !== "PESSOAL").map((e) => (
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
      </SecaoCalc>

      <SecaoCalc
        id="equipe"
        numero="11"
        titulo="Equipe fixa"
        resumo={`${fixos.length} pessoa(s)`}
        descricao="Salário mensal de quem trabalha fixo na Yang (cadastre pessoas em Equipe com o tipo Fixo). Freelancers não entram aqui: o cachê deles vira custo do projeto, no simulador."
        ajuda="equipe"
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
      </SecaoCalc>

      <SecaoCalc
        id="equipamentos"
        numero="12"
        titulo="Equipamentos e depreciação"
        resumo={`${equipamentos.length} itens`}
        descricao={`Informe quanto custou cada item. Sem prazo próprio, vale a taxa padrão (${String(config.depreciacaoPct).replace(".", ",")}% do valor por mês). Com prazo próprio, é valor ÷ meses. Dividida por ${config.diasUsoMes} diárias de uso por mês, vira o custo por diária que o projeto paga quando convoca o equipamento.`}
        ajuda="equipamentos"
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
      </SecaoCalc>

      <SecaoCalc
        id="kits"
        numero="13"
        titulo="Kits de equipamento"
        resumo={`${kits.length} kits`}
        descricao="Conjuntos que saem juntos (ex.: kit leve para conteúdo simples). No simulador, um clique marca todos os itens do kit. O custo por diária é a soma dos itens."
        ajuda="kits"
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
      </SecaoCalc>
    </div>
  );
}
