FROM node:22-slim

WORKDIR /app

# Only express now — pure JS, no native build, no compilers needed
COPY package.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/data
ENV PORT=3111 DB_PATH=/app/data/tracker.db
EXPOSE 3111

CMD ["node", "src/server.js"]
