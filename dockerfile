FROM node:23-alpine

WORKDIR /home/node/app

RUN apk update && apk upgrade && apk add --no-cache bash

COPY ./package.json tsconfig.json .env ./

COPY prisma ./prisma/

COPY src ./src/

COPY entrypoint.sh ./entrypoint.sh

ENTRYPOINT [ "/home/node/app/entrypoint.sh" ]

RUN npm install --include=dev

RUN chmod +x ./entrypoint.sh