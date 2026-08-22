# Chatbem

Chamada de grupo (voz, vídeo e compartilhamento de tela) para 5-10 amigos, direto do navegador.

- **Frontend**: Next.js, hospedado na Vercel via GitHub (deploy automático a cada push).
- **Áudio/vídeo/tela**: [LiveKit Cloud](https://cloud.livekit.io) (camada gratuita: 5.000 minutos-participante e 50 GB/mês).

Como funciona: a Vercel só serve as páginas e gera um token de acesso curto por pessoa
(`/api/token`). A mídia (voz, câmera, tela) nunca passa pelo servidor — vai direto pelo
LiveKit, que também cuida da parte pesada de rotear vídeo entre até ~10 pessoas sem
sobrecarregar quem tem PC/internet mais fraco.

## 1. Criar a conta no LiveKit Cloud (grátis)

1. Crie uma conta em https://cloud.livekit.io (sem cartão de crédito).
2. Crie um projeto.
3. Em **Settings → Keys**, copie o **API Key**, o **API Secret** e a **WebSocket URL**
   (algo como `wss://seu-projeto.livekit.cloud`).

## 2. Rodar localmente

```bash
cp .env.local.example .env.local
# edite .env.local e cole as três chaves do LiveKit

npm install
npm run dev
```

Abra http://localhost:3000, crie uma sala e teste com uma segunda aba (ou o celular na
mesma rede) para simular um amigo entrando.

## 3. Subir para o GitHub

```bash
git init                 # se ainda não tiver rodado
git add .
git commit -m "Chatbem: chamada em grupo com LiveKit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/chatbem.git
git push -u origin main
```

(Crie o repositório vazio antes em https://github.com/new — sem README/gitignore, para
não conflitar com o que já existe aqui.)

## 4. Deploy na Vercel

1. Em https://vercel.com/new, importe o repositório `chatbem` do GitHub.
2. Em **Environment Variables**, adicione as mesmas três chaves do passo 1:
   `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`.
3. Deploy. A cada `git push` para `main`, a Vercel publica a versão nova automaticamente.

## Estrutura

- `src/app/page.tsx` — tela inicial: criar/entrar em uma sala.
- `src/app/sala/[room]/` — tela da sala: pede o nome e conecta na chamada.
- `src/app/api/token/route.ts` — gera o token de acesso do LiveKit para cada pessoa.
- `src/app/globals.css` — paleta e tokens de cor (tema claro/escuro).

## Segurança da sala

O nome da sala funciona como uma senha simples (quem tem o link, entra). Para um grupo
fixo de amigos isso é suficiente. Se quiser mais controle (lista de convidados, expulsar
alguém, etc.), o próximo passo natural é validar o nome contra uma lista fixa dentro de
`src/app/api/token/route.ts` antes de emitir o token.
