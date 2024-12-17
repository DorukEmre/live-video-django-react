FROM  node:lts-alpine3.21 AS base

WORKDIR /app

# Update cross-spawn to version 7.0.5 because of vulnerability in node:lts-alpine3.21
RUN   npm install cross-spawn@7.0.5

COPY  package.json .

RUN   npm install

COPY  . .

# for development (change target to development in docker-compose.yml)
FROM  base AS development
ENV   NODE_ENV=development
CMD   ["npm", "run", "dev", "--", "--host"]

# for production (change target to production in docker-compose.yml)
FROM  base AS production
ENV   NODE_ENV=production
CMD   [ "npm", "run", "build" ]

# RUN   npm install serve -g
# # deploy is "npm run build && serve -s dist -l 5173"
# CMD   [ "npm", "run", "deploy" ]
