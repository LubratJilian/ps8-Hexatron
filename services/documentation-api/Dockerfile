FROM node:18-slim

RUN apt-get update && apt-get install -y curl

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY ./index.js /app/index.js

RUN mkdir -p ./api

EXPOSE 8004
CMD ["npm", "start"]