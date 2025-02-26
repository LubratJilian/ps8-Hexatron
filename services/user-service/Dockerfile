FROM node:18-slim

RUN apt-get update && apt-get install -y curl

WORKDIR /app/user-service/
COPY ./user-service/package*.json ./
COPY ../api-utils/* /app/api-utils/

RUN npm install
RUN cd /app/api-utils && npm install

COPY ./user-service/*.js ./
COPY ../database-initializer/TypesValidation.js /app/database-initializer/

EXPOSE 8003
CMD ["npm", "start"]