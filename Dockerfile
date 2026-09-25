# Stage 1: Install dependencies
FROM node:22-alpine AS builder
ENV JOBS=2
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY tsconfig.json ./
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner
RUN apk add --no-cache python3 make g++
WORKDIR /app
# Create a non-root user for security
RUN addgroup -g 1001 furgroup && \
    adduser -u 1001 -G furgroup -s /bin/sh -D srcfurwebsite
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder --chown=srcfurwebsite:furgroup /app/lib ./lib
COPY --from=builder --chown=srcfurwebsite:furgroup /app/public ./public
COPY --from=builder --chown=srcfurwebsite:furgroup /app/routes ./routes
COPY --from=builder --chown=srcfurwebsite:furgroup /app/views ./views
COPY --from=builder --chown=srcfurwebsite:furgroup /app/sqlsetup ./sqlsetup
# Set environment variables
ENV NODE_ENV=production
# Expose the application port
EXPOSE 3000
RUN chown -R srcfurwebsite .
RUN chmod -R 777 .
# Switch to non-root user
USER srcfurwebsite
# Start the application
CMD ["npm", "run", "start"]