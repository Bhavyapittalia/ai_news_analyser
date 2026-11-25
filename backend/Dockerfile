FROM node:24-alpine

WORKDIR /app

COPY node-monorepo ./node-monorepo
WORKDIR /app/node-monorepo
RUN npm install
RUN npm run build -w @repo/shared

# 2. backend, at the same relative position as in the repo
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install

COPY backend ./
RUN npx prisma contract emit
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]