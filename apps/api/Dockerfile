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
RUN npm run build --workspace=@catan/shared

# Copy API source
COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN cd apps/api && npx prisma generate


FROM base AS development
EXPOSE 3000
WORKDIR /app
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && npm run start:dev"]


FROM base AS builder
WORKDIR /app/apps/api
RUN npm run build


FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache openssl

# App build output (tu main real termina en dist/src/main.js)
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=base /app/apps/api/prisma ./prisma

# Runtime deps installed at monorepo root
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/node_modules/.prisma ./.prisma

# --- FIX CRÍTICO: empaquetar @catan/shared dentro de node_modules ---
# (si viene como symlink desde workspaces, lo reemplazamos por un paquete real)
RUN rm -rf /app/node_modules/@catan/shared && mkdir -p /app/node_modules/@catan/shared
COPY --from=base /app/packages/shared/package.json /app/node_modules/@catan/shared/package.json
COPY --from=base /app/packages/shared/dist /app/node_modules/@catan/shared/dist

ENV NODE_ENV=production
EXPOSE 3000

# Render necesita PORT; tu main.ts ya lo toma. Este es el entrypoint correcto:
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]