FROM node:20-slim AS base

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/

RUN npm ci
RUN npm --prefix frontend ci

COPY . .

RUN npm run build:frontend

EXPOSE 5000

CMD ["npm", "start"]