# NodeBB Development Setup (Local)

Complete guide for setting up and running NodeBB locally with PostgreSQL and Redis.

## Prerequisites

- **Node.js**: Version 20 or greater ([download](https://nodejs.org/))
- **PostgreSQL**: Version 12 or greater
- **Redis**: Version 7.2 or greater
- **Git**: For cloning the repository

---

## Setup From Scratch

### 1. Install PostgreSQL Locally

**Windows:**
```bash
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql

# Start PostgreSQL service
net start postgresql-x64-16
```

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Create Database:**
```bash
# Access PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE nodebb;
CREATE USER nodebb WITH PASSWORD 'nodebb_local';
GRANT ALL PRIVILEGES ON DATABASE nodebb TO nodebb;
\q
```

**Using Docker (Alternative):**
```bash
docker run -d \
  --name nodebb-postgres \
  -e POSTGRES_DB=nodebb \
  -e POSTGRES_USER=nodebb \
  -e POSTGRES_PASSWORD=nodebb_local \
  -p 5432:5432 \
  -v nodebb_postgres_data:/var/lib/postgresql/data \
  postgres:18.1-alpine
```

### 2. Install Redis Locally

**Windows:**
```bash
# Download from https://github.com/microsoftarchive/redis/releases
# Or use Chocolatey:
choco install redis-64

# Start Redis
redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Using Docker (Alternative):**
```bash
docker run -d \
  --name nodebb-redis \
  -p 6379:6379 \
  -v nodebb_redis_data:/data \
  redis:8.4.0-alpine \
  redis-server --appendonly yes
```

### 3. Install NodeBB Dependencies

```bash
npm install
```

Or using Bun:
```bash
bun install
```

### 4. Configure NodeBB

Run the interactive setup:

```bash
./nodebb setup
```

**Windows:**
```bash
nodebb.bat setup
```

**Setup Prompts:**

- **URL of this installation**: `http://localhost:4567`
- **Please enter a NodeBB secret**: Press Enter (auto-generated)
- **Which database to use**: `postgres`

**PostgreSQL Configuration:**
- **Host IP or address**: `localhost`
- **Host port**: `5432`
- **PostgreSQL username**: `nodebb`
- **Password**: `nodebb_local`
- **PostgreSQL database name**: `nodebb`

**Redis Configuration:**
- **Redis hostname**: `localhost`
- **Redis port**: `6379`
- **Password**: (leave empty)
- **Redis database**: `0`

**Administrator Account:**
- **Administrator username**: Your choice (e.g., `admin`)
- **Administrator email**: Your email
- **Administrator password**: Secure password

### 5. Build NodeBB Assets

```bash
./nodebb build
```

**Windows:**
```bash
nodebb.bat build
```

### 6. Start NodeBB

```bash
./nodebb start
```

**Windows:**
```bash
nodebb.bat start
```

Visit: [http://localhost:4567](http://localhost:4567)

---

## Starting After Stopping

### Check Status

```bash
./nodebb status
```

### Start NodeBB

**Production Mode:**
```bash
./nodebb start
```

**Development Mode (auto-reload on changes):**
```bash
./nodebb dev
```

**Watch Mode (rebuild assets on changes):**
```bash
./nodebb watch
```

### Stop NodeBB

```bash
./nodebb stop
```

### Restart NodeBB

```bash
./nodebb restart
```

### View Logs

```bash
./nodebb log
```

---

## Configuration File

After setup, your local configuration is stored in `config.json`:

```json
{
    "url": "http://localhost:4567",
    "secret": "auto-generated-secret",
    "database": "postgres",
    "port": 4567,
    "postgres": {
        "host": "localhost",
        "port": 5432,
        "username": "nodebb",
        "password": "nodebb_local",
        "database": "nodebb"
    },
    "redis": {
        "host": "localhost",
        "port": 6379,
        "password": "",
        "database": 0
    }
}
```

---

## Using Docker Compose (Complete Local Environment)

**Start everything:**
```bash
docker-compose -f docker-compose-pgsql.yml up -d
```

**View logs:**
```bash
docker-compose -f docker-compose-pgsql.yml logs -f nodebb
```

**Stop everything:**
```bash
docker-compose -f docker-compose-pgsql.yml down
```

**Rebuild after code changes:**
```bash
docker-compose -f docker-compose-pgsql.yml up -d --build
```

---

## Useful Development Commands

```bash
# Start in development mode (auto-restart on changes)
./nodebb dev

# Build assets
./nodebb build

# Build and watch for changes
./nodebb watch

# Reset database (WARNING: deletes all data)
./nodebb reset

# Reset admin password
./nodebb reset -p <new-password>

# Run setup again
./nodebb setup

# Upgrade NodeBB
./nodebb upgrade

# Run tests
npm test

# Lint code
npm run lint
```

---

## Troubleshooting

### PostgreSQL Connection Issues

**Check if PostgreSQL is running:**
```bash
# Linux/macOS
pg_isready

# Windows
pg_ctl status
```

**Test connection:**
```bash
psql -U nodebb -h localhost -d nodebb
```

**Common fixes:**
- Verify PostgreSQL service is running
- Check username/password in `config.json`
- Ensure database exists: `psql -U postgres -c "\l"`
- Check PostgreSQL logs

### Redis Connection Issues

**Check if Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

**Common fixes:**
- Start Redis service
- Check if port 6379 is available
- Verify Redis is listening on localhost

### Port 4567 Already in Use

**Change port in `config.json`:**
```json
{
    "port": 8080
}
```

Then restart NodeBB.

### Build Errors

**Clear build cache:**
```bash
rm -rf build/public
rm -rf node_modules/.cache
./nodebb build
```

**Reinstall dependencies:**
```bash
rm -rf node_modules
npm install
./nodebb build
```

### Database Migration Errors

**Reset and rebuild database (WARNING: deletes all data):**
```bash
./nodebb setup
```

---

## Environment Variables (Alternative to config.json)

Create a `.env` file:

```bash
NODE_ENV=development
database=postgres
postgres__host=localhost
postgres__port=5432
postgres__username=nodebb
postgres__password=nodebb_local
postgres__database=nodebb
redis__host=localhost
redis__port=6379
redis__password=
```

---

## Development Workflow

### Making Changes

1. Edit code in `src/` directory
2. If running `./nodebb dev`, changes auto-reload
3. If not, rebuild and restart:
   ```bash
   ./nodebb build
   ./nodebb restart
   ```

### Frontend Changes (CSS/JS)

```bash
./nodebb watch
```

This watches for changes and rebuilds assets automatically.

### Database Changes

After modifying database schema:
```bash
./nodebb upgrade
```

---

## Next Steps

- Configure email for testing: Use [MailHog](https://github.com/mailhog/MailHog) or [Mailpit](https://github.com/axllent/mailpit)
- Install development plugins
- Set up IDE/editor with NodeBB project
- Review [Contributing Guidelines](.github/CONTRIBUTING.md)

---

## Quick Reference

| Task | Command |
|------|---------|
| Start | `./nodebb start` |
| Stop | `./nodebb stop` |
| Restart | `./nodebb restart` |
| Dev Mode | `./nodebb dev` |
| Build | `./nodebb build` |
| Watch | `./nodebb watch` |
| Logs | `./nodebb log` |
| Status | `./nodebb status` |
| Setup | `./nodebb setup` |

---

## Resources

- [Official Documentation](https://docs.nodebb.org)
- [Developer Community](https://community.nodebb.org)
- [GitHub Repository](https://github.com/NodeBB/NodeBB)
- [Discord Server](https://discord.gg/p6YKPXu7er)
