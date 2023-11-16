FROM docker.io/node:latest

RUN apt-get update && apt-get install -y default-mysql-client

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
COPY ./scripts/wait-for-db.sh /app/scripts/wait-for-db.sh
RUN chmod +x /app/scripts/wait-for-db.sh

RUN npm install -g sequelize-cli

ENTRYPOINT ["/bin/sh", "./scripts/wait-for-db.sh", "mysqldb", "npm", "run", "dev"]

