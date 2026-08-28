# Arquitetura

Documento para quem voltar ao código daqui a seis meses — inclusive nós mesmos.
O `README.md` explica como usar; este aqui explica **por que** cada peça é do
jeito que é.

---

## O problema que o app resolve

Receita salva no Instagram vira print perdido na galeria do celular. O app
existe para tornar isso achável e seguível com as mãos sujas de massa.

Daí decorrem três decisões que aparecem em tudo:

1. **Nada é salvo sem revisão.** O separador de legenda é heurística, então ele
   sempre abre a tela de edição em vez de gravar direto.
2. **Nunca travar.** Quando a importação automática falha — e o Instagram falha
   com frequência — existe sempre o caminho de colar a legenda.
3. **Ler em pé, com pressa.** Texto grande no modo cozinha, alvos de toque
   generosos, e a tela não apaga enquanto se cozinha.

---

## Como os dados fluem

```
link do Reel/TikTok
        │
        ▼
  lib/extract.js ──── yt-dlp ────► legenda + capa
        │         └─ oEmbed (reserva)
        │
        ├── falhou? ──► a pessoa cola a legenda na mão
        ▼
  lib/parse.js ──► { título, ingredientes[], passos[], tags[], tempo, rende }
        │
        ▼
  tela de edição (a pessoa confere)
        │
        ▼
  routes/recipes.js ──► banco
```

---

## Decisões que merecem explicação

### As fotos ficam dentro do banco

Cada foto vira duas versões em WebP — uma de até 1600 px e uma miniatura de
500×500 — guardadas como BLOB.

**Por quê:** dispensa contratar serviço de arquivos, e o backup do banco leva
as fotos junto. Uma foto de celular de 6 MB vira ~150 KB depois do
redimensionamento, então mil fotos ocupam ~150 MB — folgado dentro do disco
de 1 GB.

**Quando repensar:** se um dia passar de uns poucos milhares de fotos, ou se
quiserem servir por CDN.

### As marcações de ingrediente ficam no aparelho

Ingredientes e passos marcados vivem no `localStorage`, não no servidor.

**Por quê:** duas pessoas cozinhando a mesma receita em telas diferentes não
deveriam bagunçar o progresso uma da outra.

**Atenção:** a lista de compras é o contrário — fica no servidor, porque ali o
compartilhamento é justamente o que se quer.

### A lista de compras é manual

Já existiu geração automática a partir das receitas e do planejador, com soma
de quantidades repetidas. Foi removida a pedido: quem escreve os itens são as
pessoas.

O único automatismo que sobrou é `lib/aisles.js` adivinhar a seção do mercado,
para a lista sair na ordem do corredor em vez da ordem de digitação.

### O banco é SQLite, e mora num volume

`server/db.js` escolhe a origem nesta ordem:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | arquivo em disco persistente (o volume do Fly) |
| `TURSO_DATABASE_URL` | banco remoto no Turso, se um dia quiserem |
| *(nada)* | `data/receitas.db`, para rodar no PC |

O cliente é o `@libsql/client`, que fala com os dois formatos — trocar de um
para o outro é só mudar variável de ambiente.

### O separador de legenda é heurística assumida

`lib/parse.js` tenta, em ordem:

1. Achar cabeçalhos (`INGREDIENTES:`, `MODO DE PREPARO:` e variações)
2. Achar subseções (`COBERTURA:`, `RECHEIO:`) e usá-las como prefixo
3. Sem cabeçalho nenhum: assumir a ordem natural (ingredientes, depois passos)
   e trocar de modo na primeira linha que pareça um passo de verdade — verbo
   imperativo de cozinha, ou frase longa terminada em ponto

Também extrai rendimento, tempo e hashtags, e descarta "salva esse post" e
companhia.

**Ele erra**, e por isso a tela de edição sempre abre antes de salvar.

---

## A API

Tudo exige sessão quando `APP_PASSWORD` está definida. Sem ela (uso local), a
API fica aberta.

### Receitas

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/api/recipes` | Lista. Aceita `q`, `category`, `tag`, `favorite`, `sort` |
| `GET` | `/api/recipes/counts` | Total e contagem por categoria |
| `GET` | `/api/recipes/tags` | Tags em uso, mais frequentes primeiro |
| `GET` | `/api/recipes/:id` | Uma receita, com a lista de fotos |
| `POST` | `/api/recipes` | Cria. Aceita `thumb_key` para anexar a capa da importação |
| `PUT` | `/api/recipes/:id` | Substitui |
| `PATCH` | `/api/recipes/:id/favorite` | Alterna favorito |
| `PATCH` | `/api/recipes/:id/rating` | Nota de 0 a 5 |
| `DELETE` | `/api/recipes/:id` | Apaga, junto com as fotos |

### Fotos

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/api/photos/:recipeId` | Envia até 12 imagens (campo `photos`) |
| `GET` | `/api/photos/:id` | Serve a imagem. `?size=thumb` traz a miniatura |
| `PATCH` | `/api/photos/:id/cover` | Define como capa |
| `DELETE` | `/api/photos/:id` | Apaga; se era a capa, promove a próxima |

### Importação

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/api/import/link` | Lê um link. Devolve rascunho, sem salvar |
| `POST` | `/api/import/caption` | Mesma coisa a partir de legenda colada |

### Lista de compras

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/api/shopping` | Lista agrupada por seção do mercado |
| `POST` | `/api/shopping/item` | Adiciona. Aceita várias linhas de uma vez |
| `PATCH` | `/api/shopping/item/:id` | Marca, renomeia ou muda de seção |
| `DELETE` | `/api/shopping/item/:id` | Remove um item |
| `DELETE` | `/api/shopping` | Limpa tudo. `?only=checked` limpa só os comprados |
| `GET` | `/api/shopping/text` | Texto formatado para o WhatsApp |

### Planejador

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/api/plan?date=` | A semana que contém a data (segunda a domingo) |
| `POST` | `/api/plan` | Agenda receita ou anotação livre |
| `PATCH` | `/api/plan/:id` | Move de dia ou refeição |
| `DELETE` | `/api/plan/:id` | Remove |
| `DELETE` | `/api/plan/week/:date` | Limpa a semana |

---

## Testes

```bash
node test-api.mjs      # 47 verificações: API inteira
node test-photos.mjs   # 16 verificações: upload, redimensionamento, capa
node test-aisles.mjs   # separador de ingrediente e seção do mercado
```

Rodam contra o servidor no ar, não contra mocks — a intenção é pegar problema
de integração, que é onde as coisas realmente quebram.

Os testes limpam o que criam. `test-api.mjs` usa uma semana 400 dias no futuro
para não esbarrar em dados reais do planejador.

---

## Armadilhas conhecidas

**`pkill` não funciona no Windows.** Use `dev-restart.sh`, que finaliza o
processo pela porta. Já aconteceu de eu achar que estava testando código novo
enquanto o servidor antigo continuava no ar.

**O Instagram bloqueia IP de datacenter.** Confirmado em produção. Para
melhorar, exporte os cookies do navegador e aponte `IG_COOKIES_FILE`.

**Não há sincronização ao vivo.** As telas só atualizam quando recarregam. Se
duas pessoas usam a lista ao mesmo tempo no mercado, uma precisa atualizar para
ver o que a outra marcou.

**O service worker guarda o casco do app.** Depois de publicar mudança visual,
pode ser preciso `Ctrl+Shift+R` para ver. As chamadas de API nunca são
cacheadas; as fotos são, por serem imutáveis.
