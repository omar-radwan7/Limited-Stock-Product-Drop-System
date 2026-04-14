FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm install

# Copy the rest of the source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose the API port
EXPOSE 3001

# Entrypoint: run migrations, seed, then start server
CMD npx prisma migrate deploy && npx prisma db seed && npm run dev
