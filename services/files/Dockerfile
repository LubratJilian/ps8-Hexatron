FROM node:18-slim AS base

RUN apt-get update && apt-get install -y curl
WORKDIR /app
COPY package*.json ./
RUN npm install

################################################

FROM base AS dev

COPY ./index.js /app/index.js
COPY ./logic.js ./logic.js

EXPOSE 8001
CMD ["npm", "start"]

################################################

FROM base AS prod

COPY ./index.js /app/index.js
COPY ./front ./front
COPY ./logic.js ./logic.js

EXPOSE 8001
CMD ["npm", "start"]
