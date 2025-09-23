# 🏫 EECM - WAHA para Render (Dockerfile principal)
FROM devlikeapro/waha:latest

# Configurações para Render
ENV NODE_ENV=production
ENV WAHA_PRINT_QR=false
ENV WAHA_SESSION_STORE_TYPE=file

# Porta dinâmica do Render
ENV PORT=10000

# Expor porta
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:$PORT/ping || exit 1

# Start command ajustado para Render
CMD ["sh", "-c", "exec node dist/main.js --port=$PORT"]