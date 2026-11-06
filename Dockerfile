FROM node:22-alpine AS ui

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.js postcss.config.js ./
COPY src ./src
RUN npm run build

FROM node:22-alpine

RUN apk add --no-cache openssl curl gcompat iproute2 coreutils bash

WORKDIR /app/server

COPY server/*.js ./
COPY --from=ui /app/dist /app/dist

EXPOSE 3000/tcp

CMD ["node", "index.js"]
