# ============================================================================
# LungLife Backend - Dockerfile
# Base: Node.js 20 Alpine
# Purpose: Express API Gateway
# ============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine as builder

WORKDIR /build

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Prune devDependencies
RUN npm prune --production

# -----------------------------------------------------------------------------
# Stage 2: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine as production

# Labels
LABEL maintainer="LungLife Team"
LABEL version="1.0.0"
LABEL description="LungLife Backend API Gateway"

# Create non-root user
RUN addgroup -g 1000 lunglife && \
    adduser -u 1000 -G lunglife -s /bin/sh -D lunglife

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl dumb-init

# Copy built application from builder
COPY --from=builder --chown=lunglife:lunglife /build/dist ./dist
COPY --from=builder --chown=lunglife:lunglife /build/node_modules ./node_modules
COPY --from=builder --chown=lunglife:lunglife /build/package*.json ./

# Create logs directory
RUN mkdir -p /app/logs && chown -R lunglife:lunglife /app/logs

# Switch to non-root user
USER lunglife

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
