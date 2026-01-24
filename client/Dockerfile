# Multi-stage build for React frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* package-lock.json* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build argument for API URL
ARG VITE_API_URL=http://34.100.170.102:8080
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
