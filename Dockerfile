FROM node:10.6.0-alpine

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./
RUN yarn install --production
COPY src src/

EXPOSE 5423

CMD [ "yarn", "start" ]
