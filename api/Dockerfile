FROM --platform=$BUILDPLATFORM node:latest

WORKDIR /app

COPY package*.json ./

RUN npm i

COPY . .

EXPOSE 80

ENTRYPOINT ["npm", "start"]