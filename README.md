# Yang — Sistema de Gestão

Sistema de gestão para a Yang (produtora audiovisual full-service): catálogo de serviços,
propostas, clientes (CRM), projetos com pipeline customizável, prazos/calendário, financeiro
(recebimentos, custos, margem e fluxo de caixa projetado), equipamentos, equipe e portal do cliente.

## Stack

- Next.js 16 (App Router, TypeScript, Server Actions)
- Prisma 7 + PostgreSQL (via driver adapter `@prisma/adapter-pg`)
- Auth.js (NextAuth v5) — login por e-mail/senha, perfis ADMIN/EQUIPE/FREELANCER/CLIENTE
- Tailwind CSS (com modo escuro)

Requisitos: **Node.js 20.19+** e **PostgreSQL 14+**.

---

## Deploy em produção

### 1. Variáveis de ambiente

Veja [`.env.example`](.env.example). Cadastre no painel da hospedagem (nunca commite o `.env`):

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão PostgreSQL. Se a hospedagem exigir SSL, termine com `?sslmode=require` |
| `AUTH_SECRET` | sim | Assina os logins. Gere um **novo** para produção: `openssl rand -base64 32` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | só no 1º seed | Criam o primeiro administrador (ver passo 2) |

### 2. Passo a passo

```bash
npm ci                          # instala dependências (precisa das devDependencies: build usa typescript/tsx)
npx prisma migrate deploy       # cria/atualiza as tabelas — rodar a cada deploy
ADMIN_EMAIL=voce@empresa.com ADMIN_PASSWORD='uma-senha-forte' npm run db:seed
npm run build
npm start                       # sobe na porta 3000 (use PORT=... para mudar)
```

- **Em produção use sempre `prisma migrate deploy`** — nunca `db push` (que serve só para desenvolvimento local).
- O `db:seed` carrega o catálogo de 21 serviços com os preços atualizados (`prisma/catalogo-fonte.json`:
  cada plano tem preço de **lançamento** = mínimo e de **tabela** = máximo), o inventário de equipamentos
  (`prisma/equipamentos-fonte.json`, com as fotos de `public/equipamentos/`), os kits e a capacidade
  iniciais da calculadora e o primeiro administrador. É seguro de rodar de novo: **não** recria o que já
  existe (as edições feitas em `/catalogo`, `/equipamentos` e `/calculadora` são preservadas) e **não**
  mexe em admin existente. Para reaplicar os preços do catálogo sobre um banco já em uso:
  `SEED_FORCE=1 npm run db:seed` — atualiza planos e adicionais sem apagar nada que propostas e projetos
  usem, mas **sobrescreve** preços e entregas editados na tela.
- **Dados financeiros privados** (pró-labore, salários, aporte, valor de compra dos equipamentos) não ficam
  no Git. O seed lê `prisma/dados-privados.json` (ignorado pelo Git; modelo em
  `prisma/dados-privados.exemplo.json`). Sem esse arquivo a calculadora começa vazia e o preenchimento é feito
  nas telas `/calculadora` e `/equipamentos`. Se o dono quiser levar os valores reais, deve entregar o arquivo
  ao responsável pelo deploy por um canal privado, colocá-lo em `prisma/` **antes** do primeiro
  `npm run db:seed` e apagá-lo do servidor depois.
- O sistema começa **sem clientes, projetos ou propostas** — os dados de teste do ambiente de
  desenvolvimento não vão para produção. Para levar dados existentes, use `pg_dump`/`pg_restore`.
- Depois do primeiro login, troque a senha em **"Alterar minha senha"** (menu lateral, `/conta`) e cadastre a equipe em **/usuarios**. Senhas novas precisam de pelo menos 8 caracteres.

### 3. Pontos de atenção da hospedagem

- **HTTPS e proxy reverso**: o app precisa receber os cabeçalhos `Host`/`X-Forwarded-Host` e
  `X-Forwarded-Proto` originais. As Server Actions do Next validam a origem da requisição e os cookies
  de login só são marcados como seguros sob HTTPS; se esses cabeçalhos forem perdidos, formulários
  falham e o login pode não persistir.
- **Fotos de equipamentos** ficam no próprio banco (tabela `EquipamentoFoto`, até 5 MB cada), então
  **não é necessário disco persistente** e o backup do Postgres cobre tudo. As fotos do catálogo inicial
  (`public/equipamentos/`) vão junto com o código.
