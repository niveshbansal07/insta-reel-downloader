# Base image
FROM node:20-slim

# -----------------------------
# Install system dependencies
# -----------------------------
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    python3 python3-venv ffmpeg git ca-certificates curl unzip && \
    rm -rf /var/lib/apt/lists/*

# -----------------------------
# Create Python virtual environment for yt-dlp
# -----------------------------
RUN python3 -m venv /opt/yt-dlp-venv
ENV PATH="/opt/yt-dlp-venv/bin:$PATH"

# Upgrade pip & install yt-dlp inside venv
RUN pip install --upgrade pip wheel setuptools && \
    pip install --no-cache-dir yt-dlp

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
# Optional: Download yt-dlp binary as backup
# -----------------------------
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# -----------------------------
# Create non-root user
# -----------------------------
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# -----------------------------
# Expose port
# -----------------------------
EXPOSE 3000

# -----------------------------
# Start backend
# -----------------------------
CMD ["npm", "start"]
