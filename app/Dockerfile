# ---- Giai đoạn 1: build frontend ----
FROM node:20-slim AS frontend
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- Giai đoạn 2: build backend ----
FROM node:20-slim AS backend
WORKDIR /be
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# ---- Giai đoạn 3: image chạy ----
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Cài dependencies production của backend
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy backend đã build
COPY --from=backend /be/dist ./dist
# Copy sql.js wasm (cần cho runtime)
COPY --from=backend /be/node_modules/sql.js/dist/sql-wasm.wasm ./node_modules/sql.js/dist/sql-wasm.wasm
# Copy frontend đã build vào thư mục public để backend serve
COPY --from=frontend /fe/dist ./public

# Script khởi động: chỉ migrate+seed khi DB chưa tồn tại (giữ dữ liệu khi dùng volume)
COPY backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# PORT (Cloud Run cấp qua env; mặc định 8080). Với docker-compose dùng DB_PATH=/data
ENV PORT=8080
ENV DB_PATH=/tmp/tntcar.db
ENV JWT_SECRET=tntcar-prod-doi-secret-nay
EXPOSE 8080

CMD ["/docker-entrypoint.sh"]
