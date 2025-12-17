/**
 * 控制器自动加载
 * 此文件由 scripts/generate-controllers.ts 自动生成
 * 请勿手动编辑 - 所有更改将在下次生成时被覆盖
 *
 * 生成时间: 2025-12-17T07:53:56.182Z
 * 控制器数量: 5
 */

// Auth Module
import './modules/auth/controllers/auth.controller';

// Monitoring Module
import './modules/monitoring/healthCheck/healthCheck.controller';
import './modules/monitoring/swagger/swagger.controller';

// Roles Module
import './modules/roles/controllers/role.controller';

// Users Module
import './modules/users/controllers/user.controller';

/**
 * 添加新的控制器时，只需创建符合命名规范的文件：
 * - 文件路径: src/modules/<module-name>/controllers/<name>.controller.ts
 * - 运行 npm run generate:controllers 重新生成此文件
 * - 或运行 npm run dev/build（会自动执行生成）
 */
