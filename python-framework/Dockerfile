# Dockerfile für Python AI Framework
FROM python:3.11-slim

# System Dependencies installieren
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Arbeitsverzeichnis
WORKDIR /app

# Python Dependencies installieren
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Source Code kopieren
COPY . .

# AI Models Verzeichnis erstellen
RUN mkdir -p /app/ai_models

# Port exponieren (falls AI Service HTTP Server braucht)
EXPOSE 8000

# Umgebungsvariablen
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Start command
CMD ["python", "api_server.py"]