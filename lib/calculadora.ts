/**
 * Cálculo do custo/hora da Yang. Funções puras, sem acesso a banco — são
 * usadas tanto na página (servidor) quanto no simulador de projeto (navegador).
 *
 * Duas camadas, de propósito:
 *  1. Custo/hora = tudo o que a agência gasta por mês só para existir
 *     (equipe fixa, energia, água, internet, tráfego pago, aluguel...)
 *     dividido pelas horas realmente cobráveis.
 *  2. Custos diretos de um projeto (gasolina, hospedagem, alimentação,
 *     terceiros, depreciação dos equipamentos usados...) entram à parte, no
 *     simulador — não no custo/hora.
 *
 * A depreciação é cobrada por projeto, só dos equipamentos convocados para ele.
 * Por padrão fica fora do custo/hora; se a opção da tela a incluir lá, o
 * simulador não deve cobrá-la de novo (seria contar duas vezes).
 */

export type ConfigCalculadora = {
  horasMensais: number; // horas contratadas por pessoa por mês
  pessoasFaturaveis: number; // quantas pessoas (você incluído) geram horas cobráveis
  ocupacaoPct: number; // % das horas que de fato viram trabalho cobrado
  impostoPct: number; // imposto sobre o faturamento (Simples/ISS)
  margemPct: number; // margem de lucro alvo, sobre o preço de venda
  comissaoPct: number; // comissão do vendedor sobre o preço, nas vendas que ele fecha
  rateioYangPct: number; // % dos custos compartilhados (YANG + perfil Yan) que a produtora absorve
  ticketCasamento: number; // ticket médio de um casamento da YANG, p/ o ponto de equilíbrio
  aporteTotal: number; // aporte do investidor
  aporteInicio: string; // primeiro mês coberto pelo aporte (yyyy-MM)
  aporteMeses: number; // quantos meses o aporte precisa cobrir
  diasUsoMes: number; // diárias de uso de equipamento por mês, p/ a depreciação por diária
  encargosPct: number; // encargos sobre salário (CLT ≈ 70%; PJ/MEI = 0)
  depreciacaoPct: number; // depreciação padrão dos equipamentos, em % do valor por mês
  precoCombustivel: number; // R$/litro
  consumoKmL: number; // km por litro
  desgasteKm: number; // desgaste do veículo (pneu, óleo, depreciação), R$/km
  alimentacaoDia: number; // R$ por pessoa por dia em campo
  diariaHospedagem: number; // R$ por pessoa por noite
};

export const CONFIG_PADRAO: ConfigCalculadora = {
  horasMensais: 176,
  pessoasFaturaveis: 1,
  ocupacaoPct: 75,
  impostoPct: 6,
  margemPct: 30,
  comissaoPct: 10,
  rateioYangPct: 50,
  ticketCasamento: 4500,
  aporteTotal: 0,
  aporteInicio: "2026-10",
  aporteMeses: 3,
  diasUsoMes: 8,
  encargosPct: 0,
  depreciacaoPct: 1.6,
  precoCombustivel: 6.2,
  consumoKmL: 10,
  desgasteKm: 0.25,
  alimentacaoDia: 60,
  diariaHospedagem: 200,
};

export const CATEGORIAS_CUSTO_FIXO = [
  "Salários",
  "Pró-labore",
  "Aluguel",
  "Energia",
  "Água",
  "Internet e telefone",
  "Software e assinaturas",
  "Tráfego pago",
  "Terceirizados recorrentes",
  "Contabilidade",
  "Identidade visual",
  "Reserva de caixa",
  "Marketing",
  "Veículo (seguro, IPVA)",
  "Outros",
] as const;

export type EquipamentoParaCalculo = {
  valorCompra: number | null;
  vidaUtilMeses: number | null;
};

