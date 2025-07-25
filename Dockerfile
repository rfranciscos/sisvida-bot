FROM node:22-slim
# Create and change to the app directory.
WORKDIR /app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./

# Install dependencies.
# If you add a package-lock.json speed your build by switching to 'npm ci'.
# --ignore-scripts is used to prevent the postinstall or prepare scripts from running
RUN npm ci --ignore-scripts

# Copy local code to the container image.
COPY . ./

# Build app
RUN npm run build

# Run the web service on container startup.
CMD ["npm", "start"]
