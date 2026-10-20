# Trabalho no iGanhei - Guia para o André

## Contexto
- Repositório: `git@github.com:julianomcaldeira/iganheiapresentacao.git` (branch `main`)
- O Render está conectado ao repo e faz **deploy automático a cada push na `main`**.
- Projeto Supabase: `jkhhyoxwbfvwdbggromg` (URL `https://jkhhyoxwbfvwdbggromg.supabase.co`)
- Login do André: `andre@startgi.com.br` / `Startgi2026@` (role admin)

## Como trabalhar com o opencode

1. Abra o terminal na pasta do projeto:
   ```bash
   cd ~/Documents/.../iganheiapresentacao   # ajuste o caminho
   ```
2. Sempre puxe antes de começar:
   ```bash
   git pull origin main
   ```
3. Inicie o opencode:
   ```bash
   opencode
   ```
4. Descreva a tarefa em português (ex.: "adicionar filtro por data na tela de tarefas").
5. Revise o diff antes de commitar:
   ```bash
   git diff
   ```
6. Commit + push (isso dispara o deploy no Render):
   ```bash
   git add -A
   git commit -m "descrição curta do que mudou"
   git push origin main
   ```

## Deploy no Render (automático)

- Cada `git push origin main` dispara um build no Render.
- Acompanhe em https://dashboard.render.com → serviço **iganhei** → aba **Events/Logs**.
- Build command: `npm install && npm run build` | Publish dir: `dist`.
- Variáveis de ambiente já configuradas no Render (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) — não mexer.
- Se o build falhar: leia o log, corrija o código, commit + push novamente.
- Domínio final: `startgiteste.com.br` (DNS já apontado no Registro.br).

## Comandos úteis

```bash
npm run dev            # roda local em http://www.iganheinovo.com.br (precisa /etc/hosts)
npm run build          # build de produção
npm run lint           # lint
npx tsc --noEmit -p tsconfig.app.json   # typecheck
```

## Regras do time

- Sempre `git pull` antes de trabalhar.
- Nunca commitar `.env` (está no `.gitignore`).
- Não editar `supabase/.temp/` (gitignored).
- Migrations novas vão em `supabase/migrations/` com prefixo de timestamp.
- Seed de demo está em `supabase/seed-demo.sql`.
- Cache de leitura (60s) em `src/integrations/supabase/cachedFetch.ts`: após mudar dados no banco, espere até 1 min ou limpe o cache.

## Cuidados importantes

- RLS por cliente: usuário não-admin vê apenas o próprio `cliente_id` (vem de `profiles.cliente_id`).
- Auth: não remover a lógica de `TOKEN_REFRESHED` no `AuthContext` (evita reload de tela).
- Não alterar `src/integrations/supabase/client.ts` sem necessidade (config do cache).
- Edge Functions estão em `supabase/functions/` e são deployadas separadamente via Supabase CLI.

## Se algo quebrar em produção

1. Verifique os logs do Render (build + runtime).
2. Reverta o último commit se necessário:
   ```bash
   git revert HEAD && git push origin main
   ```
3. Teste localmente com `npm run build` antes de pushar.
