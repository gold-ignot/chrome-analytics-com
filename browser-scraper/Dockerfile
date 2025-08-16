FROM golang:1.23-alpine

WORKDIR /app

# Install Chrome and dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Set Chrome executable path
ENV CHROME_BIN=/usr/bin/chromium-browser

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN go build -o browser-scraper ./cmd/browser-scraper

# Expose port for HTTP API
EXPOSE 8081

# Use dumb-init to properly handle signals
ENTRYPOINT ["dumb-init", "--"]

# Run the browser scraper service
CMD ["./browser-scraper"]