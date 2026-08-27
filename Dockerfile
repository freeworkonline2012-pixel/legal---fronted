# مرحلة الاعتماديات
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# لو lockfile غير موجود (لم يُنشأ بعد في بيئة بلا إنترنت) نستخدم npm install
RUN npm ci || npm install

# مرحلة البناء
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# مرحلة التشغيل (standalone — output في next.config.mjs)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
