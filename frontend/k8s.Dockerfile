# build container
FROM node:22-alpine AS build
WORKDIR /frontend

RUN apk update && apk upgrade && apk add --no-cache git

COPY ./package.json package.json
RUN yarn install
COPY . .

RUN yarn build


# nginx static build
FROM nginx:alpine

COPY --from=build /frontend/dist /usr/share/nginx/html