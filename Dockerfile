# Node + Python no mesmo contêiner: o app é Node, o yt-dlp é Python.
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip ca-certificates ffmpeg \
 && pip3 install --break-system-packages --no-cache-dir yt-dlp \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Sem TURSO_DATABASE_URL o banco cai num arquivo local; em hospedagem com disco
# efêmero, defina TURSO_DATABASE_URL para os dados não sumirem no redeploy.
CMD ["node", "server/index.js"]
