# Etapa 1: Compilación de la app de Angular
FROM node:20-alpine AS build
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci

# Copiar el código fuente y compilar
COPY . .
RUN npm run build -- --configuration=production

# Etapa 2: Servidor Web Nginx para servir el contenido estático
FROM nginx:alpine
COPY --from=build /app/dist/consultora-pro/browser /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
