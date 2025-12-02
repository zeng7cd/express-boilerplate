# API 文档

## 健康检查端点

### GET /health-check

基础健康检查

**响应示例:**

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 123.456
  }
}
```

### GET /health-check/detailed

详细健康检查，包含数据库、Redis、内存使用情况和性能指标

**响应示例:**

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "database": {
      "healthy": true,
      "details": {
        "currentTime": "2024-01-01T00:00:00.000Z",
        "version": "PostgreSQL 15.0",
        "totalConnections": 10,
        "idleConnections": 8,
        "waitingConnections": 0
      }
    },
    "redis": {
      "healthy": true,
      "details": {
        "ping": "PONG",
        "memory": "..."
      }
    },
    "memory": {
      "rss": 123456789,
      "heapTotal": 987654321,
      "heapUsed": 456789123
    },
    "uptime": 123.456,
    "metrics": {
      "totalRequests": 1000,
      "avgResponseTime": 150,
      "p95ResponseTime": 300
    }
  }
}
```

### GET /health-check/ready

Kubernetes 就绪检查

### GET /health-check/live

Kubernetes 存活检查

## 车辆管理端点

### GET /api/subway/vehicles

获取所有车辆信息

**响应示例:**

```json
{
  "success": true,
  "message": "操作成功",
  "data": ["vehicleId": "abc123",
      "vehicleNumber": "01",
      "totalDetectors": 96,
      "currentStatus": 0,
      "createdTime": "2024-01-01T00:00:00.000Z",
      "updatedTime": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /api/subway/vehicles?vehicleNumber={number}

根据车辆编号获取特定车辆信息

**参数:**

- `vehicleNumber` (string): 车辆编号

### POST /api/subway/vehicles/init

初始化车辆数据

**响应示例:**

```json
{
  "success": true,
  "message": "车辆初始化成功",
  "data": [
    {
      "vehicleId": "abc123",
      "vehicleNumber": "01"
    }
  ]
}
```

## 错误响应格式

所有API错误都遵循统一的响应格式：

```json
{
  "success": false,
  "message": "错误描述",
  "data": {
    "errorDetails": [
      {
        "field": "fieldName",
        "message": "具体错误信息",
        "code": "VALIDATION_ERROR"
      }
    ]
  }
}
```

## 安全性

### 速率限制

- 默认API限制：15分钟内100次请求
- 认证端点限制：15分钟内5次请求
- 严格API限制：1分钟内10次请求

### 安全头

所有响应都包含以下安全头：

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### API密钥（可选）

如果配置了`API_KEY`环境变量，需要在请求头中包含：

```
X-API-Key: your-api-key
