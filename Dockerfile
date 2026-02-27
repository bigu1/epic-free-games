FROM node:22-slim

# Install system deps for Playwright Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libdbus-1-3 libxkbcommon0 libatspi2.0-0 libxcomposite1 \
    libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 libwayland-client0 \
    fonts-noto-cjk fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install Playwright Chromium
RUN npx playwright install chromium

# Copy source
COPY src/ src/
COPY scripts/ scripts/
COPY .env.example ./

# Runtime data volume
VOLUME /app/data
ENV DATA_DIR=/app/data

# Default: claim free games
CMD ["node", "src/index.js", "--claim"]
