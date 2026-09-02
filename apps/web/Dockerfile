# Front de BRUMA — imagen de produccion.
#
# A la imagen final llega solo el server standalone de Next, los estaticos y
# public: nada de node_modules completo ni codigo TypeScript.

FROM node:24-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM node:24-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

# Nunca como root.
RUN addgroup -S bruma && adduser -S bruma -G bruma

COPY --from=builder --chown=bruma:bruma /app/.next/standalone ./
COPY --from=builder --chown=bruma:bruma /app/.next/static ./.next/static
COPY --from=builder --chown=bruma:bruma /app/public ./public

USER bruma
EXPOSE 3000
CMD ["node", "server.js"]
