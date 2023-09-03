FROM --platform=$BUILDPLATFORM docker.tangerie.xyz/node-docker AS build

ARG FONT_AWESOME_KEY
ENV FONT_AWESOME_KEY=$FONT_AWESOME_KEY

WORKDIR /app

COPY package*.json ./

RUN echo NPM Auth $FONT_AWESOME_KEY

RUN npm config set "@fortawesome:registry" https://npm.fontawesome.com/
RUN npm config set "//npm.fontawesome.com/:_authToken" $FONT_AWESOME_KEY

RUN npm config ls

RUN npm i

COPY . .

RUN npm run build

FROM docker.tangerie.xyz/nginx-spa

WORKDIR /app

COPY --from=build /app/dist /app