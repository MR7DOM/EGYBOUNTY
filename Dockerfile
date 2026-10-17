FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# إنشاء مجلد الرفع داخل مسار العمل ومنحه الصلاحيات
RUN mkdir -p uploads && chmod -R 777 uploads

EXPOSE 3000
CMD ["node", "src/server.js"]
