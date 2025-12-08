# NodeBB Production Setup (Remote)

Complete guide for deploying and running NodeBB in production with remote PostgreSQL and Redis servers.

## Prerequisites

- **Node.js**: Version 20 or greater on production server
- **Remote PostgreSQL**: Version 12 or greater (managed service or dedicated server)
- **Remote Redis**: Version 7.2 or greater (managed service or dedicated server)
- **Domain Name**: Configured and pointing to your server
- **SSL Certificate**: For HTTPS (use Let's Encrypt or your provider)
- **Reverse Proxy**: nginx or similar (recommended)

---

## Setup From Scratch

### 1. Prepare Remote Databases

#### PostgreSQL (Managed Service Examples)

**AWS RDS:**
- Create PostgreSQL instance
- Note endpoint: `your-db.xxxx.rds.amazonaws.com`
- Port: `5432`
- Create database: `nodebb_prod`

**DigitalOcean Managed Database:**
- Create PostgreSQL cluster
- Note connection details
- Add your server IP to trusted sources

**Azure Database for PostgreSQL:**
- Create PostgreSQL server
- Configure firewall rules
- Note connection string

**Self-Hosted PostgreSQL:**
```bash
# On database server
sudo -u postgres psql

CREATE DATABASE nodebb_prod;
CREATE USER nodebb_prod WITH PASSWORD 'strong_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE nodebb_prod TO nodebb_prod;

# Configure PostgreSQL to accept remote connections
# Edit /etc/postgresql/16/main/postgresql.conf
listen_addresses = '*'

# Edit /etc/postgresql/16/main/pg_hba.conf
# Add line (replace with your app server IP):
host    nodebb_prod    nodebb_prod    YOUR_APP_SERVER_IP/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Redis (Managed Service Examples)

**AWS ElastiCache:**
- Create Redis cluster
- Note endpoint: `your-redis.xxxx.cache.amazonaws.com`
- Port: `6379`
- Enable encryption in transit
- Note auth token

**Redis Cloud:**
- Create database
- Note endpoint and port
- Copy password

**DigitalOcean Redis:**
- Create Redis cluster
- Note connection URI
- Add your server IP to trusted sources

**Self-Hosted Redis:**
```bash
# On Redis server
sudo apt install redis-server

# Edit /etc/redis/redis.conf
bind 0.0.0.0
requirepass your_strong_redis_password
maxmemory 256mb
maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server

# Configure firewall to allow only your app server
sudo ufw allow from YOUR_APP_SERVER_IP to any port 6379
```

### 2. Prepare Production Server

**Install Node.js:**
```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

**Install Build Tools:**
```bash
sudo apt-get install -y build-essential git
```

**Create NodeBB User:**
```bash
sudo adduser --system --group nodebb
sudo mkdir -p /opt/nodebb
sudo chown -R nodebb:nodebb /opt/nodebb
```

### 3. Deploy NodeBB

**Clone Repository:**
```bash
sudo su - nodebb
cd /opt/nodebb
git clone https://github.com/NodeBB/NodeBB.git .
```

**Install Dependencies:**
```bash
npm install --omit=dev
```

### 4. Configure NodeBB for Production

**Run Setup:**
```bash
./nodebb setup
```

**Setup Prompts:**

- **URL of this installation**: `https://yourdomain.com`
- **Please enter a NodeBB secret**: Press Enter (auto-generated)
- **Which database to use**: `postgres`

**PostgreSQL Configuration:**
- **Host IP or address**: `your-db.example.com` (your remote PostgreSQL host)
- **Host port**: `5432`
- **PostgreSQL username**: `nodebb_prod`
- **Password**: Your secure PostgreSQL password
- **PostgreSQL database name**: `nodebb_prod`
- **Use SSL**: `yes` (if your database requires it)

**Redis Configuration:**
- **Redis hostname**: `your-redis.example.com` (your remote Redis host)
- **Redis port**: `6379`
- **Password**: Your Redis password
- **Redis database**: `0`

**Administrator Account:**
- **Administrator username**: Your choice
- **Administrator email**: Your email
- **Administrator password**: Strong password

**Alternative: Manual Configuration**

Create/edit `config.json`:
```json
{
    "url": "https://yourdomain.com",
    "secret": "generate-a-strong-secret-here",
    "database": "postgres",
    "port": 4567,
    "postgres": {
        "host": "your-db.example.com",
        "port": 5432,
        "username": "nodebb_prod",
        "password": "your_secure_password",
        "database": "nodebb_prod",
        "ssl": {
            "rejectUnauthorized": true
        }
    },
    "redis": {
        "host": "your-redis.example.com",
        "port": 6379,
        "password": "your_redis_password",
        "database": 0
    }
}
```

### 5. Build Assets

```bash
./nodebb build
```

### 6. Set Up Process Manager

**Using systemd (Recommended):**

Create `/etc/systemd/system/nodebb.service`:
```ini
[Unit]
Description=NodeBB Forum
Documentation=https://docs.nodebb.org
After=network.target postgresql.service redis.service

[Service]
Type=forking
User=nodebb
WorkingDirectory=/opt/nodebb
Environment="NODE_ENV=production"
PIDFile=/opt/nodebb/pidfile
ExecStart=/opt/nodebb/nodebb start
ExecStop=/opt/nodebb/nodebb stop
ExecReload=/opt/nodebb/nodebb restart
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable nodebb
sudo systemctl start nodebb
```

**Using PM2 (Alternative):**
```bash
npm install -g pm2
pm2 start ./nodebb -- start
pm2 save
pm2 startup
```

### 7. Configure Reverse Proxy (nginx)

**Install nginx:**
```bash
sudo apt install nginx
```

**Create nginx configuration** `/etc/nginx/sites-available/nodebb`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:4567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/nodebb /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Set Up SSL Certificate

**Using Certbot (Let's Encrypt):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Auto-renewal:**
```bash
sudo certbot renew --dry-run
```

### 9. Configure Firewall

```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

---

## Starting After Stopping

### Using systemd

**Check status:**
```bash
sudo systemctl status nodebb
```

**Start:**
```bash
sudo systemctl start nodebb
```

**Stop:**
```bash
sudo systemctl stop nodebb
```

**Restart:**
```bash
sudo systemctl restart nodebb
```

**View logs:**
```bash
sudo journalctl -u nodebb -f
```

### Using PM2

**Check status:**
```bash
pm2 status
```

**Start:**
```bash
pm2 start nodebb
```

**Stop:**
```bash
pm2 stop nodebb
```

**Restart:**
```bash
pm2 restart nodebb
```

**View logs:**
```bash
pm2 logs nodebb
```

### Using NodeBB Directly

**Start:**
```bash
cd /opt/nodebb
./nodebb start
```

**Stop:**
```bash
./nodebb stop
```

**Restart:**
```bash
./nodebb restart
```

**Status:**
```bash
./nodebb status
```

---

## Production Maintenance

### Updating NodeBB

```bash
cd /opt/nodebb
./nodebb stop

# Backup database first!
git pull
npm install --omit=dev
./nodebb upgrade
./nodebb build

# If using systemd
sudo systemctl start nodebb

# If using PM2
pm2 restart nodebb
```

### Database Backups

**PostgreSQL:**
```bash
# Create backup
pg_dump -h your-db.example.com -U nodebb_prod nodebb_prod > backup_$(date +%Y%m%d).sql

# Restore backup
psql -h your-db.example.com -U nodebb_prod nodebb_prod < backup_20240101.sql
```

**Automated backups (cron):**
```bash
# Add to crontab
0 2 * * * pg_dump -h your-db.example.com -U nodebb_prod nodebb_prod > /backups/nodebb_$(date +\%Y\%m\%d).sql && find /backups -name "nodebb_*.sql" -mtime +7 -delete
```

### Redis Backup

Redis automatically persists data if configured with AOF or RDB.

**Manual snapshot:**
```bash
redis-cli -h your-redis.example.com -a your_password BGSAVE
```

### Monitor Logs

**systemd:**
```bash
sudo journalctl -u nodebb -n 100 -f
```

**PM2:**
```bash
pm2 logs nodebb --lines 100
```

**NodeBB logs:**
```bash
tail -f /opt/nodebb/logs/output.log
```

### Performance Monitoring

**Install monitoring tools:**
```bash
npm install -g pm2
pm2 install pm2-logrotate
```

**Set up health checks:**
```bash
# Using cron
*/5 * * * * curl -f https://yourdomain.com || systemctl restart nodebb
```

---

## Security Best Practices

### Database Security

1. **Use strong passwords** (minimum 20 characters)
2. **Enable SSL/TLS** for database connections
3. **Restrict access** by IP whitelist
4. **Regular backups** (automated and tested)
5. **Keep PostgreSQL updated**

### Redis Security

1. **Use strong password** with `requirepass`
2. **Bind to private network** only
3. **Enable TLS** if available
4. **Limit memory** with `maxmemory`
5. **Disable dangerous commands** in production

### Application Security

1. **Keep NodeBB updated** regularly
2. **Use environment variables** for secrets
3. **Enable rate limiting**
4. **Configure CORS** properly
5. **Regular security audits**

### Server Security

1. **Enable firewall** (ufw or iptables)
2. **Disable root login** via SSH
3. **Use SSH keys** instead of passwords
4. **Keep system updated**
5. **Monitor logs** for suspicious activity

---

## Environment Variables (Recommended for Production)

Create `/opt/nodebb/.env`:
```bash
NODE_ENV=production
database=postgres
postgres__host=your-db.example.com
postgres__port=5432
postgres__username=nodebb_prod
postgres__password=your_secure_password
postgres__database=nodebb_prod
postgres__ssl__rejectUnauthorized=true
redis__host=your-redis.example.com
redis__port=6379
redis__password=your_redis_password
redis__database=0
```

**Secure the file:**
```bash
chmod 600 /opt/nodebb/.env
chown nodebb:nodebb /opt/nodebb/.env
```

---

## Troubleshooting

### Cannot Connect to Remote PostgreSQL

**Check connection:**
```bash
psql -h your-db.example.com -U nodebb_prod -d nodebb_prod
```

**Common issues:**
- Firewall blocking port 5432
- IP not whitelisted in database security settings
- Incorrect credentials
- SSL required but not configured

### Cannot Connect to Remote Redis

**Check connection:**
```bash
redis-cli -h your-redis.example.com -p 6379 -a your_password ping
```

**Common issues:**
- Firewall blocking port 6379
- IP not whitelisted
- Incorrect password
- Redis not configured for remote access

### 502 Bad Gateway (nginx)

**Check if NodeBB is running:**
```bash
sudo systemctl status nodebb
curl http://localhost:4567
```

**Check nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

### High Memory Usage

**Restart NodeBB:**
```bash
sudo systemctl restart nodebb
```

**Check Redis memory:**
```bash
redis-cli -h your-redis.example.com -a your_password INFO memory
```

---

## Scaling and High Availability

### Multiple NodeBB Instances

Update `config.json`:
```json
{
    "isCluster": true
}
```

### Load Balancer

Use nginx or cloud load balancer to distribute traffic across multiple NodeBB instances.

### Database Connection Pooling

Already configured by default. Adjust in `config.json`:
```json
{
    "postgres": {
        "pool": {
            "max": 20,
            "min": 2,
            "idleTimeoutMillis": 30000
        }
    }
}
```

---

## Quick Reference

| Task | systemd Command | PM2 Command |
|------|----------------|-------------|
| Start | `sudo systemctl start nodebb` | `pm2 start nodebb` |
| Stop | `sudo systemctl stop nodebb` | `pm2 stop nodebb` |
| Restart | `sudo systemctl restart nodebb` | `pm2 restart nodebb` |
| Status | `sudo systemctl status nodebb` | `pm2 status` |
| Logs | `sudo journalctl -u nodebb -f` | `pm2 logs nodebb` |

---

## Resources

- [Official Documentation](https://docs.nodebb.org)
- [Deployment Guide](https://docs.nodebb.org/installing/os/)
- [Scaling Guide](https://docs.nodebb.org/configuring/scaling/)
- [Community Forum](https://community.nodebb.org)
- [Security Best Practices](https://docs.nodebb.org/configuring/security/)