export const ESCOPOS = [
  { valor: "YANG", rotulo: "YANG (produtora)" },
  { valor: "COMPARTILHADO", rotulo: "Compartilhado (YANG + perfil Yan)" },
  { valor: "PESSOAL", rotulo: "Só perfil / infoprodutos" },
] as const;

export const CATEGORIA_RESERVA = "Reserva de caixa";

export type CustoFixoParaCalculo = {
  categoria: string;
  valorMensal: number;
  escopo?: string;
};

/** Quanto de um custo pesa na hora da YANG: tudo, só o rateio, ou nada. */
export function fatorDoEscopo(escopo: string | undefined, rateioYangPct: number) {
  if (escopo === "PESSOAL") return 0;
  if (escopo === "COMPARTILHADO") return Math.min(100, positivo(rateioYangPct)) / 100;
  return 1;
}

export type LinhaComposicao = { nome: string; valor: number };

export type PessoaParaCalculo = {
  nome: string;
  horasMes: number;
  ocupacaoPct: number;
  escopo: string;
};

export type LinhaCapacidade = {
  nome: string;
  escopo: string;
  horasCobraveis: number; // horas/mês × ocupação, antes de dividir com o perfil
  horasYang: number; // a parte dessas horas que é da YANG (mesmo fator dos custos)
};

export type OpcoesCustoHora = {
  incluirDepreciacao?: boolean;
  // quem gera horas cobráveis; sem ninguém, vale horasMensais × pessoasFaturaveis da config
  pessoas?: PessoaParaCalculo[];
};

export type ResultadoCustoHora = {
  depreciacaoMensal: number;
  patrimonioTotal: number;
  folhaMensal: number; // salários + encargos
  fixosMensal: number;
  custoMensalTotal: number; // o que a produtora absorve: entra na hora
  custoNegocioTotal: number; // tudo o que sai por mês nas duas frentes (sem reserva de caixa)
  horasFaturaveis: number; // horas cobráveis da YANG por mês (soma de capacidade[].horasYang)
  capacidade: LinhaCapacidade[];
  custoHora: number; // só cobre os gastos (preço de custo, antes de imposto/lucro)
  composicao: LinhaComposicao[]; // de onde vem o custo mensal, p/ exibir
};

const positivo = (n: number | null | undefined) =>
  n != null && Number.isFinite(n) && n > 0 ? n : 0;

/**
 * Depreciação mensal de um item: com prazo próprio (vidaUtilMeses), valor ÷ meses;
 * sem prazo, a taxa padrão (% do valor por mês).
 */
export function depreciacaoMensalDe(e: EquipamentoParaCalculo, taxaMensalPct: number) {
  const valor = positivo(e.valorCompra);
  const meses = positivo(e.vidaUtilMeses);
  return meses > 0 ? valor / meses : valor * (positivo(taxaMensalPct) / 100);
}

/**
 * Quanto custa cada diária de uso de um equipamento: a depreciação mensal
 * (valor × taxa mensal, ou valor ÷ prazo próprio) espalhada pelas diárias de uso que ele tem por mês. É isso
 * que o projeto paga — só pelos equipamentos que de fato usa.
 */
export function depreciacaoPorDiaria(e: EquipamentoParaCalculo, config: ConfigCalculadora) {
  const dias = positivo(config.diasUsoMes);
  return dias > 0 ? depreciacaoMensalDe(e, config.depreciacaoPct) / dias : 0;
}

export function horasFaturaveis(c: ConfigCalculadora) {
  return (
    positivo(c.horasMensais) * positivo(c.pessoasFaturaveis) * (positivo(c.ocupacaoPct) / 100)
  );
}

/**
 * Horas cobráveis de cada pessoa. O escopo vale para as horas o mesmo que para os
 * custos: alguém "compartilhado" com o perfil só dá à YANG a fração do rateio —
 * senão o custo seria dividido pela metade e as horas contadas inteiras.
 */
