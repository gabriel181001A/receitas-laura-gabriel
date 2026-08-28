FROM node:22-slim

# O yt-dlp vem como binário auto-contido (traz o próprio Python). Assim não
# entram python3, pip nem ffmpeg na imagem — ffmpeg só serviria para juntar
# vídeo baixado, e nós lemos apenas os metadados, com --skip-download.
#
# Propositalmente na versão mais recente: Instagram e TikTok quebram os
# extratores com frequência, e reconstruir a imagem é como se atualiza isso.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux \
      -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && yt-dlp --version \
 && apt-get purge -y --auto-remove curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Sem DATABASE_URL o banco cai num arquivo dentro do contêiner, que some no
# próximo deploy. Em produção aponte para um disco persistente:
#   DATABASE_URL=file:/data/receitas.db
CMD ["node", "server/index.js"]
