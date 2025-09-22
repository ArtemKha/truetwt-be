# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S truetweet -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=base --chown=truetweet:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=truetweet:nodejs /app/dist ./dist
COPY --from=builder --chown=truetweet:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p logs data && chown -R truetweet:nodejs logs data

# Switch to non-root user
USER truetweet

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(res => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the application
CMD ["npm", "start"]
