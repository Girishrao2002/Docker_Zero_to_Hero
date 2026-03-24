# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Copy package.json and package-lock.json (if it exists)
COPY package*.json ./

# Install dependencies
RUN npm install 

# Copy the rest of the application code
COPY server.js ./
COPY public/ ./public/

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
#ENV NODE_ENV=production

# Health check
#HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
 #   CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["npm", "start"]
    