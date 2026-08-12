FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

# The official image already contains Playwright browsers and system dependencies.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ src/
COPY scripts/ scripts/
COPY .env.example ./

# Runtime data volume
VOLUME /app/data
ENV DATA_DIR=/app/data

# Default: claim free games
CMD ["node", "src/index.js", "--claim"]
