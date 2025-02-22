FROM node:18-slim

RUN apt-get update && apt-get install -y curl

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY ./index.js /app/index.js
COPY ./game /app/game

EXPOSE 8002
CMD ["npm", "start"]