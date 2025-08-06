# Multi-stage Dockerfile für IMF (Node.js only, Python runs in separate container)
FROM node:20-alpine AS base

# Installiere PostgreSQL Client und Python für das Framework
RUN apk add --no-cache postgresql-client python3 py3-pip curl

# Arbeitsverzeichnis
WORKDIR /app

# Package files kopieren
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY vitest.config.ts ./
COPY imf-test-manager-1.0.0.tgz ./

# Dependencies installieren
RUN npm install --omit=dev && npm cache clean --force

# Development Stage
FROM base AS development

# Alle Dependencies installieren (inkl. dev)
RUN npm install

# Source Code kopieren
COPY . .

# Ports exponieren
EXPOSE 3000 5173

# Start command
CMD ["npm", "run", "dev"]

# Production Stage
FROM base AS production

# Source Code kopieren
COPY . .

# Build für Production
RUN npm run build

# Port exponieren
EXPOSE 3000

# Start command
CMD ["npm", "start"]