- **Fuso horário**: o processo é fixado em `America/Sao_Paulo` (`next.config.ts`), independente do
  fuso do servidor — "hoje" e "atrasado" seguem o horário de Brasília.
- **Backup**: faça backup periódico do PostgreSQL; é onde está todo o dado do sistema.
- **IP da assinatura eletrônica**: o sistema registra o primeiro IP de `X-Forwarded-For`. Configure o proxy para
  **sobrescrever** esse cabeçalho (e não repassar o que vier do cliente), senão o IP registrado pode ser forjado.
- **Login sem limite de tentativas**: não há rate limiting nesta versão. Se o sistema ficar exposto
  na internet, aplique limitação de requisições na borda (Cloudflare, nginx etc.) para `/login`.
- **Repositório privado**: `prisma/catalogo-fonte.json` contém o catálogo de preços real da empresa.

---

## Desenvolvimento local

Este projeto usa **`prisma dev`**, um Postgres local gerenciado pelo Prisma CLI — não precisa de
Docker nem de instalar Postgres. Copie `.env.example` para `.env` (a `DATABASE_URL` local é a que
`npx prisma dev ls` mostrar, em "TCP", trocando o banco por `yang`).

```bash
npm install
npx prisma dev -d --name yang-db   # sobe o banco local (repita após reiniciar o computador)
npx prisma db push                 # cria/atualiza as tabelas
ADMIN_EMAIL=voce@empresa.com ADMIN_PASSWORD='senha' npm run db:seed
npm run dev                        # http://localhost:3000
```

Para ver se o banco está rodando: `npx prisma dev ls`. Para parar: `npx prisma dev stop`.

> **Migrações**: o Postgres do `prisma dev` usa um banco único para qualquer nome, o que quebra o
> *shadow database* do `prisma migrate dev` (erro `P3006`/"type already exists"). Por isso, em
> desenvolvimento aplica-se o schema com `npx prisma db push`. Ao mudar o `schema.prisma` de forma que
> deva ir para produção, gere o SQL incremental com
> `npx prisma migrate diff --from-schema <schema antigo> --to-schema prisma/schema.prisma --script`
> e salve em uma nova pasta `prisma/migrations/<timestamp>_<nome>/migration.sql`. A pasta
> `prisma/migrations` hoje contém uma migração *baseline* com o schema completo.

### Atalho no desktop (Mac do Yan)

Há um atalho **"Abrir Yang.command"** no Desktop: dois cliques sobem o banco local (se não estiver
rodando), iniciam o servidor na porta `3002` e abrem o navegador.

### Scripts úteis

- `npm run dev` — servidor de desenvolvimento
- `npm run build` / `npm start` — build e execução de produção
- `npm run lint` — ESLint
- `npm run db:seed` — cria catálogo, equipamentos, kits, capacidade e primeiro admin (o que já existe é preservado)
- `npm run db:studio` — Prisma Studio para inspecionar os dados

---

## Escopo desta versão

- Catálogo de serviços (pilares, serviços, planos, adicionais, pipeline de etapas, checklist de
  pré-produção, modelos de documento) — totalmente editável pela tela de admin em `/catalogo`
- Clientes (CRM) com notas internas e funil de status
- Propostas: cliente → serviço → plano → adicionais, com aprovação que cria o projeto
  automaticamente
- Projetos com pipeline Kanban (etapas customizáveis por serviço), versionamento de entregas,
  checklist de pré-produção, documentos e contratos com assinatura eletrônica nativa
- Calendário de prazos com destaque de atrasados
- Financeiro: recebimentos, custos e margem por projeto/pilar/serviço, e fluxo de caixa projetado
  para os próximos 6 meses
- Equipamentos (inventário com foto, alocação por projeto, alerta de conflito de agenda) e
  equipe/escala de profissionais (mesma lógica de conflito)
- Portal do cliente: aprovação de proposta, avaliação de entregas, assinatura de documentos
- Central de avisos internos (prazos, pagamentos, propostas paradas) e modo escuro

Fora de escopo por enquanto: notificações automáticas por e-mail/WhatsApp (sem conta de envio
configurada) e modo offline/desktop.
