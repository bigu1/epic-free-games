FROM node:22-slim

# Install system deps for Playwright Firefox
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgtk-3-0 libdbus-glib-1-2 libxt6 libasound2 \
    fonts-noto-cjk fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Install Playwright Firefox (less captcha-prone than Chromium)
RUN npx playwright install firefox

# Copy source
COPY src/ src/
COPY scripts/ scripts/
COPY .env.example ./

# Runtime data volume
VOLUME /app/data
ENV DATA_DIR=/app/data

# Default: claim free games
CMD ["node", "src/index.js", "--claim"]
