# syntax=docker/dockerfile:1

# --- Build: install from the lockfile and produce static files ---
FROM node:24-alpine AS build
# The exact pnpm version from package.json's packageManager field.
RUN npm install --global pnpm@12.16.1

WORKDIR /app
# Dependencies first: this layer is reused until the lockfile changes.
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# --- Runtime: nginx serves the app and proxies /api to the backend (non-root image) ---
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
