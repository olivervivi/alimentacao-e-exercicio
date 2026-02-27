FROM node:20-alpine AS builder
WORKDIR /app
# Instalamos as ferramentas de build e forçamos a instalação do rollup para linux-musl
RUN apk add --no-cache python3 python3-dev build-base
COPY . .
# Removemos o omit=optional para o Vite funcionar corretamente
RUN npm install --no-audit && npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
