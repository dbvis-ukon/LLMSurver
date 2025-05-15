FROM node:20-alpine

RUN apk add --no-cache git

WORKDIR /frontend

COPY . .

RUN npm install

EXPOSE 3000

CMD [ "npm", "start" ]
