#set the base image
FROM node:18-alpine

# workdirectory
WORKDIR /app

# copy package.json and package-lock.json
COPY package*.json ./

# dependency installation
RUN npm install

#copy rest of the files
COPY server.js ./
COPY public/ ./public/

#specify port on which container needs to be run
EXPOSE 3000

#start application
CMD ["npm", "start"]
