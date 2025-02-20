FROM node:18-slim

RUN apt-get update && apt-get install -y curl

WORKDIR /app/user-service/
COPY ./user-service/package*.json ./

RUN npm install

COPY ./user-service/index.js ./index.js

COPY ./api-utils /app/api-utils

EXPOSE 8003
CMD ["npm", "start"]