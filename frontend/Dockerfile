FROM --platform=$BUILDPLATFORM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
RUN npm run build

FROM docker.tangerie.xyz/nginx-spa

WORKDIR /app

COPY --from=build /app/dist /app
