# apps/api/Dockerfile

FROM node:20-alpine AS base
WORKDIR /app

# Install OpenSSL (required by Prisma on Alpine)
RUN apk add --no-cache openssl

# Copy workspace config and lockfile
COPY package.json package-lock.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (workspace aware)
RUN npm ci

# Copy shared package source and build it
COPY packages/shared/ ./packages/shared/
RUN cd packages/shared && npx tsc --outDir dist

# Copy API source
COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN cd apps/api && npx prisma generate


FROM base AS development
EXPOSE 3000
WORKDIR /app
# Local/dev only
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && npm run start:dev"]


FROM base AS builder
WORKDIR /app/apps/api
RUN npm run build


FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl

# App build output
COPY --from=builder /app/apps/api/dist ./dist
# Prisma schema (needed at runtime for engines + potential migrations)
COPY --from=base /app/apps/api/prisma ./prisma

# Runtime deps installed at monorepo root
COPY --from=base /app/node_modules ./node_modules
# Prisma engines live here after "prisma generate" on Alpine
COPY --from=base /app/node_modules/.prisma ./.prisma

ENV NODE_ENV=production
EXPOSE 3000

# (por ahora) arranque simple
CMD ["node", "dist/main.js"]