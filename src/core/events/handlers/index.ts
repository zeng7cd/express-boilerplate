/**
 * 事件处理器统一导出和初始化
 */
import { initUserEventHandlers } from './user-events.handler';

/**
 * 初始化所有事件处理器
 */
export function initEventHandlers(): void {
  initUserEventHandlers();
  // 可以添加更多事件处理器
  // initAuthEventHandlers();
  // initSystemEventHandlers();
}
