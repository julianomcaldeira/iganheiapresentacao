# Configuração Local - iGanhei

## Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+)
- Git
- Conta GitHub com acesso ao repositório

## Passo 1 — Clonar o repositório

```bash
git clone git@github.com:julianomcaldeira/iganheiapresentacao.git
cd iganheiapresentacao
```

## Passo 2 — Instalar dependências

```bash
npm install
```

## Passo 3 — Configurar o DNS local

O app roda com o endereço `www.iganheinovo.com.br`. Para que o navegador resolva esse endereço para o seu computador:

Abra o Terminal e rode:

```bash
sudo sh -c 'echo "127.0.0.1 www.iganheinovo.com.br" >> /etc/hosts'
```

Digite sua senha de admin do Mac quando solicitado.

## Passo 4 — Iniciar o servidor

```bash
npm run dev
```

O servidor vai iniciar. Acesse no navegador:

**http://www.iganheinovo.com.br**

## Trabalhando em equipe (git)

### Antes de começar a trabalhar:
```bash
git pull origin main
```

### Depois de fazer alterações:
```bash
git add -A
git commit -m "descreva o que você fez"
git push origin main
```

### Fluxo recomendado:
1. `git pull` antes de começar
2. Faça suas alterações
3. `git add -A && git commit -m "mensagem" && git push`
4. O outro desenvolvedor roda `git pull` para pegar suas alterações
5. O Vite recarrega automaticamente quando os arquivos mudam
