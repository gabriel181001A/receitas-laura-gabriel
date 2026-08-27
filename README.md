# 🍲 Receitas — Laura & Gabriel

Organizador de receitas para celular e computador. Cole o link de um Reel ou
TikTok e a receita se monta sozinha: ingredientes de um lado, modo de preparo
do outro, com a capa do vídeo. Tem categorias, planejador semanal e uma lista
de compras manual.

---

## Rodar no computador

```bash
npm install
npm start
```

Abre em `http://localhost:3000`. O terminal também mostra o endereço de Wi-Fi
(tipo `http://192.168.1.19:3000`) para abrir no celular enquanto os dois
aparelhos estiverem na mesma rede.

Para a importação automática de links funcionar:

```bash
pip install yt-dlp
```

O app acha o yt-dlp sozinho, mesmo que o pip instale fora do PATH — ele tenta
`yt-dlp` e depois `python -m yt_dlp`.

### Comandos úteis

| Comando | O que faz |
|---|---|
| `npm start` | Sobe o servidor |
| `npm run dev` | Sobe com recarga automática ao salvar |
| `node test-api.mjs` | Testa a API inteira (47 verificações) |
| `node seed.mjs` | Enche o banco com 6 receitas de exemplo |
| `bash dev-restart.sh` | Reinicia o servidor |
| `RESET=1 bash dev-restart.sh` | Reinicia zerando o banco |

> No Windows, `pkill` não mata o servidor. Use `dev-restart.sh`, que finaliza
> pela porta.

---

## Como levar para o celular e o computador dela

São três caminhos, do mais simples ao mais completo.

### 1. Wi-Fi de casa — funciona agora, zero configuração

Com `npm start` rodando, ela abre `http://192.168.1.19:3000` no navegador do
celular. Precisa estar na mesma rede, e o seu PC precisa estar ligado.

Bom para testar hoje. Não serve para usar no mercado.

### 2. Túnel — endereço público, sem deploy

Um comando cria um endereço `https://algo.trycloudflare.com` que aponta para o
seu PC. Funciona de qualquer lugar, mas o PC continua tendo que estar ligado.

```bash
cloudflared tunnel --url http://localhost:3000
```

### 3. Nuvem — funciona sempre, independente do seu PC

É o caminho definitivo. Duas peças: onde o app roda e onde os dados ficam.

**Banco de dados (Turso, grátis e permanente).** Hospedagem gratuita costuma
apagar o disco a cada atualização; o Turso guarda o banco fora do servidor.
Crie a conta em [turso.tech](https://turso.tech), crie um banco e copie a URL
(`libsql://…`) e o token.

**O app.** Este repositório já traz `Dockerfile`, `render.yaml` e `fly.toml`.

| | Render (plano grátis) | Fly.io |
|---|---|---|
| Custo | Grátis | Grátis dentro da franquia, mas pede cartão |
| Configuração | Mais simples | Precisa da CLI `flyctl` |
| **Ao abrir depois de horas parado** | **~50 s de espera** | **1–3 s** |
| Servidor no Brasil | Não | Sim (`gru`, São Paulo) |

A diferença que pesa é a última linha. Se ela abrir a lista de compras no
mercado, 50 segundos de tela branca incomodam de verdade — por isso o Fly.io
tende a valer o cadastro do cartão. O Render resolve se o uso for mais em casa.

Variáveis a definir nos dois casos:

| Variável | Valor |
|---|---|
| `APP_PASSWORD` | a senha que vocês dois vão usar |
| `SESSION_SECRET` | `node -e "console.log(crypto.randomUUID())"` |
| `TURSO_DATABASE_URL` | a URL do Turso |
| `TURSO_AUTH_TOKEN` | o token do Turso |

### Instalar como aplicativo

Com o endereço no ar, ela abre no navegador do celular e escolhe **Adicionar à
tela de início**. Passa a abrir em tela cheia, com ícone próprio, sem barra de
navegador. No computador, o Chrome mostra um ícone de instalar na barra de
endereço.

---

## Importação de vídeos: o que esperar

| Origem | Como se sai |
|---|---|
| **TikTok** | Confiável. Tem API pública, funciona de qualquer servidor. |
| **YouTube** | Confiável, inclusive Shorts. |
| **Instagram** | Instável. Bloqueia bastante IP de servidor. |

Quando o link não abre, o app não trava: ele pede a legenda colada, e o mesmo
separador de ingredientes roda em cima do texto. Esse caminho sempre funciona.

Para melhorar o Instagram, exporte os cookies do seu navegador para um
`cookies.txt` e aponte `IG_COOKIES_FILE` para ele.

### O que o separador entende

- Cabeçalhos `INGREDIENTES:` / `MODO DE PREPARO:` e variações
- Subseções como `COBERTURA:` e `RECHEIO:` (viram prefixo do ingrediente)
- Legendas sem cabeçalho nenhum, pela forma de cada linha
- Rendimento, tempo, hashtags viram tags, e sugere a categoria
- Descarta "salva esse post", "me segue" e afins

Nada é salvo sem revisão: a tela de edição abre com tudo separado para conferir.

---

## Lista de compras

É **manual** — quem escreve os itens são vocês, sem nada vindo das receitas.

Dá para colar vários itens de uma vez, um por linha. O único automatismo é
adivinhar a seção do mercado (hortifrúti, açougue, laticínios, mercearia…),
só para a lista sair na ordem do corredor em vez da ordem em que foi digitada.
A seção pode ser trocada à mão. O botão **Copiar** exporta a lista formatada
para mandar no WhatsApp.

---

## Como está organizado

```
server/
  index.js          servidor, senha, rotas
  db.js             schema e migrações
  lib/parse.js      legenda → receita estruturada
  lib/aisles.js     item → seção do mercado
  lib/extract.js    yt-dlp + oEmbed
  routes/           recipes, photos, import, shopping, plan
public/
  index.html  app.js  styles.css  login.html  sw.js
```

**Fotos ficam dentro do banco.** Cada uma vira duas versões em WebP (uma grande
e uma miniatura), o que dispensa serviço de arquivos e mantém tudo num backup só.

**As marcações de ingrediente e passo ficam no aparelho**, não no servidor —
assim marcar o que já foi feito no celular não bagunça a tela de quem estiver
com a receita aberta no computador.

---

## Design

Bege de cozinha: papel cru (`#F1E9DA`) com oliva de horta (`#5C6B39`) nas ações
e âmbar de crosta de pão (`#C07C22`) nos destaques. Títulos em Fraunces,
interface em Manrope. Um motivo de ladrilho aparece só no ícone, na tela de
entrada e nos estados vazios.

Os cards são 3:4 — a proporção do vídeo vertical de onde as receitas vêm.

Toda a paleta vive nos dois blocos de `:root` no topo de `public/styles.css`
(claro e escuro). Trocar de cor é mexer só ali.
