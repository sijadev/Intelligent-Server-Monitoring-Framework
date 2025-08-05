# Dockerfile for IMF Test Manager Service
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /imf-test-manager

# Copy package files
COPY ../imf-test-manager/package*.json ./
COPY ../imf-test-manager/tsconfig.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Development Stage
FROM base AS development

# Copy source code
COPY ../imf-test-manager/ ./

# Create workspace directory
RUN mkdir -p /workspace

# Expose ports (if needed for future API endpoints)
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=development
ENV WORKSPACE_PATH=/workspace

# Start command
CMD ["npm", "run", "dev"]

# Production Stage
FROM base AS production

# Copy source code
COPY ../imf-test-manager/ ./

# Build the application
RUN npm run build

# Create workspace directory
RUN mkdir -p /workspace

# Expose ports
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=production
ENV WORKSPACE_PATH=/workspace

# Start command
CMD ["npm", "start"]