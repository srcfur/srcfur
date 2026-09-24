# Stage 1: Install dependencies
FROM node:20-alpine AS builder
WORKDIR /
RUN npm ci --omit=dev
CMD ["npm", "run", "build"]

# Stage 2: Production image
FROM node:20-alpine
EXPOSE 3000
CMD ["npm", "run", "start"]
