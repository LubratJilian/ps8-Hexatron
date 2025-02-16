FROM node:18-slim

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY ./index.js /app/index.js
COPY ./cors.js /app/cors.js

EXPOSE 8000
CMD ["npm", "start"]