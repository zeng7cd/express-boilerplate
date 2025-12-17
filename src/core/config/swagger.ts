import { generateOpenApiSpec } from '@/core/router/openapi-generator';

/**
 * Swagger API 文档配置
 * 从装饰器元数据自动生成
 */
export const swaggerSpec = generateOpenApiSpec();
