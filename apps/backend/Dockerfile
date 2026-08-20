# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

RUN npx nx run backend:prune --configuration=production

WORKDIR /app/dist/apps/backend
COPY apps/backend/prisma ./prisma
COPY apps/backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN npm ci --omit=dev --ignore-scripts \
  && npx prisma generate --schema prisma/schema.prisma

# ---- Runtime Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/dist/apps/backend ./

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
