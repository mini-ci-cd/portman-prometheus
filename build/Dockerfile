FROM node:16-alpine

ARG collectionFile=samples/example.json
ARG srcDir=src

WORKDIR /runner

COPY $srcDir/package*.json ./
RUN npm install --production --silent

COPY $srcDir/ ./
RUN sed -i 's#"main": "lib/index.js",#"main": "dist/Portman.js",#' node_modules/@apideck/portman/package.json

COPY ${collectionFile} ./collection.json

CMD [ "node", "server.js" ]
