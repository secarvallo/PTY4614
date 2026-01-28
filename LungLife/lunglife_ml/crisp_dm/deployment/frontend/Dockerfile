# ============================================================================
# LungLife Frontend - Dockerfile
# Base: Node.js 20 (build) + Nginx Alpine (serve)
# Purpose: Ionic/Angular SPA with Nginx
# ============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine as builder

ARG API_URL=http://localhost:3000/api

WORKDIR /build

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment for build
ENV IONIC_CLI_VERSION=7.1.1
RUN npm install -g @ionic/cli@${IONIC_CLI_VERSION}

# Build for production
RUN npm run build -- --configuration=production

# -----------------------------------------------------------------------------
# Stage 2: Production (Nginx)
# -----------------------------------------------------------------------------
FROM nginx:alpine as production

# Labels
LABEL maintainer="LungLife Team"
LABEL version="1.0.0"
LABEL description="LungLife Frontend PWA"

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /build/www /usr/share/nginx/html

# Create non-root user for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:80 || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
