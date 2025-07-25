FROM node:22-slim
# Create and change to the app directory.
WORKDIR /app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm@latest && \
    pnpm install --frozen-lockfile

# Copy local code to the container image.
COPY . ./

# Build app
RUN pnpm run build

# Run the web service on container startup.
CMD ["node", "dist/integrated-server.js"] 
