FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/sdk/package.json packages/sdk/
RUN npm ci --workspace=api --include-workspace-root

COPY apps/api apps/api
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/server.ts"]