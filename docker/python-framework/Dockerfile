# Simplified Dockerfile für IMF Python Framework via npm
FROM python:3.11-slim

# System dependencies installieren
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Node.js installieren
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Arbeitsverzeichnis
WORKDIR /app

# Python Framework npm package kopieren und installieren
COPY python-framework/imf-python-monitoring-framework-*.tgz ./
RUN npm install -g imf-python-monitoring-framework-*.tgz

# Python Framework Dateien direkt kopieren
COPY python-framework/*.py ./
COPY python-framework/requirements.txt ./
COPY python-framework/config.yaml ./
COPY python-framework/ai_models ./ai_models/
COPY python-framework/data ./data/
COPY python-framework/tests ./tests/

# Python dependencies installieren
RUN pip install -r requirements.txt

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${IMF_FRAMEWORK_PORT:-8000}/health || exit 1

# Port exposieren
EXPOSE 8000

# Start command - wird von docker-compose überschrieben
CMD ["npx", "imf-python-framework", "start", "--mode", "api", "--port", "8000"]