export function capacidadeDeHoras(
  config: ConfigCalculadora,
  pessoas: PessoaParaCalculo[]
): LinhaCapacidade[] {
  if (pessoas.length === 0) {
    const h = horasFaturaveis(config);
    return [
      {
        nome: `Padrão (${config.pessoasFaturaveis} pessoa(s))`,
        escopo: "YANG",
        horasCobraveis: h,
        horasYang: h,
      },
    ];
  }
  return pessoas.map((p) => {
    const horasCobraveis = positivo(p.horasMes) * (positivo(p.ocupacaoPct) / 100);
    return {
      nome: p.nome,
      escopo: p.escopo,
      horasCobraveis,
      horasYang: horasCobraveis * fatorDoEscopo(p.escopo, config.rateioYangPct),
    };
  });
}

export function calcularCustoHora(
  config: ConfigCalculadora,
  equipamentos: EquipamentoParaCalculo[],
  salarios: number[],
  custosFixos: CustoFixoParaCalculo[],
  opcoes: OpcoesCustoHora = {}
): ResultadoCustoHora {
  const incluirDepreciacao = opcoes.incluirDepreciacao ?? true;
  const patrimonioTotal = equipamentos.reduce((s, e) => s + positivo(e.valorCompra), 0);
  const depreciacaoMensal = equipamentos.reduce(
    (s, e) => s + depreciacaoMensalDe(e, config.depreciacaoPct),
    0
  );
  const salariosBase = salarios.reduce((s, v) => s + positivo(v), 0);
  const folhaMensal = salariosBase * (1 + positivo(config.encargosPct) / 100);
  // a reserva de caixa guarda dinheiro, não é gasto: fica fora de qualquer conta de custo
  const gastos = custosFixos.filter((c) => c.categoria !== CATEGORIA_RESERVA);
  const pesoNaYang = (c: CustoFixoParaCalculo) =>
    positivo(c.valorMensal) * fatorDoEscopo(c.escopo, config.rateioYangPct);
  const fixosMensal = gastos.reduce((s, c) => s + pesoNaYang(c), 0);
  const fixosTodos = gastos.reduce((s, c) => s + positivo(c.valorMensal), 0);

  // depreciacaoMensal fica sempre com o valor real (a tela de equipamentos mostra);
  // só o que entra no custo da agência muda quando a depreciação é desligada
  const depreciacaoNoCusto = incluirDepreciacao ? depreciacaoMensal : 0;
  const custoMensalTotal = depreciacaoNoCusto + folhaMensal + fixosMensal;
  const custoNegocioTotal = depreciacaoNoCusto + folhaMensal + fixosTodos;
  const capacidade = capacidadeDeHoras(config, opcoes.pessoas ?? []);
  const horas = capacidade.reduce((s, l) => s + l.horasYang, 0);

  const porCategoria = new Map<string, number>();
  for (const c of gastos) {
    porCategoria.set(c.categoria, (porCategoria.get(c.categoria) ?? 0) + pesoNaYang(c));
  }
  const composicao: LinhaComposicao[] = [
    { nome: "Equipe fixa (com encargos)", valor: folhaMensal },
    { nome: "Depreciação dos equipamentos", valor: depreciacaoNoCusto },
    ...Array.from(porCategoria, ([nome, valor]) => ({ nome, valor })),
  ].filter((l) => l.valor > 0);

  return {
    depreciacaoMensal,
    patrimonioTotal,
    folhaMensal,
    fixosMensal,
    custoMensalTotal,
    custoNegocioTotal,
    horasFaturaveis: horas,
    capacidade,
    custoHora: horas > 0 ? custoMensalTotal / horas : 0,
    composicao,
  };
}

/**
 * Preço de venda que, depois de pagar o imposto e a margem desejada, ainda
 * cobre o custo. A margem é sobre o PREÇO (não sobre o custo): para ficar com
 * 30% de lucro e 6% de imposto, o custo pode ser no máximo 64% do preço.
 * A comissão de vendas, quando houver, sai do preço do mesmo jeito que o imposto.
 * Devolve null quando imposto + margem + comissão chegam a 100% (não existe preço).
 */
