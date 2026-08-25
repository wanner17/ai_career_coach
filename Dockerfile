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
# Set only when this build is served under a subpath (e.g. a university site
# reverse-proxying /career/** to this app instead of hosting it at its own
# root — see nginx.conf's comment on that setup) — asset references and the
# in-app router both need the prefix baked in at build time. Leave unset for
# a normal root deployment; nothing here changes behavior in that case.
ARG VITE_BASE_PATH="/"
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
RUN npm run build

# Runtime stage — static files + nginx only, no Node left in the final image.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
