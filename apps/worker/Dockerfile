FROM oven/bun:latest AS base

WORKDIR /app

# Copy root workspace configurations
COPY package.json bun.lockb* ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/

# Install dependencies (workspaces)
RUN bun install

# Copy source
COPY packages/db ./packages/db/
COPY apps/worker ./apps/worker/

# Generate prisma client
RUN cd packages/db && bun run generate

WORKDIR /app/apps/worker

CMD ["bun", "run", "start"]