export function precoComMargem(
  custo: number,
  impostoPct: number,
  margemPct: number,
  comissaoPct = 0
) {
  const fator =
    1 - (positivo(impostoPct) + positivo(margemPct) + positivo(comissaoPct)) / 100;
  return fator > 0 ? custo / fator : null;
}

export type EntradaProjeto = {
  horas: number;
  km: number; // total rodado (ida + volta)
  pessoasEmCampo: number;
  diasEmCampo: number;
  noitesHospedagem: number;
  trafegoPago: number;
  terceiros: number; // soma dos terceirizados/freelancers
  equipamentos: number; // depreciação dos equipamentos usados: Σ (custo por diária × diárias)
  outros: number;
  comissao: boolean; // a venda foi fechada por quem recebe comissão?
  valorPretendido: number | null; // quanto pretende cobrar, se já souber
};

export type ResultadoProjeto = {
  custoHoras: number;
  combustivel: number;
  alimentacao: number;
  hospedagem: number;
  trafegoPago: number;
  terceiros: number;
  equipamentos: number;
  outros: number;
  custosDiretos: number;
  custoTotal: number;
  precoMinimo: number | null; // cobre custo + imposto, lucro zero
  precoSugerido: number | null; // com a margem alvo
  horaMinima: number | null; // custo/hora + imposto
  horaSugerida: number | null;
  // só preenchidos quando valorPretendido > 0
  lucro: number | null;
  margemReal: number | null;
  horaEfetiva: number | null; // o que sobra por hora depois de imposto, comissão e custos diretos
};

export function simularProjeto(
  config: ConfigCalculadora,
  custoHora: number,
  e: EntradaProjeto
): ResultadoProjeto {
  const horas = positivo(e.horas);
  const custoHoras = horas * custoHora;
  const custoKm =
    positivo(config.consumoKmL) > 0
      ? positivo(config.precoCombustivel) / config.consumoKmL + positivo(config.desgasteKm)
      : positivo(config.desgasteKm);
  const combustivel = positivo(e.km) * custoKm;
  const alimentacao =
    positivo(e.pessoasEmCampo) * positivo(e.diasEmCampo) * positivo(config.alimentacaoDia);
  const hospedagem =
    positivo(e.pessoasEmCampo) * positivo(e.noitesHospedagem) * positivo(config.diariaHospedagem);
  const trafegoPago = positivo(e.trafegoPago);
  const terceiros = positivo(e.terceiros);
  const outros = positivo(e.outros);
  const equipamentos = positivo(e.equipamentos);

  const custosDiretos =
    combustivel + alimentacao + hospedagem + trafegoPago + terceiros + equipamentos + outros;
  const custoTotal = custoHoras + custosDiretos;

  const comissaoPct = e.comissao ? positivo(config.comissaoPct) : 0;
  const precoMinimo = precoComMargem(custoTotal, config.impostoPct, 0, comissaoPct);
  const precoSugerido = precoComMargem(custoTotal, config.impostoPct, config.margemPct, comissaoPct);
  const horaMinima = precoComMargem(custoHora, config.impostoPct, 0, comissaoPct);
  const horaSugerida = precoComMargem(custoHora, config.impostoPct, config.margemPct, comissaoPct);

  const valor = e.valorPretendido != null && e.valorPretendido > 0 ? e.valorPretendido : null;
  const liquido =
    valor != null ? valor * (1 - (positivo(config.impostoPct) + comissaoPct) / 100) : null;
  const lucro = liquido != null ? liquido - custoTotal : null;

  return {
    custoHoras,
    combustivel,
    alimentacao,
    hospedagem,
    trafegoPago,
    terceiros,
    equipamentos,
    outros,
    custosDiretos,
    custoTotal,
    precoMinimo,
    precoSugerido,
    horaMinima,
    horaSugerida,
    lucro,
    margemReal: valor != null && lucro != null ? (lucro / valor) * 100 : null,
    horaEfetiva: liquido != null && horas > 0 ? (liquido - custosDiretos) / horas : null,
  };
}

