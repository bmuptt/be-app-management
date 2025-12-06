FROM node:24.11.1

# Set timezone to Asia/Jakarta (UTC+7)
ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /usr/src/app

COPY . .

RUN npm install
# Generate Prisma Client to ensure '@prisma/client' exports Prisma/PrismaClient
RUN npx prisma generate
RUN npm run build

CMD ["npm", "start"]
