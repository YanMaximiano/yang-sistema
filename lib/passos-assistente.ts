// Roteiros dos assistentes guiados de cada tela (texto pré-programado, sem IA). Ver `Passo` em lib/tutoriais.ts.
// Os `alvo` são ids colocados nas próprias páginas; passos cujo alvo não aparece na tela (por falta de
// permissão ou por não haver dados) são omitidos na hora.
import { PASSOS_CALCULADORA } from "@/app/(app)/calculadora/passos";
import type { Passo, Tutorial } from "@/lib/tutoriais";

type Roteiro = { rotulo: string; passos: Passo[] };

export const ROTEIROS: Record<Tutorial, Roteiro> = {
  calculadora: { rotulo: "calculadora", passos: PASSOS_CALCULADORA },

  painel: {
    rotulo: "painel",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Bem-vindo ao *painel*",
        texto: [
          "Aqui você vê, de relance, como a produtora está agora. Só aparecem os blocos das áreas que o administrador liberou para você.",
          "Os números vêm do que é registrado no resto do sistema: propostas, projetos e financeiro.",
        ],
      },
      {
        id: "metricas",
        alvo: "#metricas",
        titulo: "Os *números* do dia",
        texto: [
          "Propostas enviadas e em negociação mostram quantas estão esperando resposta de clientes.",
          "Projetos ativos são os que estão em produção agora. A margem é o que já foi recebido menos os custos lançados.",
        ],
        dica: "Margem em vermelho significa que os custos lançados já passaram do que entrou.",
      },
      {
        id: "financeiro",
        alvo: "#painel-financeiro",
        titulo: "Dinheiro a *receber*",
        texto: [
          "Soma dos recebimentos pendentes (ainda no prazo) e dos atrasados. O atrasado aparece em vermelho.",
          "O link Ver tudo abre o Financeiro, com o detalhe de cada parcela.",
        ],
      },
      {
        id: "projetos",
        alvo: "#painel-projetos",
        titulo: "Projetos em *produção*",
        texto: [
          "Os projetos ativos mais recentes, com o cliente e o serviço. Clique em um para abrir a ficha com pipeline, entregas e documentos.",
        ],
      },
    ],
  },

  catalogo: {
    rotulo: "catálogo",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "O *catálogo* da Yang",
        texto: [
          "Aqui ficam tudo o que a Yang vende, organizado em pilares, serviços, planos e adicionais. Tudo é editável, sem precisar de ajuda técnica.",
          "As propostas puxam os preços e as etapas daqui, então manter o catálogo em dia deixa o resto do sistema certo.",
        ],
      },
      {
        id: "novo-pilar",
        alvo: "#novo-pilar",
        titulo: "Criar um *pilar*",
        texto: [
          "Pilar é um grande grupo de serviços, como Conteúdo para Empresas ou Casamentos. Escreva o nome e clique em Adicionar pilar.",
        ],
      },
      {
        id: "pilares",
        alvo: "#lista-pilares",
        titulo: "Serviços de cada *pilar*",
        texto: [
          "Cada cartão é um serviço, com o tipo de cobrança (projeto único, recorrência mensal ou locação por hora), o número de planos e a faixa de valor.",
          "Clique em um serviço para editar planos, adicionais, etapas e modelos de documento. Em Adicionar serviço a este pilar você cria um novo.",
        ],
        dica: "Desativar um pilar ou serviço tira ele da lista de novas propostas, mas preserva o histórico.",
      },
    ],
  },

  servico: {
    rotulo: "serviço do catálogo",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Editando um *serviço*",
        texto: [
          "Esta tela concentra tudo de um serviço: dados, planos, adicionais, etapas de produção e modelos de documento.",
          "Cada bloco tem o seu botão de salvar; o que você muda vale para as próximas propostas e projetos.",
        ],
      },
      {
        id: "dados",
        alvo: "#servico-dados",
        titulo: "Dados do *serviço*",
        texto: ["Nome, tipo de cobrança, descrição e se o serviço está ativo. Ao desativar, ele deixa de aparecer na criação de propostas."],
      },
      {
        id: "planos",
        alvo: "#servico-planos",
        titulo: "Os *planos*",
        texto: [
          "Plano é uma versão do serviço com faixa de valor (mínimo e máximo). A proposta usa essa faixa como referência.",
          "Dentro de cada plano, Equipe e equipamento sugeridos aparecem como sugestão na ficha do projeto, para ajudar na hora de escalar.",
        ],
      },
      {
        id: "adicionais",
        alvo: "#servico-adicionais",
        titulo: "Os *adicionais*",
        texto: ["Extras que podem ser somados a qualquer plano deste serviço, como drone, entrega expressa ou diária extra, cada um com seu valor."],
      },
      {
        id: "pipeline",
        alvo: "#servico-pipeline",
        titulo: "Pipeline de *etapas*",
        texto: [
          "A sequência de etapas de produção (briefing, roteiro, captação, edição e assim por diante). Todo projeto novo deste serviço recebe uma cópia dela.",
          "Use as setas para reordenar e o formulário no fim para criar etapas.",
        ],
        dica: "Mudar o pipeline aqui não altera projetos que já começaram.",
      },
      {
        id: "modelos",
        alvo: "#servico-modelos",
        titulo: "Modelos de *documento*",
        texto: [
          "Contratos e termos reaproveitáveis. Dentro do texto, marcadores entre chaves duplas são trocados pelos dados do projeto na hora de gerar o documento.",
        ],
        exemplo: "{{cliente.nome}}, {{projeto.valor}} e {{projeto.prazoData}}.",
      },
    ],
  },

  clientes: {
    rotulo: "clientes",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Seus *clientes*",
        texto: ["O cadastro de quem compra da Yang. Cada cliente reúne propostas, projetos, notas internas e, se quiser, um acesso ao portal."],
      },
      {
        id: "novo",
        alvo: "#novo-cliente",
        titulo: "Cadastrar um *cliente*",
        texto: [
          "Só o nome é obrigatório. Informe a origem (indicação, Instagram, site) para descobrir de onde vêm os melhores clientes.",
        ],
      },
      {
        id: "lista",
        alvo: "#lista-clientes",
        titulo: "A *lista*",
        texto: [
          "Cada linha mostra a empresa, a origem, quantas propostas e projetos o cliente tem e o status do relacionamento. Clique para abrir a ficha completa.",
        ],
      },
    ],
  },

  cliente: {
    rotulo: "ficha do cliente",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Ficha do *cliente*",
        texto: ["Tudo sobre um cliente num lugar só: dados, histórico comercial, acesso ao portal e anotações."],
      },
      {
        id: "dados",
        alvo: "#cliente-dados",
        titulo: "Dados e *relacionamento*",
        texto: ["Edite contato, origem e o status do relacionamento. Lembre de clicar em salvar no fim do bloco."],
      },
      {
        id: "historico",
        alvo: "#cliente-historico",
        titulo: "Propostas e *projetos*",
        texto: ["O histórico do cliente com a Yang. Clique em qualquer item para abrir a proposta ou o projeto."],
      },
      {
        id: "portal",
        alvo: "#cliente-portal",
        titulo: "Acesso ao *portal*",
        texto: [
          "Crie um login para o cliente acompanhar projetos, aprovar entregas, assinar documentos e responder propostas sem falar com ninguém da equipe.",
          "O cliente só enxerga o que é dele.",
        ],
        dica: "Combine uma senha inicial e peça para ele trocar em Minha conta.",
      },
      {
        id: "notas",
        alvo: "#cliente-notas",
        titulo: "Notas *internas*",
        texto: ["Anotações da equipe sobre o cliente, como preferências e combinados. O cliente nunca vê estas notas."],
      },
    ],
  },

  propostas: {
    rotulo: "propostas",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "O funil de *propostas*",
        texto: [
          "Todas as propostas, organizadas por fase. Abaixo do título aparece a taxa de conversão: quantas foram aprovadas do total.",
          "Para criar uma, use o botão Nova proposta.",
        ],
      },
      {
        id: "funil",
        alvo: "#funil",
        titulo: "As quatro *fases*",
        texto: [
          "Enviada, Em negociação, Aprovada e Recusada. Cada cartão mostra o cliente, o serviço, o plano e o valor.",
          "Clique em um cartão para mudar a fase. Ao aprovar, o sistema cria o projeto sozinho, já com o pipeline do serviço.",
        ],
      },
    ],
  },

  "proposta-nova": {
    rotulo: "nova proposta",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Nova *proposta*",
        texto: ["Monte a proposta em ordem: cliente, serviço, plano e adicionais."],
      },
      {
        id: "form",
        alvo: "#form-proposta",
        titulo: "Preencha em *ordem*",
        texto: [
          "Escolher o serviço libera os planos dele, e o plano libera os adicionais. O valor proposto parte da faixa do plano, mas você pode ajustar.",
          "Depois de criada, a proposta entra no funil como Enviada.",
        ],
        dica: "O cliente ainda não existe? Cadastre em Clientes primeiro.",
      },
    ],
  },

  proposta: {
    rotulo: "proposta",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Uma *proposta*",
        texto: ["Os detalhes da proposta e a ação de avançar o negócio."],
      },
      {
        id: "resumo",
        alvo: "#proposta-resumo",
        titulo: "O que foi *proposto*",
        texto: ["Cliente, serviço, plano, valor e adicionais incluídos."],
      },
      {
        id: "status",
        alvo: "#proposta-status",
        titulo: "Avançar a *negociação*",
        texto: [
          "Mova para negociação, aprove ou recuse. Aprovar cria o projeto automaticamente, com o pipeline e o checklist do serviço, e o link Ver projeto criado aparece aqui.",
        ],
        dica: "O cliente também pode aprovar ou recusar sozinho pelo portal.",
      },
    ],
  },

  projetos: {
    rotulo: "projetos",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Pipeline de *projetos*",
        texto: [
          "Todos os projetos da Yang. Eles nascem de propostas aprovadas, ou você cria um avulso pelo botão no topo para casos fora do fluxo normal.",
        ],
      },
      {
        id: "lista",
        alvo: "#lista-projetos",
        titulo: "Cada *projeto*",
        texto: [
          "Mostra o cliente, o serviço, quantas etapas já foram concluídas, o prazo, a etapa atual e o status geral. Clique para abrir a ficha de produção.",
        ],
      },
    ],
  },

  "projeto-novo": {
    rotulo: "novo projeto avulso",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Projeto *avulso*",
        texto: ["Para trabalhos que não passaram por uma proposta no sistema."],
      },
      {
        id: "form",
        alvo: "#form-projeto",
        titulo: "Cliente e *serviço*",
        texto: [
          "Escolha o cliente e o serviço. O pipeline de etapas e o checklist de pré-produção são copiados do serviço escolhido.",
          "Dê um nome ao projeto e defina o valor e o prazo; o plano de referência é opcional. O resto você acompanha na ficha do projeto.",
        ],
      },
    ],
  },

  projeto: {
    rotulo: "projeto",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "A ficha do *projeto*",
        texto: [
          "Tudo da produção num lugar só, de cima para baixo na ordem do trabalho. No canto fica o status geral (ativo, pausado, concluído).",
        ],
      },
      {
        id: "checklist",
        alvo: "#projeto-checklist",
        titulo: "Checklist de *pré-produção*",
        texto: ["Itens que precisam estar prontos antes de gravar. Marque conforme avança; o contador mostra quantos já foram concluídos."],
      },
      {
        id: "financeiro",
        alvo: "#projeto-financeiro",
        titulo: "*Financeiro* do projeto",
        texto: ["Recebimentos, custos e margem deste projeto. Só aparece para quem tem a área Valores liberada."],
      },
      {
        id: "pipeline",
        alvo: "#projeto-pipeline",
        titulo: "O *pipeline*",
        texto: [
          "Cada cartão é uma etapa. Inicie, avance, volte ou reabra. O cliente acompanha este andamento pelo portal.",
        ],
      },
      {
        id: "entregas",
        alvo: "#projeto-entregas",
        titulo: "Entregas e *versões*",
        texto: [
          "Cole o link (Drive, WeTransfer, Frame.io) de cada versão. O cliente aprova ou pede ajustes pelo portal, e o comentário dele aparece aqui.",
        ],
      },
      {
        id: "documentos",
        alvo: "#projeto-documentos",
        titulo: "Documentos e *assinatura*",
        texto: [
          "Gere contratos a partir dos modelos do catálogo, com os dados do projeto já preenchidos, e envie para assinatura eletrônica do cliente. Também dá para só anexar um link de documento pronto.",
        ],
      },
      {
        id: "equipamento",
        alvo: "#projeto-equipamento",
        titulo: "*Equipamento* alocado",
        texto: [
          "Reserve os equipamentos por data. O sistema avisa quando o mesmo item está em outro projeto no mesmo dia.",
          "Use o checklist de cada item para conferir saída e devolução.",
        ],
      },
      {
        id: "equipe",
        alvo: "#projeto-equipe",
        titulo: "*Equipe* escalada",
        texto: ["Escale profissionais por data e função. Assim como nos equipamentos, o sistema avisa se alguém já está escalado em outro projeto no dia."],
      },
    ],
  },

  calendario: {
    rotulo: "calendário",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Calendário de *prazos*",
        texto: ["Os prazos dos projetos ativos mês a mês. Use as setas do topo para mudar de mês."],
      },
      {
        id: "atrasados",
        alvo: "#calendario-atrasados",
        titulo: "Prazos *vencidos*",
        texto: ["Projetos ativos que já passaram do prazo aparecem neste aviso, para você resolver primeiro."],
      },
      {
        id: "grade",
        alvo: "#grade-calendario",
        titulo: "A *grade*",
        texto: [
          "Cada projeto aparece no dia do prazo; clique nele para abrir a ficha. O dia de hoje tem a borda mais marcada, e os dias de outros meses ficam esmaecidos.",
        ],
      },
    ],
  },

  equipamentos: {
    rotulo: "equipamentos",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Seus *equipamentos*",
        texto: ["O inventário da Yang e a disponibilidade de cada item. É daqui que saem as alocações nos projetos."],
      },
      {
        id: "novo",
        alvo: "#novo-equipamento",
        titulo: "Cadastrar um *item*",
        texto: ["Nome, categoria, observações e uma foto (JPG, PNG ou WebP, até 5 MB). A foto fica guardada no próprio sistema."],
      },
      {
        id: "lista",
        alvo: "#lista-equipamentos",
        titulo: "Status de cada *item*",
        texto: [
          "Disponível, em manutenção ou estragado: marque pelos botões do cartão. Item estragado fica fora dos cálculos e das alocações.",
          "Quem tem a área Calculadora vê também o custo de aluguel por diária, que é a depreciação do equipamento.",
          "Em Editar você corrige os dados; Desativar tira o item da lista de uso sem apagar o histórico.",
        ],
      },
    ],
  },

  equipe: {
    rotulo: "equipe",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "A *equipe*",
        texto: ["Os profissionais que trabalham nos projetos: fixos e freelancers."],
      },
      {
        id: "novo",
        alvo: "#novo-profissional",
        titulo: "Cadastrar *profissional*",
        texto: [
          "Informe função, tipo (fixo ou freelancer), diária padrão e contato. A diária padrão serve de referência para o custo de cada escala.",
        ],
        dica: "Isto não cria um login. Quem precisa entrar no sistema é cadastrado em Usuários.",
      },
      {
        id: "lista",
        alvo: "#lista-equipe",
        titulo: "Quem está *ativo*",
        texto: ["Desative quem não trabalha mais com a Yang: a pessoa some das escalas novas e o histórico continua."],
      },
    ],
  },

  avisos: {
    rotulo: "avisos",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Central de *avisos*",
        texto: ["Tudo o que precisa de atenção reunido aqui: prazos vencidos, pagamentos atrasados e propostas paradas."],
      },
      {
        id: "lista",
        alvo: "#lista-avisos",
        titulo: "Cada *aviso*",
        texto: [
          "Clique no aviso para ir direto ao projeto ou à proposta. O número no menu lateral mostra quantos avisos existem agora.",
        ],
        dica: "O aviso some quando a pendência é resolvida, por exemplo ao registrar o pagamento.",
      },
    ],
  },

  financeiro: {
    rotulo: "financeiro",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Margens e *recebimentos*",
        texto: ["A saúde financeira da produtora: quanto entra, quanto sai e onde está o lucro."],
      },
      {
        id: "metricas",
        alvo: "#metricas",
        titulo: "O *resumo*",
        texto: ["Totais de recebimentos, custos e margem, somando todos os projetos."],
      },
      {
        id: "fluxo",
        alvo: "#financeiro-fluxo",
        titulo: "Fluxo de caixa *projetado*",
        texto: ["Os próximos meses com o que deve entrar (parcelas a receber) e o que deve sair, para você enxergar apertos antes que aconteçam."],
      },
      {
        id: "pilar",
        alvo: "#financeiro-pilar",
        titulo: "Margem por *pilar*",
        texto: ["Em quais grandes áreas da Yang o dinheiro está sobrando ou faltando."],
      },
      {
        id: "servico",
        alvo: "#financeiro-servico",
        titulo: "Margem por *serviço*",
        texto: ["O mesmo olhar, serviço a serviço. Ajuda a decidir o que vale a pena vender mais e o que precisa de reajuste de preço."],
      },
      {
        id: "recebimentos",
        alvo: "#financeiro-recebimentos",
        titulo: "A *receber* e atrasados",
        texto: ["As parcelas pendentes e atrasadas, com o projeto de cada uma. Clique para abrir o projeto e registrar o pagamento."],
      },
      {
        id: "projeto",
        alvo: "#financeiro-projeto",
        titulo: "Margem por *projeto*",
        texto: ["O resultado de cada projeto: o que foi recebido menos os custos lançados nele."],
        dica: "Margem negativa quase sempre é custo lançado que não foi repassado no preço. Compare com a Calculadora.",
      },
    ],
  },

  usuarios: {
    rotulo: "usuários",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Usuários e *acessos*",
        texto: ["Quem entra no sistema e o que cada pessoa pode ver. Só o administrador abre esta tela."],
      },
      {
        id: "novo",
        alvo: "#novo-usuario",
        titulo: "Criar um *login*",
        texto: [
          "Defina nome, e-mail, uma senha inicial e o perfil (Equipe, Freelancer ou Admin). O perfil é só o ponto de partida das permissões.",
        ],
      },
      {
        id: "lista",
        alvo: "#lista-usuarios",
        titulo: "Áreas *liberadas*",
        texto: [
          "Em cada pessoa, o botão Áreas liberadas deixa você marcar exatamente quais telas ela acessa. A mudança vale na hora.",
          "Você também pode trocar o perfil, definir uma nova senha ou desativar a pessoa.",
        ],
        dica: "Administrador sempre acessa tudo. Para limitar alguém, deixe-o como Equipe ou Freelancer e marque só as áreas dele.",
      },
    ],
  },

  conta: {
    rotulo: "minha conta",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Minha *conta*",
        texto: ["Aqui você cuida do seu próprio acesso."],
      },
      {
        id: "senha",
        alvo: "#trocar-senha",
        titulo: "Trocar a *senha*",
        texto: ["Informe a senha atual e a nova (mínimo de 8 caracteres, diferente da anterior) duas vezes."],
        dica: "Prefira uma senha longa que você não use em outros lugares.",
      },
    ],
  },

  portal: {
    rotulo: "portal do cliente",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Seu *portal*",
        texto: ["Aqui você acompanha tudo o que está sendo feito pela Yang para você, sem precisar pedir atualização."],
      },
      {
        id: "propostas",
        alvo: "#portal-propostas",
        titulo: "Propostas para *responder*",
        texto: ["Propostas que aguardam a sua decisão. Abra uma para ver os detalhes e aprovar ou recusar."],
      },
      {
        id: "projetos",
        alvo: "#portal-projetos",
        titulo: "Seus *projetos*",
        texto: ["Cada projeto com o prazo e o status. Clique para ver o andamento, aprovar entregas, assinar documentos e consultar as parcelas."],
      },
    ],
  },

  "portal-projeto": {
    rotulo: "projeto no portal",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Acompanhe o *projeto*",
        texto: ["Tudo do seu projeto: onde ele está, o que precisa da sua aprovação e o que falta assinar."],
      },
      {
        id: "andamento",
        alvo: "#portal-andamento",
        titulo: "O *andamento*",
        texto: ["As etapas da produção, da primeira à última, com o status de cada uma."],
      },
      {
        id: "entregas",
        alvo: "#portal-entregas",
        titulo: "Entregas para *aprovação*",
        texto: [
          "Quando a Yang envia uma versão, ela aparece aqui com o link para assistir. Aprove, ou peça ajustes escrevendo o que deve mudar.",
        ],
        dica: "Seja específico no comentário (por exemplo, o minuto do vídeo): isso agiliza os ajustes.",
      },
      {
        id: "documentos",
        alvo: "#portal-documentos",
        titulo: "Documentos para *assinar*",
        texto: ["Leia o documento e, estando de acordo, digite seu nome completo para assinar. A data e o registro da assinatura ficam guardados."],
      },
      {
        id: "financeiro",
        alvo: "#portal-financeiro",
        titulo: "Suas *parcelas*",
        texto: ["Os valores e vencimentos do projeto, e quais já foram pagos."],
      },
    ],
  },

  "portal-proposta": {
    rotulo: "proposta no portal",
    passos: [
      {
        id: "inicio",
        alvo: "#cabecalho-pagina",
        titulo: "Sua *proposta*",
        texto: ["O que a Yang está propondo para você."],
      },
      {
        id: "resumo",
        alvo: "#proposta-resumo",
        titulo: "O que está *incluído*",
        texto: ["Serviço, plano, valor e os adicionais escolhidos. Confira antes de decidir."],
      },
      {
        id: "decisao",
        alvo: "#proposta-decisao",
        titulo: "Sua *decisão*",
        texto: [
          "Ao aprovar, a Yang começa o projeto e você passa a acompanhá-lo aqui no portal. Se preferir não seguir, é só recusar.",
        ],
      },
    ],
  },
};
