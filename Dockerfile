# Base image
FROM node:20-slim

# -----------------------------
# Install system dependencies
# -----------------------------
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    python3 python3-pip ffmpeg git ca-certificates curl unzip && \
    rm -rf /var/lib/apt/lists/*

# -----------------------------
# Upgrade pip and install yt-dlp safely
# -----------------------------
RUN python3 -m pip install --upgrade pip setuptools wheel && \
    python3 -m pip install --no-cache-dir yt-dlp

# -----------------------------
# Create app directory
# -----------------------------
WORKDIR /app

# -----------------------------
# Copy package.json & install node deps
# -----------------------------
COPY package*.json ./
RUN npm install --production

# -----------------------------
# Copy all project files
# -----------------------------
COPY . .

# -----------------------------
# Optional: Pre-download yt-dlp binary (backup)
# -----------------------------
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# -----------------------------
# Create non-root user
# -----------------------------
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# -----------------------------
# Expose port (Render sets $PORT automatically)
# -----------------------------
EXPOSE 3000

# -----------------------------
# Start the backend
# -----------------------------
CMD ["npm", "start"]
