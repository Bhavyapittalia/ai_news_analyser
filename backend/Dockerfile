FROM node:22-alpine
WORKDIR /app

# 1. Package files only (so the install step is cached)
COPY package.json package-lock.json ./
COPY node-monorepo ./node-monorepo
WORKDIR /app/node-monorepo
RUN npm install
RUN npm run build -w @repo/shared

# 2. Install from the root; this creates the workspace links
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install

# 3. Copy the source code
COPY backend ./
RUN npx prisma contract emit
RUN npm run build

# 4. Build shared first, then the backend

EXPOSE 8000
CMD ["npm", "start"]