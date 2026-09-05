# Setup PostgreSQL Database

**Trigger**: User wants to setup/configure/initialize the database

## Description
Sets up local PostgreSQL database for ALCOA+ QA backend integration.

## Prerequisites
- PostgreSQL installed OR Docker available
- Port 5432 available
- 100MB+ free disk space

## Option 1: Docker (Recommended)

```bash
docker run -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:latest

# Create database
docker exec -it <container_id> psql -U postgres -c \
  "CREATE DATABASE alcoa_qa_db;"
```

## Option 2: Native PostgreSQL

```bash
# Linux
sudo -u postgres createdb alcoa_qa_db

# macOS
createdb alcoa_qa_db

# Windows (using psql)
psql -U postgres
CREATE DATABASE alcoa_qa_db;
```

## Verify Connection

```bash
psql -h localhost -U postgres -d alcoa_qa_db
```

## Environment Configuration

Update `.env.production`:
```
VITE_DATABASE_HOST=localhost
VITE_DATABASE_PORT=5432
VITE_DATABASE_NAME=alcoa_qa_db
```

## Notes
- Default user: postgres
- Default password: password
- Port: 5432
