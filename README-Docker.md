# Docker Deployment Guide

This guide covers deploying the URIT-5160 TCP Server using Docker with security best practices.

## 🐳 Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available
- SSL certificates (for production)

### Basic Deployment

```bash
# Clone the repository
git clone <repository-url>
cd sisvida-bot

# Create environment file
cp env.example .env
# Edit .env with your credentials

# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f urit-server
```

## 🔒 Security Features

### Container Security

- **Non-root user**: Application runs as non-privileged user (UID 1001)
- **Read-only filesystem**: Where possible, containers use read-only filesystems
- **Capability dropping**: Containers drop unnecessary Linux capabilities
- **No new privileges**: Containers cannot gain additional privileges
- **Resource limits**: Memory and CPU limits prevent resource exhaustion
- **Signal handling**: Proper signal handling with dumb-init

### Network Security

- **Isolated networks**: Services run in isolated Docker networks
- **Direct TCP access**: Direct access to the URIT-5160 server on port 8080
- **Security headers**: Basic security headers in the application

### Application Security

- **Environment variables**: Sensitive data passed via environment variables
- **Health checks**: Regular health checks ensure service availability
- **Logging**: Comprehensive logging for security monitoring
- **Error handling**: Graceful error handling prevents information leakage

## 📁 File Structure

```
.
├── Dockerfile              # Multi-stage development Dockerfile
├── docker-compose.yml      # Docker compose file
├── .dockerignore          # Docker build context exclusions
├── env.example            # Environment variables template
└── README-Docker.md       # This file
```

## 🚀 Deployment Options

### Development

```bash
# Development deployment
docker-compose up -d

# With test client
docker-compose up -d
npm run test-client
```

### Production

```bash
# Production deployment
docker-compose up -d
```

### Custom Configuration

```bash
# Custom environment file
docker-compose --env-file .env.prod up -d

# Custom port mapping
docker-compose -p urit-prod up -d
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Sisvida Credentials
SISVIDA_USERNAME=your_username
SISVIDA_PASSWORD=your_password

# Server Configuration
TCP_PORT=8080
HEADLESS=true
NODE_ENV=production

# Optional: Monitoring
GRAFANA_PASSWORD=secure_password
```

### TCP Configuration

The URIT-5160 analyzer should connect directly to:

- **Development**: `localhost:8080`
- **Production**: `your-server-ip:8080`

No additional proxy configuration is needed.

## 📊 Monitoring

### Health Checks

```bash
# Check service health
docker-compose ps

# View health check logs
docker-compose logs urit-server | grep health
```

### Basic Monitoring

- **Health checks**: Built-in container health monitoring
- **Logs**: Comprehensive logging for troubleshooting

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f urit-server


```

## 🔍 Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check container status
docker-compose ps

# View startup logs
docker-compose logs urit-server

# Check resource usage
docker stats
```

#### Connection Issues

```bash
# Test TCP connectivity
telnet localhost 8080

# Check port binding
docker-compose port urit-server 8080

# Test health endpoint
curl http://localhost:8080/health
```



### Debug Mode

```bash
# Run with debug logging
DEBUG=true docker-compose up

# Access container shell
docker-compose exec urit-server sh

# View container filesystem
docker-compose exec urit-server ls -la
```

## 🔄 Updates and Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup and Restore

```bash
# Backup data volumes
docker run --rm -v urit-server_screenshots:/data -v $(pwd):/backup alpine tar czf /backup/screenshots-backup.tar.gz -C /data .

# Restore data volumes
docker run --rm -v urit-server_screenshots:/data -v $(pwd):/backup alpine tar xzf /backup/screenshots-backup.tar.gz -C /data
```

### Cleanup

```bash
# Remove unused containers and images
docker system prune -f

# Remove all project containers and volumes
docker-compose down -v --remove-orphans
```

## 🛡️ Security Checklist

- [ ] Environment variables are properly set

- [ ] Non-root user is being used
- [ ] Resource limits are appropriate
- [ ] Security headers are enabled
- [ ] Health checks are working
- [ ] Logs are being monitored
- [ ] Regular security updates are applied
- [ ] Backup strategy is in place

## 📈 Performance Tuning

### Resource Optimization

```yaml
# In docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
    reservations:
      memory: 512M
      cpus: '0.5'
```



### Node.js Optimization

```bash
# Environment variables for Node.js optimization
NODE_ENV=production
NODE_OPTIONS="--max-old-space-size=1536"
```

## 🔗 Integration

### URIT-5160 Analyzer

Configure your URIT-5160 analyzer to connect to:

- **Development**: `localhost:8080`
- **Production**: `your-server-ip:8080`

### External Monitoring

Integrate with external monitoring systems:

- **Health checks**: Monitor container health status
- **Logs**: Centralized logging for troubleshooting

## 📚 Additional Resources

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [TCP Server Security](https://owasp.org/www-project-api-security/) 