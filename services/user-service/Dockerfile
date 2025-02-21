FROM node:18-slim

ENV REFRESH_TOKEN_SECRET="test"
ENV ACCESS_TOKEN_SECRET="test"
ENV URI="mongodb://root:root@mongodb:27017/?authSource=admin"

RUN apt-get update && apt-get install -y curl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY ./*.js /app/
##COPY ./healthcheck.js /app
EXPOSE 8003
CMD ["npm", "start"]