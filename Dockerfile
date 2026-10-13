# syntax=docker/dockerfile:1

# ---- deps: install dependencies with a clean, cacheable layer ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: compile the production Next.js build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# No build args, on purpose: everything environment-specific (API_URL,
# SITE_URL, …) is read at runtime from the server's .env, so this one image
# runs on staging and is then promoted unchanged to production. Never add a
# NEXT_PUBLIC_* value here — it would be frozen into the client bundle.
RUN npm run build

# ---- runner: minimal runtime image using Next.js standalone output ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
