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

# Cloud Run cấp PORT qua biến môi trường (mặc định 8080)
ENV PORT=8080
# Cloud Run chỉ cho ghi vào /tmp — đặt DB ở đó
ENV DB_PATH=/tmp/tntcar.db
ENV JWT_SECRET=tntcar-prod-doi-secret-nay
EXPOSE 8080

# Khởi tạo DB + seed khi container khởi động, rồi chạy server
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && node dist/index.js"]
