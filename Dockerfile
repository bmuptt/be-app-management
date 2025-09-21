FROM node:23.6.0

# Set timezone to Asia/Jakarta (UTC+7)
ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /usr/src/app

COPY . .

RUN npm install
RUN npm run build

CMD ["npm", "start"]
