// Roteiro do assistente da calculadora (texto pré-programado, sem IA).
// `alvo` é o seletor da parte da tela que fica em destaque; seções fechadas são abertas sozinhas.
// Em `titulo`, *palavra* vira a ênfase serifada em âmbar (uma por passo).

export type Passo = {
  id: string;
  alvo?: string;
  titulo: string;
  texto: string[];
  formula?: string;
  exemplo?: string;
  dica?: string;
};

export const PASSOS_CALCULADORA: Passo[] = [
  {
    id: "inicio",
    alvo: "#topo",
    titulo: "Bem-vindo à *calculadora*",
    texto: [
      "Esta tela responde a uma pergunta: quanto a Yang precisa cobrar por hora para pagar todos os custos e ainda ter lucro.",
      "Vou mostrar cada parte, de cima para baixo, explicando o que cada número significa e como ele é calculado. Dá para voltar, pular e chamar de novo quando quiser, pelo botão Assistente no topo.",
    ],
  },
  {
    id: "controles",
    alvo: "#controles",
    titulo: "Mês e *depreciação*",
    texto: [
      "Escolha o mês de referência: salário, pró-labore e tráfego pago podem mudar de um mês para o outro, e a hora muda junto.",
      "Em Depreciação você decide como contar o desgaste dos equipamentos: cobrada por projeto (só o que o projeto usa) ou rateada na hora (todo o patrimônio entra no custo da hora).",
    ],
    dica: "O padrão, por projeto, é o mais justo: um projeto simples não paga a câmera que não usou.",
  },
  {
    id: "resumo",
    alvo: "#resumo",
    titulo: "Os quatro *números*",
    texto: [
      "Custo mensal: tudo o que a agência gasta por mês só para existir.",
      "Horas cobráveis: as horas por mês que você realmente vende, já descontada a ocupação.",
      "Hora mínima: o valor da hora em que você empata (lucro zero), já pagando o imposto.",
      "Hora sugerida: a hora mínima mais a margem de lucro que você quer.",
    ],
    formula: "Custo/hora = custo mensal ÷ horas cobráveis\nHora mínima = custo/hora ÷ (1 − imposto)\nHora sugerida = custo/hora ÷ (1 − imposto − margem)",
    exemplo: "Custo mensal de R$ 3.000, 60 horas cobráveis, imposto de 6% e margem de 30%: custo/hora R$ 50,00, hora mínima R$ 53,19 e hora sugerida R$ 78,13.",
  },
  {
    id: "pesa",
    alvo: "#pesa",
    titulo: "De onde vem o *custo*",
    texto: [
      "Mostra cada item do custo mensal, do maior para o menor, com a fatia de cada um. É aqui que você enxerga onde cortar ou renegociar.",
      "Custos compartilhados entram só com a fatia (rateio) que cabe à Yang.",
    ],
  },
  {
    id: "margens",
    alvo: "#margens",
    titulo: "Hora por *margem*",
    texto: [
      "Compara quanto cobrar por hora em cada margem de lucro e dá uma nota a cada uma: Apertado, Baixo, Saudável ou Ótimo.",
      "As margens da tabela e os limites de cada faixa são seus: dá para mudar em Parâmetros, na parte Personalizar.",
    ],
    formula: "Valor/hora = custo/hora ÷ (1 − imposto − margem)\nLucro/hora = valor/hora × margem",
    dica: "A margem é sobre o preço cobrado, não sobre o custo. Margem de 30% significa que 30% do que o cliente paga é lucro.",
  },
  {
    id: "sensibilidade",
    alvo: "#sensibilidade",
    titulo: "A fatia da *Yang*",
    texto: [
      "Mostra como a hora mínima muda conforme a parte dos custos e das horas compartilhadas que a Yang absorve (por exemplo 50%, 75% e 100%). A célula em destaque é o cenário atual.",
      "Quanto mais a Yang assume, mais horas ela tem para diluir o que já paga, e a hora tende a cair.",
    ],
  },
  {
    id: "aporte",
    alvo: "#aporte",
    titulo: "Orçamento do *aporte*",
    texto: [
      "Se há um aporte de investidor, aqui você vê quanto o plano gasta por mês com ele e quanto sobra ou falta.",
      "Para um custo aparecer aqui, marque Sai do aporte em Custos fixos. O valor do aporte e o mês de início ficam em Parâmetros.",
    ],
  },
  {
    id: "equilibrio",
    alvo: "#equilibrio",
    titulo: "Ponto de *equilíbrio*",
    texto: [
      "Quanto a Yang precisa faturar no mês só para empatar, já descontando o imposto, e quantos casamentos (no ticket médio que você definiu) isso equivale.",
      "Não inclui lucro nem comissão: é o piso, não a meta.",
    ],
    formula: "Faturamento de equilíbrio = custo mensal ÷ (1 − imposto)",
  },
  {
    id: "mensal",
    alvo: "#mensal",
    titulo: "Mês a *mês*",
    texto: [
      "Mostra o efeito, na hora, dos custos que mudam de um mês para o outro, como salário e pró-labore. Os valores de cada mês você edita em Custos fixos.",
      "Quantos meses aparecem aqui é uma escolha sua, em Parâmetros.",
    ],
  },
  {
    id: "simulador",
    alvo: "#simulador",
    titulo: "Simulador de *projeto*",
    texto: [
      "Calcula o menor valor que vale a pena cobrar por um projeto específico: soma as horas, os custos diretos (gasolina, hospedagem, alimentação, terceiros, tráfego e os equipamentos usados), o imposto e a margem.",
      "Se você já tem um valor em mente, ele mostra o lucro que sobraria.",
    ],
    dica: "Escolha um kit para marcar vários equipamentos de uma vez. Equipamento que não for convocado não entra na conta.",
  },
  {
    id: "parametros",
    alvo: "#parametros",
    titulo: "Seus *parâmetros*",
    texto: [
      "São os números que alimentam toda a calculadora: imposto, margem, comissão, horas, ocupação, depreciação, viagem e aporte. Os valores iniciais são estimativas: troque pelos da Yang.",
      "O imposto de 6% é só um ponto de partida. Confirme a alíquota real com o contador.",
    ],
  },
  {
    id: "personalizar",
    alvo: "#personalizar",
    titulo: "Personalize *tudo*",
    texto: [
      "Aqui você muda as categorias de custo, as margens e as fatias comparadas nas tabelas, os nomes e os limites das faixas de avaliação, os nomes dos escopos e quantos meses aparecem.",
      "Nada fica preso no código: se a sua realidade é diferente, a calculadora acompanha.",
    ],
    dica: "A categoria Reserva de caixa é especial: é dinheiro guardado, não gasto, por isso não entra no custo. Ela não sai da lista.",
  },
  {
    id: "custos",
    alvo: "#custos",
    titulo: "Custos *fixos*",
    texto: [
      "Tudo o que a agência paga todo mês, mesmo sem projeto: energia, aluguel, softwares, tráfego pago, contador. Se a conta varia, use a média.",
      "Cada custo tem um escopo: da Yang (entra inteiro), compartilhado (entra só com o rateio) ou pessoal (não entra na hora). Dá para ter um valor diferente em cada mês e marcar o que sai do aporte.",
    ],
  },
  {
    id: "capacidade",
    alvo: "#capacidade",
    titulo: "Capacidade de *horas*",
    texto: [
      "Quem trabalha de fato e quantas horas cobráveis cada pessoa entrega por mês. Os custos de pessoas só fazem sentido se as horas delas entrarem aqui.",
      "Quem é compartilhado com outro negócio dá à Yang só a fatia do rateio, igual aos custos.",
    ],
    formula: "Horas cobráveis = horas por mês × ocupação",
    exemplo: "176 horas por mês com 75% de ocupação são 132 horas cobráveis.",
  },
  {
    id: "equipe",
    alvo: "#equipe",
    titulo: "Equipe *fixa*",
    texto: [
      "O salário mensal de quem trabalha fixo na Yang (cadastre as pessoas em Equipe, com o tipo Fixo). Os encargos definidos em Parâmetros são somados ao salário.",
      "Freelancers não entram aqui: o cachê deles vira custo do projeto, no simulador.",
    ],
  },
  {
    id: "equipamentos",
    alvo: "#equipamentos",
    titulo: "Equipamentos e *depreciação*",
    texto: [
      "Informe quanto custou cada item. Com isso a calculadora estima o desgaste mensal e o custo de aluguel de cada equipamento por diária, que é o que um projeto paga quando o convoca.",
      "Sem prazo próprio vale a taxa padrão; com prazo (vida útil em meses), a conta é valor dividido pelos meses.",
    ],
    formula: "Depreciação mensal = valor pago × taxa ao mês (ou valor ÷ vida útil)\nCusto de aluguel por diária = depreciação mensal ÷ diárias de uso por mês",
    exemplo: "Gaiola de R$ 1.500 a 1,6% ao mês: R$ 24,00 por mês; com 8 diárias de uso, R$ 3,00 por diária.",
  },
  {
    id: "kits",
    alvo: "#kits",
    titulo: "Kits de *equipamento*",
    texto: [
      "Conjuntos que saem juntos, como um kit leve para conteúdo simples. No simulador, um clique marca todos os itens do kit.",
      "O custo por diária de um kit é a soma dos itens. Equipamento estragado fica de fora.",
    ],
  },
  {
    id: "fim",
    alvo: "#topo",
    titulo: "Pronto, é *seu*",
    texto: [
      "Agora você sabe de onde cada número nasce. Para rever qualquer parte, use o botão Assistente no topo ou o ponto de interrogação ao lado do título de cada seção, que abre a explicação daquele ponto.",
    ],
  },
];
