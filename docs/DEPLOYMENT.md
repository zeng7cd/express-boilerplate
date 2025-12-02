# 部署指南

## 环境变量配置

### 必需的环境变量

#### 数据库配置

- `DB_HOST`: 数据库主机地址
- `DB_PORT`: 数据库端口 (默认: 5432)
- `DB_USERNAME`: 数据库用户名
- `DB_PASSWORD`: 数据库密码
- `DB_DATABASE`: 数据库名称

#### 应用配置

- `NODE_ENV`: 运行环境 (development/production/test)
- `PORT`: 应用端口 (默认: 8080)
- `HOST`: 应用主机 (默认: localhost)
- `API_PREFIX`: API路径前缀 (默认: api)
- `CORS_ORIGIN`: 允许的跨域源

### 可选的环境变量

#### Redis配置

- `REDIS_HOST`: Redis主机地址 (默认: 127.0.0.1)
- `REDIS_PORT`: Redis端口 (默认: 6379)
- `REDIS_PASSWORD`: Redis密码
- `REDIS_DB`: Redis数据库编号 (默认: 0)

#### 安全配置

- `API_KEY`: API密钥（用于API访问验证）
- `ENCRYPTION_KEY`: 数据加密密钥（64位十六进制字符串）

#### 速率限制

- `COMMON_RATE_LIMIT_MAX_REQUESTS`: 通用速率限制最大请求数 (默认: 1000)
- `COMMON_RATE_LIMIT_WINDOW_MS`: 速率限制时间窗口毫秒数 (默认: 1000)

#### 日志配置

- `LOGGER_LEVEL`: 日志级别 (debug/info/warn/error, 默认: info)
- `LOG_TO_FILE`: 是否记录到文件 (默认: true)
- `LOG_FILE_MAX_SIZE`: 日志文件最大大小 (默认: 10MB)
- `LOG_FILE_MAX_FILES`: 保留的日志文件数量 (默认: 10)

## Docker 部署

### 构建镜像

```bash
# 构建生产镜像
docker build -t express-typescript-app .

# 构建并指定标签
docker build -t express-typescript-app:v1.0.0 .
```

### 运行容器

```bash
# 基础运行
docker run -d \
  --name express-app \
  -p 8080:8080 \
  -e DB_HOST=your-db-host \
  -e DB_USERNAME=your-db-user \
  -e DB_PASSWORD=your-db-password \
  -e DB_DATABASE=your-db-name \
  express-typescript-app

# 使用环境文件
docker run -d \
  --name express-app \
  -p 8080:8080 \
  --env-file .env.production \
  express-typescript-app

# 连接到网络（用于多容器部署）
docker run -d \
  --name express-app \
  --network app-network \
  -p 8080:8080 \
  --env-file .env.production \
  express-typescript-app
```

### Docker Compose 部署

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_USERNAME=postgres
      - DB_PASSWORD=password
      - DB_DATABASE=myapp REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health-check"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

启动服务：

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

## Kubernetes 部署

### 创建配置文件

`k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: express-app
```

`k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: express-app
data:
  NODE_ENV: "production"
  API_PREFIX: "api"
  LOGGER_LEVEL: "info"
```

`k8s/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: express-app
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-password>
  REDIS_PASSWORD: <base64-encoded-password>
```k8s/deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: express-app
  namespace: express-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: express-app
  template:
    metadata:
      labels:
        app: express-app
    spec:
      containers:
      - name: app
        image: your-registry/express-typescript-app:latest
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          value: "postgres-service"
        - name: DB_USERNAME
          value: "postgres"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: DB_PASSWORD
        envFrom:
        - configMapRef:
            name: app-config
        livenessProbe:
          httpGet:
            path: /health-check/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health-check/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

`k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: express-app-service
  namespace: express-app
spec:
  selector:
    app: express-app
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

### 部署到Kubernetes

```bash
# 创建命名空间
kubectl apply -f k8s/namespace.yaml

# 创建配置和密钥
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# 部署应用
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# 检查部署状态
kubectl get pods -n express-app
kubectl get services -n express-app

# 查看日志
kubectl logs -f deployment/express-app -n express-app
```

## 生产环境最佳实践

### 1. 安全配置

- 使用强密码和密钥
- 启用HTTPS
- 配置防火墙规则
- 定期更新依赖

### 2. 监控和日志

- 配置日志聚合（如ELK Stack）
- 设置应用监控（如Prometheus + Grafana）
- 配置告警规则

### 3. 备份策略

- 定期备份数据库
- 备份配置文件
- 测试恢复流程

### 4. 性能优化

- 启用Redis缓存
- 配置数据库连接池
- 使用CDN加速静态资源

### 5. 高可用性

- 多实例部署
- 负载均衡配置
- 数据库主从复制

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库服务是否运行
   - 验证连接参数
   - 检查网络连通性

2. **应用启动失败**
   - 检查环境变量配置
   - 查看应用日志
   - 验证端口是否被占用

3. **健康检查失败**
   - 检查 `/health-check` 端点
   - 验证数据库和Redis连接
   - 查看详细健康检查信息

### 日志查看

```bash
# Docker容器日志
docker logs express-app

# Kubernetes Pod日志
kubectl logs -f pod/express-app-xxx -n express-app

# 应用内部日志文件
docker exec -it express-app cat /app/logs/app.log
