# Single-container deploy: builds the web app, then runs the Node server
# which serves both the API and the built frontend on one port.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    DATA_DIR=/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/web/dist ./web/dist
# SQLite lives on a volume so the database survives restarts/redeploys.
VOLUME /data
EXPOSE 3001
CMD ["node", "--disable-warning=ExperimentalWarning", "server/src/index.js"]
