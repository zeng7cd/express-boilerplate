# Express TypeScript Boilerplate

一个使用 TypeScript、Drizzle ORM 和 PostgreSQL 构建的 Express 后端样板。

## ✨ 功能特性

* **TypeScript:** 编写类型安全的代码，尽早发现错误。
* **Express:** 一个快速、无主见、极简的 Node.js Web 框架。
* **Drizzle ORM:** 一个现代化的 TypeScript ORM，适用于 PostgreSQL。
* **Zod:** 一个 TypeScript 优先的模式声明和验证库。
* **Pino:** 一个快速、低开销的日志记录器。
* **Redis:** 一个内存数据结构存储，可用作数据库、缓存和消息代理。
* **Helmet:** 通过设置各种 HTTP 标头来帮助保护 Express 应用程序。
* **Vitest:** 一个由 Vite 驱动的极速单元测试框架。
* **Biome:** 一个适用于您的 Web 项目的快速格式化程序和 Linter。
* **Docker:** 将您的应用程序容器化，以便轻松部署。

## 🚀 快速入门

### 环境要求

* [Node.js](https://nodejs.org/en/) (v20 或更高版本)
* [pnpm](https://pnpm.io/)
* [Docker](https://www.docker.com/)

### 安装

1. 克隆仓库：

    ```bash
    git clone https://github.com/your-username/express-typescript-boilerplate.git
    ```

2. 安装依赖：

    ```bash
    pnpm install
    ```

3. 设置环境变量：

    ```bash
    cp .env.development.example .env.development
    ```

4. 启动开发服务器：

    ```bash
    pnpm start:dev
    ```

## 📂 目录结构

```
.
├── deploy
├── docs
├── src
│   ├── api
│   ├── cache
│   ├── common
│   ├── config
│   ├── database
│   ├── middleware
│   ├── utils
│   ├── index.ts
│   └── server.ts
├── test
├── .env.development
├── .env.production
├── package.json
└── tsconfig.json
```

## 📄 许可证

该项目根据 MIT 许可证授权。
