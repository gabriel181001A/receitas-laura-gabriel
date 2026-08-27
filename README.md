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
| `node test-photos.mjs` | Testa upload, redimensionamento e capa (16 verificações) |
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

### 3. Nuvem (Fly.io) — funciona sempre, independente do seu PC

O caminho definitivo. O `flyctl` já está instalado nesta máquina e o código já
está no GitHub. **Não precisa de banco externo:** o Fly monta um disco
persistente em `/data` e o SQLite mora lá, sobrevivendo a cada novo deploy.

Estes comandos precisam de você — o login abre o navegador e a conta é sua:

```bash
# 1. Entrar (ou criar a conta). Pede cartão, mesmo no uso mínimo.
flyctl auth login

# 2. Criar o app sem subir nada ainda
flyctl launch --no-deploy --copy-config --name receitas-laura-gabriel --region gru

# 3. Criar o disco onde o banco vai viver (1 GB é muito mais que o suficiente)
flyctl volumes create receitas_data --region gru --size 1

# 4. Guardar a senha de vocês e o segredo que assina o cookie de sessão
flyctl secrets set APP_PASSWORD="a-senha-de-voces"
flyctl secrets set SESSION_SECRET="GERE-O-SEU"

# 5. Subir
flyctl deploy
```

No fim ele imprime o endereço, algo como
`https://receitas-laura-gabriel.fly.dev`. É esse link que vai pro celular dela.

> **Sobre o custo:** o Fly exige cartão cadastrado. Uma máquina
> `shared-cpu-1x` de 512 MB que suspende quando ninguém usa é o menor tamanho
> que existe, mas as regras de cobrança e de franquia gratuita mudaram algumas
> vezes — confira o preço atual na hora do cadastro em vez de confiar no que
> está escrito aqui.

### Trocar a senha depois

```bash
flyctl secrets set APP_PASSWORD="nova-senha"
```

### Backup do banco

```bash
flyctl ssh console -C "cat /data/receitas.db" > backup-receitas.db
```

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

Pêssego `#FFDFC4` — a cor escolhida — é a página. Tudo o mais deriva dela:
os cartões sobem para creme (`#FFF6EE`), a tinta desce para cacau (`#3B2517`),
as ações usam o mesmo tom em terracota fundo (`#A9502C`) e os favoritos ganham
ouro velho (`#B8832A`). Um verde de erva (`#5F7A46`) marca o que já foi feito,
para não se confundir com os botões.

Títulos em Fraunces, interface em Manrope. Um motivo de ladrilho aparece só no
ícone, na tela de entrada e nos estados vazios.

No escuro o pêssego volta como cor do texto sobre cacau, então a mesma cor
aparece nos dois temas. Todos os pares de texto passam em 4.5:1 ou mais.

Os cards são 3:4 — a proporção do vídeo vertical de onde as receitas vêm.

Toda a paleta vive nos dois blocos de `:root` no topo de `public/styles.css`
(claro e escuro). Trocar de cor é mexer só ali.
