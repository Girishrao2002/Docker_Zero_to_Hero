# Docker Volumes and Bind Mounts

A comprehensive guide to persisting data and sharing files between Docker containers and the host machine.

## Table of Contents

- [Introduction](#introduction)
- [Volumes](#volumes)
- [Bind Mounts](#bind-mounts)
- [Comparison](#comparison)
- [Use Cases](#use-cases)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## Introduction

Docker containers are ephemeral by default—when a container stops, its data is lost. To persist data across container restarts and share files between the host and containers, Docker provides two primary mechanisms:

1. **Volumes** - Docker-managed storage
2. **Bind Mounts** - Directory mappings between host and container

---

## Volumes

### What are Volumes?

Volumes are the preferred mechanism for persisting data in Docker. They are managed by Docker and stored in a specific location on the host machine (typically `/var/lib/docker/volumes/` on Linux).

### Key Characteristics

- **Docker-managed**: Docker creates and manages the volume storage
- **Independent of container lifecycle**: Volumes persist even after container deletion
- **Easy backup and migration**: Volumes can be backed up and moved between hosts
- **Performance**: Better performance on all platforms
- **Cross-platform**: Work consistently on Windows, macOS, and Linux

### Creating and Using Volumes

#### Create a Named Volume

```bash
docker volume create my-volume
```

#### Run a Container with a Volume

```bash
# Using named volume
docker run -d --name my-container -v my-volume:/data nginx

# Using anonymous volume
docker run -d --name my-container -v /data nginx
```

#### List Volumes

```bash
docker volume ls
```

#### Inspect Volume Details

```bash
docker volume inspect my-volume
```

#### Remove a Volume

```bash
docker volume rm my-volume
```

#### Remove Unused Volumes

```bash
docker volume prune
```

### Volume Types

#### **Named Volumes**

A volume with an explicit name that you create and refer to by name.

```bash
docker run -d -v my-named-volume:/app/data nginx
```

#### **Anonymous Volumes**

A volume without an explicit name, created and managed automatically.

```bash
docker run -d -v /app/data nginx
```

#### **Host Volumes** (Using Volumes with Bind Mount Behavior)

Volumes can also reference directories on the host.

```bash
docker run -d -v /host/path:/container/path nginx
```

### Volume Docker Compose Example

```yaml
version: '3.8'

services:
  app:
    image: nginx:latest
    volumes:
      - my-volume:/usr/share/nginx/html
    
volumes:
  my-volume:
    driver: local
```

---

## Bind Mounts

### What are Bind Mounts?

Bind mounts map a file or directory on the host machine directly to a location inside the container. The host path is absolute and fully controlled by you.

### Key Characteristics

- **Host-controlled**: You specify the exact host path
- **Flexible**: Can mount any file or directory on the host
- **Performance**: Can be slower on macOS and Windows due to filesystem translation
- **Non-persistent**: If the host path doesn't exist, Docker may create it
- **Development-friendly**: Ideal for development workflows (code changes reflected instantly)

### Using Bind Mounts

#### Basic Syntax

```bash
docker run -d --name my-container -v /host/path:/container/path image-name
```

#### Full Syntax with Options

```bash
docker run -d --name my-container -v /host/path:/container/path:ro image-name
```

The `:ro` flag makes the mount read-only.

### Bind Mount Examples

#### Mount a Directory

```bash
docker run -d -v $(pwd):/app -w /app node:16 npm start
```

#### Mount a Single File

```bash
docker run -d -v ~/.ssh/id_rsa:/root/.ssh/id_rsa:ro alpine
```

#### Mount with Read-Only Access

```bash
docker run -d -v /host/config:/app/config:ro nginx
```

#### Mount with Read-Write Access (default)

```bash
docker run -d -v /host/data:/app/data nginx
```

### Bind Mount Docker Compose Example

```yaml
version: '3.8'

services:
  app:
    image: node:16
    volumes:
      - ./src:/app/src        # Mount source code
      - ./config:/app/config:ro  # Mount config (read-only)
      - /app/node_modules     # Anonymous volume for dependencies
    working_dir: /app
    command: npm start
```

---

## Comparison

| Feature | Volumes | Bind Mounts |
|---------|---------|------------|
| **Storage Location** | Docker-managed (`/var/lib/docker/volumes/`) | User-specified path |
| **Management** | Docker handles | User handles |
| **Portability** | Easy to backup and migrate | Less portable |
| **Performance** | Better on all platforms | Slower on macOS/Windows |
| **Development** | Less ideal for development | Ideal for development |
| **Data Persistence** | Persists independently | Tied to host filesystem |
| **Configuration** | Via Docker API | Via filesystem path |
| **File Permissions** | Docker manages | Host-controlled |
| **Use Case** | Production databases, logs | Development, source code |

---

## Use Cases

### When to Use Volumes

- **Production databases**: MySQL, PostgreSQL, MongoDB
- **Application logs**: Long-term log storage
- **Shared data between containers**: Multiple containers accessing same data
- **Backup and recovery**: Easy to backup volume contents
- **Host independence**: Portability across different host systems
- **Sensitive data**: Database credentials, secrets

### When to Use Bind Mounts

- **Development environment**: Immediate code changes reflection
- **Configuration files**: Mount local config files into container
- **Single-file mounts**: Mount individual files like `.bashrc` or `.ssh`
- **Testing**: Quick testing of local files in container
- **Source code editing**: Edit code locally and run in container

---

## Examples

### Example 1: Development Todo App with Volumes and Bind Mounts

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src              # Bind mount for live code changes
      - ./config:/app/config:ro     # Read-only config
      - app-logs:/var/log/app       # Named volume for logs
    environment:
      - NODE_ENV=development

  db:
    image: postgres:13
    volumes:
      - db-data:/var/lib/postgresql/data  # Volume for persistent database
    environment:
      - POSTGRES_PASSWORD=secret

volumes:
  app-logs:
  db-data:
```

### Example 2: Database with Backup

```bash
# Create a volume for PostgreSQL
docker volume create postgres-data

# Run database container
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=mypassword \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:13

# Backup the volume
docker run --rm \
  -v postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore from backup
docker run --rm \
  -v postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /data
```

### Example 3: Development Environment

```bash
# Clone repository
git clone https://github.com/user/my-app.git
cd my-app

# Run with bind mount for live development
docker run -it \
  -v $(pwd):/workspace \
  -w /workspace \
  node:16 \
  bash

# Inside container: Changes to /workspace are reflected in host's $(pwd)
```

### Example 4: Configuration Management

```bash
# Mount configuration files
docker run -d \
  --name app \
  -v /etc/app/config.yml:/app/config.yml:ro \
  -v app-data:/app/data \
  my-app:latest
```

---

## Best Practices

### Volume Best Practices

1. **Use Named Volumes**: Always prefer named volumes over anonymous ones for production
   ```bash
   docker volume create app-data
   docker run -v app-data:/data myapp
   ```

2. **Backup Regularly**: Implement automated backup strategies
   ```bash
   docker run --rm -v my-volume:/data -v /backup:/backup \
     alpine tar czf /backup/backup.tar.gz -C /data .
   ```

3. **Use `docker volume inspect`**: Verify volume configuration
   ```bash
   docker volume inspect app-data
   ```

4. **Clean Up Unused Volumes**: Prevent disk space waste
   ```bash
   docker volume prune
   ```

5. **Document Volume Purpose**: Use naming conventions
   - `db-prod-data`, `cache-redis`, `logs-app`

### Bind Mount Best Practices

1. **Use Absolute Paths**: Avoid relative paths for clarity
   ```bash
   # Good
   docker run -v /home/user/project:/app myapp
   
   # Avoid
   docker run -v ./project:/app myapp
   ```

2. **Use `.dockerignore`**: Prevent syncing unnecessary files
   ```
   node_modules
   .git
   .vscode
   dist
   ```

3. **Set Appropriate Permissions**: Use `:ro` for read-only when possible
   ```bash
   docker run -v /config:/app/config:ro myapp
   ```

4. **Avoid Mounting Root Directory**: Security risk
   ```bash
   # Bad
   docker run -v /:/app myapp
   
   # Good
   docker run -v /var/app:/app myapp
   ```

5. **Use Bind Mounts in Development Only**: Switch to volumes in production
   ```yaml
   # Development
   volumes:
     - ./src:/app/src
   
   # Production - use only volumes
   volumes:
     - app-data:/app/data
   ```

### General Best Practices

1. **Never Store Sensitive Data in Bind Mounts**: Use volumes or secrets
2. **Monitor Disk Usage**: Volumes and bind mounts consume disk space
   ```bash
   docker system df
   ```

3. **Use `--mount` Syntax (Newer)**: More explicit than `-v`
   ```bash
   docker run \
     --mount type=volume,source=db-data,target=/var/lib/db \
     --mount type=bind,source=/host/config,target=/etc/config,readonly \
     myapp
   ```

4. **Document Your Storage Strategy**: Clearly define what uses volumes vs bind mounts

5. **Test Backup and Restore**: Ensure volumes can be recovered

---

## Quick Reference

### Creating Volumes

```bash
# Create named volume
docker volume create my-volume

# List all volumes
docker volume ls

# Inspect volume
docker volume inspect my-volume

# Remove volume
docker volume rm my-volume

# Prune unused volumes
docker volume prune
```

### Using Volumes

```bash
# Run with named volume
docker run -v my-volume:/data myapp

# Run with anonymous volume
docker run -v /data myapp

# Read-only volume
docker run -v my-volume:/data:ro myapp
```

### Using Bind Mounts

```bash
# Basic bind mount
docker run -v /host/path:/container/path myapp

# Read-only bind mount
docker run -v /host/path:/container/path:ro myapp

# Current directory
docker run -v $(pwd):/app myapp
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop services and remove volumes
docker-compose down -v
```

---

## Resources

- [Docker Documentation - Volumes](https://docs.docker.com/storage/volumes/)
- [Docker Documentation - Bind Mounts](https://docs.docker.com/storage/bind-mounts/)
- [Docker Documentation - Storage Overview](https://docs.docker.com/storage/)
- [Docker Compose Volume Documentation](https://docs.docker.com/compose/compose-file/compose-file-v3/#volumes)

---

## Summary

- **Volumes** are the recommended approach for data persistence in production
- **Bind Mounts** are ideal for development workflows
- Use volumes for databases, logs, and sensitive data
- Use bind mounts for source code and configuration during development
- Always consider performance and portability when choosing
- Implement regular backup strategies for critical data
- Keep production containers separate from development setup

