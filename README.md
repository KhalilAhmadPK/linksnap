# 🔗 LinkSnap — URL Shortener

<div align="center">

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Nginx](https://img.shields.io/badge/Nginx-Alpine-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)

**A full-stack URL shortener — fully containerized with Docker Compose.**

*Part of a hands-on DevOps learning roadmap.*

</div>

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                linksnap-network (bridge)              │
│                                                      │
│  ┌──────────────────┐      ┌──────────────────────┐  │
│  │    Frontend       │      │       Backend        │  │
│  │  React + Nginx    │─────▶│  Node.js / Express   │  │
│  │  localhost:3000   │      │   localhost:5000      │  │
│  └──────────────────┘      └───────────┬──────────┘  │
│                                         │              │
│                              ┌──────────▼───────────┐  │
│                              │      PostgreSQL       │  │
│                              │   postgres:17-alpine  │  │
│                              │  [postgres_data vol]  │  │
│                              └──────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

| Container | Image | Port | Role |
|-----------|-------|------|------|
| `linksnap_frontend` | `nginx:alpine` | `3000:80` | Serves compiled React app |
| `linksnap_backend` | `node:22-alpine` | `5000:5000` | REST API + redirect handler |
| `linksnap_postgres` | `postgres:17-alpine` | internal only | Persistent URL storage |

---

## Docker Concepts Covered

### 1. Multi-Stage Build (Frontend)

Frontend Dockerfile has **two stages** used — This is important production pattern:

```dockerfile
# Stage 1 — Build React app (Node.js)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build          # /app/dist/ mein compiled files

# Stage 2 — Serve with Nginx (no Node.js!)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Result:** Final image has no Node.js traces — Only Nginx + compiled static files.

| | Single Stage | Multi-Stage |
|--|-------------|-------------|
| Base | `node:22-alpine` | `nginx:alpine` |
| Image Size | ~900 MB | ~25 MB |

---

### 2. Docker Compose — 3 Services

```yaml
services:
  frontend:   # React → Nginx
  backend:    # Node.js API
  postgres:   # Database
```

All three services start from single file `docker-compose.yml` — No need to run `docker run` separately.

---

### 3. Named Volumes — Data Persistence

```yaml
volumes:
  postgres_data:

services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

**Test:**
```bash
# Make some URLs and then remove containers
docker compose down

# Start again
docker compose up -d

# Data is still available
curl http://localhost:5000/api/urls

# Visit in browser
http://localhost:3000/
```

After container deletion data is still safe beacuse volume exists **outside** of container.

---

### 4. Bridge Networking — Service Discovery

```yaml
networks:
  linksnap-network:
    driver: bridge
```

All services are on a private network. The backend communicates with PostgreSQL **using its name, not an IP address**.

```javascript
// backend/src/db.js
host: process.env.POSTGRES_HOST   // value = "postgres" (container name)
```

Docker automatically resolves the name `postgres` to the correct container IP. This is called service discovery.

---

### 5. Health Checks + depends_on

```yaml
postgres:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U linksnap_user -d linksnap"]
    interval: 10s
    retries: 5

backend:
  depends_on:
    postgres:
      condition: service_healthy   
```

`service_started` (default) only waits for the container to start.
`service_healthy` waits for the database to actually be ready — this **prevents race conditions**.

---

### 6. Environment Variables

Secrets and config are stored in a `.env` file, not hardcoded directly in `docker-compose.yml`.

```env
# .env
POSTGRES_DB=linksnap
POSTGRES_USER=linksnap_user
POSTGRES_PASSWORD=StrongPass123!
VITE_API_URL=http://localhost:5000
```

```yaml
# docker-compose.yml
environment:
  - POSTGRES_DB=${POSTGRES_DB}
  - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
```

---

### 7. Build-time vs Runtime Variables

**Runtime** (backend) — injected when the container starts:
```yaml
environment:
  - POSTGRES_HOST=postgres
```

**Build-time** (frontend) — baked into the bundle during the React build process:
```yaml
build:
  args:
    VITE_API_URL: ${VITE_API_URL}    # npm run build 
```

This distinction is important — React is a static bundle and cannot read environment variables at runtime.

---


## 🚀 Running the Project

```bash
git clone https://github.com/KhalilAhmadPK/linksnap.git
cd linksnap
cp .env.example .env
docker compose up --build -d
```

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | React frontend UI |
| `http://localhost:5000/api/health` | Backend health check |

### Useful Commands

```bash
# Check status of all services
docker compose ps

# Follow logs
docker compose logs -f
docker compose logs -f backend

# Access a container shell
docker compose exec backend sh
docker compose exec postgres psql -U linksnap_user -d linksnap

# Stop containers (data is preserved)
docker compose down

# Remove containers + volumes (fresh start)
docker compose down -v

# Rebuild only one service
docker compose build backend
docker compose up -d backend
```

---

## 🗂️ Project Structure

```
linksnap/
├── frontend/
│   ├── src/                  # React source code
│   ├── vite.config.js
│   ├── package.json
│   └── Dockerfile            # ⭐ Multi-stage: Node → Nginx
├── backend/
│   ├── src/                  # Express routes, DB, utils
│   ├── index.js
│   ├── package.json
│   └── Dockerfile            # Node.js 22 Alpine
├── docker-compose.yml        # ⭐ All 3 services
├── .env                      # Local secrets (not in Git)
├── .env.example              # Safe template for contributors
└── README.md
```

---

## 📋 DevOps Concepts Summary

| Concept | Implementation |
|---------|----------------|
| Multi-stage build | Frontend: Node (build) → Nginx (serve) |
| Named volumes | `postgres_data` — data outlives containers |
| Bridge network | `linksnap-network` — service discovery by name |
| Health checks | `pg_isready` before API starts |
| depends_on | `service_healthy` condition |
| Environment variables | `.env` → injected at runtime |
| Build args | `VITE_API_URL` baked into React bundle at build time |
| restart policy | `unless-stopped` — auto-recover from crashes |
| .dockerignore | `node_modules` excluded from build context |

---

## Author

**[Khalil Ahmad]** — [GitHub](https://github.com/KhalilAhmadPK) · [LinkedIn](https://linkedin.com/in/)

---
