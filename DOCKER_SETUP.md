# Docker Setup Guide

## Quick Start

### Prerequisites
- Docker Desktop installed
- Docker Compose installed

### Option 1: Using Docker Compose (Recommended for local development)

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Start all services:**
   ```bash
   npm run docker:up
   # or
   docker-compose up -d
   ```

3. **Check service status:**
   ```bash
   npm run docker:logs
   # or
   docker-compose logs -f app
   ```

4. **Verify health:**
   ```bash
   curl http://localhost:3000/health
   ```

5. **Stop services:**
   ```bash
   npm run docker:down
   # or
   docker-compose down
   ```

---

### Option 2: Docker Build Only (For On-Demand platforms)

1. **Build the image:**
   ```bash
   npm run docker:build
   # or
   docker build -t soc-report-gen:latest .
   ```

2. **Run container:**
   ```bash
   docker run -p 3000:3000 \
     -e DATABASE_URL="postgresql://user:pass@db-host:5432/db" \
     -e REDIS_URL="redis://redis-host:6379" \
     soc-report-gen:latest
   ```

---

## Services in Docker Compose

| Service | Port | Purpose |
|---------|------|---------|
| app | 3000 | Express API server |
| postgres | 5432 | SQL Database |
| redis | 6379 | Queue & Cache |

---

## Environment Variables

Configure in `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/soc_reports
REDIS_URL=redis://redis:6379
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## Database Migrations

The database automatically migrates on first run. To manually run:

```bash
# Inside the container
docker-compose exec app npx prisma migrate dev

# Or run with docker
docker run --rm \
  -e DATABASE_URL="postgresql://..." \
  soc-report-gen:latest \
  npx prisma migrate deploy
```

---

## Useful Docker Commands

```bash
# View logs
docker-compose logs -f app

# Restart specific service
docker-compose restart app

# Remove all containers and volumes
docker-compose down -v

# Rebuild image
docker-compose build --no-cache

# Access container shell
docker-compose exec app sh

# View container info
docker ps -a
```

---

## Production Deployment on On-Demand Platforms

### AWS (ECS/Fargate)
1. Push image to ECR: `aws ecr push soc-report-gen:latest`
2. Create ECS task with the image
3. Link to RDS (PostgreSQL) and ElastiCache (Redis)

### Azure (Container Instances/App Service)
1. Push to ACR: `az acr build`
2. Deploy to App Service with environment variables
3. Link to Azure Database for PostgreSQL
4. Link to Azure Cache for Redis

### Google Cloud (Cloud Run)
1. Push to Artifact Registry
2. Deploy with `gcloud run deploy`
3. Set environment variables
4. Configure Cloud SQL (PostgreSQL) and Memorystore (Redis)

---

## Troubleshooting

**Port already in use:**
```bash
# Change port in .env
PORT=3001
```

**Database connection failed:**
```bash
# Check postgres is running
docker-compose ps

# View postgres logs
docker-compose logs postgres
```

**Redis connection failed:**
```bash
# Check redis is running
docker-compose ps

# Verify connectivity
docker-compose exec app redis-cli -h redis ping
```

**Rebuild everything from scratch:**
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```
