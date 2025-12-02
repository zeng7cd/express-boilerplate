# Base stage with pnpm setup
FROM node:23.11.1-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Production dependencies stage
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
# Install only production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile --ignore-scripts

# Build stage - install all dependencies and build
FROM base AS build
COPY package.json pnpm-lock.yaml ./
# Install all dependencies (including dev dependencies)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm run build

# Final stage - combine production dependencies and build output
FROM node:23.11.1-alpine AS runner
WORKDIR /app

# 添加安全用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 安装健康检查工具和安全更新
RUN apk add --no-cache wget && \
    apk upgrade --no-cache

# 复制文件并设置权限
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nextjs:nodejs /app/dist ./dist
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json

# 设置安全的文件权限
RUN chmod -R 755 /app && \
    chmod -R 644 /app/dist && \
    chmod 755 /app/dist/index.js

# 使用非 root 用户
USER nextjs

# 暴露端口
EXPOSE 8080

# 健康检查优化
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health-check || exit 1

# 启动应用
CMD ["node", "dist/index.js"]
