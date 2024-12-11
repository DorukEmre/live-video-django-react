FROM node:lts-alpine3.21

WORKDIR /app

# Update cross-spawn to version 7.0.5 because of vulnerability in node:lts-alpine3.21
RUN npm install cross-spawn@7.0.5

COPY ./package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "dev", "--", "--host"]