FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Ensure .env is present during build


RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
