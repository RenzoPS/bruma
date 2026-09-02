# API de BRUMA — imagen de produccion.
#
# Node 24 ejecuta TypeScript directo, asi que no hay paso de compilacion: lo que
# corre en produccion es el mismo archivo que se edita en desarrollo.

FROM node:24-alpine AS deps
RUN corepack enable
WORKDIR /app

# Los manifiestos primero: mientras no cambien, Docker reusa esta capa.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ---------------------------------------------------------------------------
# Dependencias completas, solo para el stage de migraciones: drizzle-kit es una
# devDependency y no entra en la imagen que sirve la api.
#
# Sin --ignore-scripts a proposito: drizzle-kit corre sobre esbuild, que baja su
# binario nativo en un script de instalacion. pnpm-workspace.yaml es el que
# autoriza a esbuild y solo a esbuild.
FROM node:24-alpine AS deps-full
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Puesta al dia de la base: aplica las migraciones y carga los datos maestros.
#
# Es un contenedor de un solo uso, no un servicio: arranca, deja la base como
# tiene que estar, y termina. Corre antes que la api en el compose.
FROM node:24-alpine AS migrate
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S bruma && adduser -S bruma -G bruma

COPY --from=deps-full --chown=bruma:bruma /app/node_modules ./node_modules
COPY --chown=bruma:bruma package.json pnpm-lock.yaml pnpm-workspace.yaml drizzle.config.ts ./
COPY --chown=bruma:bruma src ./src
COPY --chown=bruma:bruma drizzle ./drizzle

USER bruma
# El .env no existe en la imagen: las variables las inyecta el compose.
#
# Se invoca el binario de node_modules en vez de `pnpm exec`: corepack resuelve
# y descarga pnpm en cada arranque, y esto tiene que poder migrar una base sin
# salir a internet.
CMD ["sh", "-c", "node_modules/.bin/drizzle-kit migrate && node src/db/maestros/aplicar.ts"]

# ---------------------------------------------------------------------------
# La imagen que sirve la api. Va ultima para que `docker build` sin --target
# siga devolviendo esta y no una de las intermedias.
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3001

# Nunca como root.
RUN addgroup -S bruma && adduser -S bruma -G bruma

COPY --from=deps --chown=bruma:bruma /app/node_modules ./node_modules
COPY --chown=bruma:bruma package.json ./
COPY --chown=bruma:bruma src ./src

USER bruma
EXPOSE 3001
CMD ["node", "src/server.ts"]
