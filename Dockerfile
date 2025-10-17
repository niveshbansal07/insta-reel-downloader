# Base image
FROM node:20-slim

# Install system dependencies for yt-dlp + ffmpeg
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    python3 python3-pip ffmpeg git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp globally
RUN pip3 install --no-cache-dir yt-dlp

# Create app directory
WORKDIR /app

# Copy package files & install dependencies
COPY package*.json ./
RUN npm install --production

# Copy entire project
COPY . .

# Use non-root user (best practice)
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Expose port (Render will set $PORT automatically)
EXPOSE 3000

# Start backend server
CMD ["npm", "start"]