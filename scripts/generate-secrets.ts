/**
 * 生成安全的密钥脚本
 * 用于生成 JWT_SECRET 和 JWT_REFRESH_SECRET
 */
import { randomBytes } from 'crypto';
import { writeFileSync, existsSync } from 'fs';
import chalk from 'chalk';

/**
 * 生成安全的随机密钥
 */
function generateSecureKey(length: number = 64): string {
  return randomBytes(length).toString('base64').slice(0, length);
}

/**
 * 生成 .env 文件的安全配置
 */
function generateSecureEnvConfig(): string {
  const jwtSecret = generateSecureKey(64);
  const jwtRefreshSecret = generateSecureKey(64);

  return `
# 🔐 安全配置 - 自动生成于 ${new Date().toISOString()}
# ⚠️  请妥善保管这些密钥，不要提交到版本控制系统

# JWT 配置
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# 其他配置请参考 .env.example
`.trim();
}

// 执行生成
const config = generateSecureEnvConfig();
const filename = '.env.production.local';

// 检查文件是否已存在
if (existsSync(filename)) {
  console.log(chalk.yellow(`\n⚠️  File ${filename} already exists!`));
  console.log(chalk.yellow('Do you want to overwrite it? (This will replace your existing secrets)'));
  console.log(chalk.cyan('\nIf you want to proceed, please delete the file manually and run this script again.\n'));
  process.exit(0);
}

writeFileSync(filename, config);

console.log(chalk.green('\n✅ Secure configuration generated successfully!\n'));
console.log(chalk.yellow(`📄 File: ${filename}\n`));
console.log(chalk.cyan('Next steps:'));
console.log(chalk.cyan('1. Review the generated file'));
console.log(chalk.cyan('2. Add other required environment variables from .env.example'));
console.log(chalk.cyan('3. Never commit this file to version control'));
console.log(chalk.cyan('4. Make sure .env.production.local is in your .gitignore\n'));

console.log(chalk.magenta('Generated secrets:'));
console.log(chalk.gray('JWT_SECRET: ********** (64 characters)'));
console.log(chalk.gray('JWT_REFRESH_SECRET: ********** (64 characters)\n'));
