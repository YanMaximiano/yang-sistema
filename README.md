# Yang — Sistema de Gestão

Sistema de gestão para a Yang (produtora audiovisual full-service): catálogo de serviços,
propostas, clientes (CRM), projetos com pipeline customizável, prazos/calendário e financeiro
básico (recebimentos, custos e margem).

## Stack

- Next.js 16 (App Router, TypeScript, Server Actions)
- Prisma 7 + PostgreSQL (via driver adapter `@prisma/adapter-pg`)
- Auth.js (NextAuth v5) — login por e-mail/senha, perfis ADMIN/EQUIPE/FREELANCER/CLIENTE
- Tailwind CSS

## Banco de dados local

Este projeto usa **`prisma dev`**, um Postgres local gerenciado pelo próprio Prisma CLI —
não precisa de Docker nem de instalar Postgres manualmente.

Antes de rodar o app pela primeira vez (ou depois de reiniciar o computador), suba o banco:

```bash
npx prisma dev -d --name yang-db
```

Isso inicia um Postgres local em background. Para ver se está rodando: `npx prisma dev ls`.
Para parar: `npx prisma dev stop`.

A connection string já está configurada em `.env` (`DATABASE_URL`), apontando para esse
banco local. Se a porta mudar (raro), ajuste o `.env` com o valor que `prisma dev ls` mostrar.

## Primeira configuração

```bash
npm install
npx prisma dev -d --name yang-db   # sobe o banco local
npx prisma db push                 # cria/atualiza as tabelas
npm run db:seed                    # popula o catálogo com os 21 serviços reais + usuário admin
npm run dev                        # inicia o app em http://localhost:3000
```

> **Nota sobre migrações**: use `npx prisma db push` para aplicar mudanças de schema neste projeto,
> não `prisma migrate dev` — o banco de sombra (*shadow database*) que o `migrate dev` usa para
> validar migrações não funciona de forma confiável com o Postgres local do `prisma dev` neste
> ambiente (erro `P3006`/tipo já existe). `db push` aplica direto no banco de trabalho sem depender
> do shadow db; para produção mais adiante, vale revisitar isso com um Postgres hospedado de verdade.

Login inicial (admin): `yanfmaxi@gmail.com` / senha própria já definida — ainda não há tela de
troca de senha nesta versão; pode ser atualizada direto no banco via `npx prisma studio` ou
recriando o usuário.

## Atalho no desktop

Há um atalho **"Abrir Yang.command"** no Desktop: dá dois cliques e ele sobe o banco local (se
não estiver rodando), inicia o servidor na porta `3002` (evita conflito com outros apps que já
usam a 3000/3001 nesta máquina) e abre o navegador — sem precisar do terminal. Se o app já
estiver rodando (ex.: aberto por outra ferramenta), só abre o navegador direto.

## Scripts úteis

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run db:seed` — roda o seed do catálogo novamente (idempotente para pilares/serviços)
- `npm run db:studio` — abre o Prisma Studio para inspecionar os dados

## Escopo desta versão (MVP — Fase 1)

- Catálogo de serviços (pilares, serviços, planos, adicionais, pipeline de etapas) — totalmente
  editável pela tela de admin em `/catalogo`
- Clientes (CRM) com notas internas e funil de status
- Propostas: cliente → serviço → plano → adicionais, com aprovação que cria o projeto
  automaticamente
- Projetos com pipeline Kanban (etapas customizáveis por serviço), versionamento de entregas
- Calendário de prazos com destaque de atrasados
- Financeiro básico: recebimentos, custos e margem por projeto/pilar

Fora de escopo por enquanto (fases seguintes): equipamentos, escala de profissionais, portal
completo do cliente, contratos/assinatura digital, notificações automáticas, modo offline/desktop.
