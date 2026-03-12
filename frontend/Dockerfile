FROM node:18-alpine

WORKDIR /app

ENV REACT_APP_API_URL=https://app.granular-registry.com/api

COPY package*.json ./

RUN npm ci

COPY . .

ENV NODE_ENV=production
RUN npm run build

FROM nginx:alpine

COPY --from=0 /app/dist /usr/share/nginx/html

# Create custom nginx configuration for port 8080
RUN echo 'server { listen 8080; location / { root /usr/share/nginx/html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"] 