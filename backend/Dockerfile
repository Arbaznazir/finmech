# ── Stage 1: Install dependencies & generate Prisma client ──
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# ── Stage 2: Production runner ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

RUN addgroup --system --gid 1001 appgroup
RUN adduser --system --uid 1001 appuser

# Copy node_modules (includes generated prisma client)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/generated ./generated

# Copy app source
COPY package.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src

# Create data directory for SQLite and set permissions
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data

USER appuser

EXPOSE 5000

CMD ["node", "--experimental-strip-types", "src/index.js"]
