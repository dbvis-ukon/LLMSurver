FROM node:22-alpine

WORKDIR /frontend
ENV PATH /frontend/node_modules/.bin:$PATH

RUN apk update && apk upgrade && apk add --no-cache git

# install and cache app dependencies
COPY ./package.json package.json
RUN --mount=type=cache,target=/.yarn-cache,id=llm-surver yarn install --verbose --cache-folder /.yarn-cache --prefer-offline

# Do _not_ copy in src content, we map it instead
# COPY . .

CMD [ "npm", "start" ]

