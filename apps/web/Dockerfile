FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace config and lockfile
COPY package.json package-lock.json tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install all dependencies (workspace aware)
RUN npm ci --ignore-scripts

# Copy shared package source (Vite resolves from source via alias)
COPY packages/shared/ ./packages/shared/

# Copy web source
COPY apps/web/ ./apps/web/

FROM base AS development
EXPOSE 5173
WORKDIR /app
CMD ["sh", "-c", "cd apps/web && npm run dev -- --host 0.0.0.0"]

FROM base AS builder
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app/apps/web
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
