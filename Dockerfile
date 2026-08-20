# Build stage — npm ci + vite build. VITE_API_BASE defaults to "" (same
# origin) since the runtime stage's nginx reverse-proxies /api/** to the
# backend container — the browser only ever talks to one origin, so
# career-backend's CORS allow-list barely matters for this path.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE=""
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

# Runtime stage — static files + nginx only, no Node left in the final image.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
