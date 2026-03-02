FROM oven/bun:latest AS base

WORKDIR /app

# Copy root workspace configurations
COPY package.json bun.lockb* ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/

# Install dependencies (workspaces)
RUN bun install

# Install python so we can run the yfinance unblock script
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv procps \
    && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install yfinance
# Copy source
COPY packages/db ./packages/db/
COPY apps/worker ./apps/worker/

# Generate prisma client
RUN cd packages/db && bun run generate

WORKDIR /app/apps/worker

CMD ["bun", "run", "start"]