export const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-10" → "out/2026" */
export function rotuloMes(mes: string) {
  const [ano, m] = mes.split("-");
  return `${MESES_ABREV[Number(m) - 1] ?? m}/${ano}`;
}

/** Lista `quantidade` meses ("yyyy-MM") a partir de `inicio`. */
export function mesesAPartirDe(inicio: string, quantidade: number) {
  const [ano, m] = inicio.split("-").map(Number);
  return Array.from({ length: quantidade }, (_, i) => {
    const total = ano * 12 + (m - 1) + i;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  });
}

export const MES_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

/** O valor de um custo fixo no mês: a exceção daquele mês, se houver, senão o valor padrão. */
export function valorDoMes(
  custo: { valorMensal: number; meses: { mes: string; valor: number }[] },
  mes: string
) {
  return custo.meses.find((x) => x.mes === mes)?.valor ?? custo.valorMensal;
}

// ---------- orçamento de lançamento (aporte do investidor) ----------

export type CustoParaAporte = {
  id: string;
  nome: string;
  categoria: string;
  valorMensal: number;
  doAporte: boolean;
  ativo: boolean;
  meses: { mes: string; valor: number }[];
};

export type LinhaAporte = { id: string; nome: string; valores: number[]; total: number };

export type ResumoAporte = {
  meses: string[];
  linhas: LinhaAporte[];
  totaisPorMes: number[];
  planejado: number; // soma de tudo que está marcado como saindo do aporte
  aporteTotal: number;
  saldo: number; // aporte - planejado; negativo = faltam recursos
};

/** Quanto o plano prevê gastar do aporte, mês a mês, e quanto sobra (ou falta). */
export function resumoAporte(config: ConfigCalculadora, custos: CustoParaAporte[]): ResumoAporte {
  const meses = mesesAPartirDe(config.aporteInicio, Math.max(1, config.aporteMeses));
  const linhas = custos
    .filter((c) => c.doAporte && c.ativo)
    .map((c) => {
      const valores = meses.map((m) => valorDoMes(c, m));
      return { id: c.id, nome: c.nome, valores, total: valores.reduce((a, b) => a + b, 0) };
    })
    .filter((l) => l.total > 0);
  const totaisPorMes = meses.map((_, i) => linhas.reduce((s, l) => s + l.valores[i], 0));
  const planejado = totaisPorMes.reduce((a, b) => a + b, 0);
  return {
    meses,
    linhas,
    totaisPorMes,
    planejado,
    aporteTotal: config.aporteTotal,
    saldo: config.aporteTotal - planejado,
  };
}

// ---------- ponto de equilíbrio ----------

export type PontoDeEquilibrio = {
  faturamentoYang: number | null; // o que a YANG precisa faturar no mês para empatar
  casamentosYang: number | null; // quantos casamentos (ticket médio) isso significa
  faturamentoNegocio: number | null; // as duas frentes juntas
};

export function pontoDeEquilibrio(
  config: ConfigCalculadora,
  custoYang: number,
  custoNegocio: number
): PontoDeEquilibrio {
  const fator = 1 - positivo(config.impostoPct) / 100;
  if (fator <= 0) return { faturamentoYang: null, casamentosYang: null, faturamentoNegocio: null };
  const faturamentoYang = custoYang / fator;
  return {
    faturamentoYang,
    casamentosYang: positivo(config.ticketCasamento) > 0 ? faturamentoYang / config.ticketCasamento : null,
    faturamentoNegocio: custoNegocio / fator,
  };
}
