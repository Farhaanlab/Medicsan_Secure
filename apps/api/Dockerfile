# Use the official lightweight Node.js 18 image.
# https://hub.docker.com/_/node
FROM node:18-slim

# Install OpenSSL specific to Debian/slims which is required strictly by Prisma engines
RUN apt-get update -y && apt-get install -y openssl

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Install all dependencies including dev (Cloud Build native stripping causes tsc to fail)
RUN npm install --include=dev

# Copy Prisma schema and generate the client BEFORE copying rest of the code
# This ensures caching of the heavy Prisma build step
COPY prisma ./prisma/
RUN npx prisma generate

# Copy local code to the container image.
COPY . .

# Compile TypeScript to JavaScript in the `dist` folder
RUN npm run build

# Run the web service on container startup.
# Cloud Run injects the $PORT environment variable natively.
CMD [ "npm", "start" ]
