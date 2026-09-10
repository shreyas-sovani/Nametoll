FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY tsconfig.json ./
ENV PORT=8787
EXPOSE 8787
CMD ["npx", "tsx", "src/server.ts"]
