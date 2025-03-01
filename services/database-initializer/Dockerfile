FROM node:18-slim

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY type-documentation.js /app/type-documentation.js
COPY index.js /app/index.js

CMD ["npm", "start"]