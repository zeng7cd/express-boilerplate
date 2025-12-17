# 使用更小的基础镜像
FROM node:23.11.1-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Production dependencies stage
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./

# 使用缓存挂载优化依赖安装
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile --ignore-scripts

# Build stage - install all dependencies and build
FROM base AS build
COPY package.json pnpm-lock.yaml ./

# 安装所有依赖（包括开发依赖）
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build && \
    # 清理不需要的文件
    rm -rf src test docs examples scripts .vscode .github

# Final stage - 最小化的运行时镜像
FROM node:23.11.1-alpine AS runner
WORKDIR /app

# 添加安全用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# 只安装运行时必需的工具
RUN apk add --no-cache \
    wget \
    dumb-init && \
    apk upgrade --no-cache && \
    # 清理 apk 缓存
    rm -rf /var/cache/apk/*

# 设置环境变量
ENV NODE_ENV=production

# 复制生产依赖
COPY --from=prod-deps --chown=appuser:nodejs /app/node_modules ./node_modules

# 复制构建产物
COPY --from=build --chown=appuser:nodejs /app/dist ./dist
COPY --from=build --chown=appuser:nodejs /app/package.json ./package.json

# 设置安全的文件权限
RUN chmod -R 755 /app && \
    chmod -R 644 /app/dist && \
    chmod 755 /app/dist/index.js

# 使用非 root 用户
USER appuser

# 暴露端口
EXPOSE 8080

# 健康检查优化
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health-check || exit 1

# 使用 dumb-init 作为 PID 1，正确处理信号
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "dist/index.js"]
