# Express TypeScript Boilerplate

An Express backend boilerplate built with TypeScript, Drizzle ORM, and PostgreSQL.

## ✨ Features

- **TypeScript:** Write type-safe code and catch errors early.
- **Express:** A fast, unopinionated, minimalist web framework for Node.js.
- **Drizzle ORM:** A modern TypeScript ORM for PostgreSQL.
- **Zod:** A TypeScript-first schema declaration and validation library.
- **Pino:** A fast, low-overhead logger.
- **Redis:** An in-memory data structure store, used as a database, cache, and message broker.
- **Helmet:** Helps secure Express apps by setting various HTTP headers.
- **Vitest:** A blazing fast unit-test framework powered by Vite.
- **Biome:** A fast formatter and linter for your web project.
- **Docker:** Containerize your application for easy deployment.

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v20 or higher)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/express-typescript-boilerplate.git
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.development.example .env.development
   ```

4. Start the development server:

   ```bash
   pnpm start:dev
   ```

## 📂 Directory Structure

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

## 📄 License

This project is licensed under the MIT License.
