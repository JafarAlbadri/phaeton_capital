FROM oven/bun:latest AS base

WORKDIR /app

# Need node for Next.js build properly
# Alternatively, bun next build works, but standardizing.
COPY package.json bun.lockb* ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/

RUN bun install

COPY packages/db ./packages/db/
COPY apps/web ./apps/web/

RUN cd packages/db && bun run generate
# Next.js build using bun
RUN cd apps/web && bun run build

WORKDIR /app/apps/web

ENV NODE_ENV=production
ENV PORT=3000

CMD ["bun", "run", "start"]
