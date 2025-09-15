# Evolution API - Escola Jupiara - Dockerfile
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Configurar Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Criar diretório da aplicação
WORKDIR /evolution

# Copiar arquivos de configuração
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Gerar Prisma client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S evolution -u 1001
RUN chown -R evolution:nodejs /evolution
USER evolution

# Expor porta
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node healthcheck.js

# Comando de inicialização
CMD ["npm", "start"]