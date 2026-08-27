#!/usr/bin/env bash
# Reinicia o servidor de desenvolvimento.
# `pkill -f` não alcança processos do Windows a partir do Git Bash, então
# matamos quem estiver escutando na porta.
set -u
PORT="${PORT:-3000}"

PID=$(netstat -ano | grep LISTENING | grep ":$PORT " | awk '{print $NF}' | head -1)
if [ -n "${PID:-}" ]; then
  taskkill //PID "$PID" //F >/dev/null 2>&1 && echo "servidor anterior (PID $PID) finalizado"
  sleep 2
fi

if [ "${RESET:-0}" = "1" ]; then
  rm -f data/receitas.db data/receitas.db-shm data/receitas.db-wal
  echo "banco zerado"
fi

(node server/index.js > /tmp/srv.log 2>&1 &)

for _ in $(seq 1 40); do
  curl -s -o /dev/null "http://localhost:$PORT/api/meta" && break
  sleep 0.5
done

if curl -s -o /dev/null "http://localhost:$PORT/api/meta"; then
  echo "servidor no ar em http://localhost:$PORT"
else
  echo "FALHOU — log:"; cat /tmp/srv.log
  exit 1
fi
