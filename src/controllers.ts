/**
 * 控制器自动加载
 * 导入所有使用装饰器的控制器，使其自动注册到路由系统
 *
 * 注意：必须导入控制器类才能触发装饰器的执行
 */

// 业务模块控制器
import './modules/auth/controllers/auth.controller';

// 监控模块控制器
import './modules/monitoring/healthCheck/healthCheck.controller';
import './modules/monitoring/swagger/swagger.controller';

/**
 * 添加新的控制器时，只需在此文件中导入即可
 * 装饰器会自动将控制器注册到路由系统
 */
