FROM node:18-slim

RUN apt-get update && apt-get install -y curl

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY ./*.js /app/

EXPOSE 8003
CMD ["npm", "start"]