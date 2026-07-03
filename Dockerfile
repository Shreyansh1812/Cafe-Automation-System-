# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package config and lockfile
COPY package.json package-lock.json ./

# Install packages clean
RUN npm ci

# Copy application source code
COPY . .

# Set Nitro preset to build a standalone Node.js server
ENV NITRO_PRESET=node-server

# Run building process
RUN npm run build

# Stage 2: Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment flags
ENV PORT=3000
ENV NODE_ENV=production

# Copy output from builder
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

# Expose server port
EXPOSE 3000

# Start server process
CMD ["node", ".output/server/index.mjs"]
