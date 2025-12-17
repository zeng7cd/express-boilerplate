/**
 * 控制器自动生成脚本
 * 自动扫描 src/modules 目录，发现所有控制器文件并生成导入语句
 */
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative, sep } from 'path';

import chalk from 'chalk';

/**
 * 控制器文件信息
 */
interface ControllerFile {
  absolutePath: string;
  relativePath: string;
  moduleName: string;
  controllerName: string;
}

/**
 * 生成器配置
 */
interface GeneratorConfig {
  sourceDir: string;
  outputFile: string;
  pattern: RegExp;
  excludePatterns: RegExp[];
  sortImports: boolean;
  groupByModule: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: GeneratorConfig = {
  sourceDir: 'src/modules',
  outputFile: 'src/controllers.ts',
  pattern: /\.controller\.ts$/,
  excludePatterns: [/\.test\.ts$/, /\.spec\.ts$/, /\.d\.ts$/],
  sortImports: true,
  groupByModule: true,
};

/**
 * 控制器生成器类
 */
class ControllerGenerator {
  private config: GeneratorConfig;

  constructor(config: Partial<GeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 递归查找所有匹配的文件
   */
  private findFiles(dir: string, pattern: RegExp, exclude: RegExp[]): string[] {
    const results: string[] = [];

    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // 递归遍历子目录
          results.push(...this.findFiles(fullPath, pattern, exclude));
        } else if (stat.isFile()) {
          // 检查文件是否匹配模式
          if (pattern.test(entry) && !exclude.some((ex) => ex.test(entry))) {
            results.push(fullPath);
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.error(chalk.red(`❌ Directory not found: ${dir}`));
      } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        console.error(chalk.red(`❌ Permission denied: ${dir}`));
      } else {
        console.error(chalk.red(`❌ Error reading directory ${dir}: ${(error as Error).message}`));
      }
      throw error;
    }

    return results;
  }

  /**
   * 将绝对路径转换为相对导入路径
   */
  private toRelativeImport(from: string, to: string): string {
    let relativePath = relative(from, to);

    // 转换为 Unix 风格的路径分隔符
    relativePath = relativePath.split(sep).join('/');

    // 移除 .ts 扩展名
    relativePath = relativePath.replace(/\.ts$/, '');

    // 确保以 ./ 开头
    if (!relativePath.startsWith('.')) {
      relativePath = `./${relativePath}`;
    }

    return relativePath;
  }

  /**
   * 从路径中提取模块名
   */
  private extractModuleName(path: string): string {
    const parts = path.split(sep);
    const modulesIndex = parts.indexOf('modules');

    if (modulesIndex !== -1 && modulesIndex + 1 < parts.length) {
      return parts[modulesIndex + 1];
    }

    return 'unknown';
  }

  /**
   * 从路径中提取控制器名
   */
  private extractControllerName(path: string): string {
    const parts = path.split(sep);
    const filename = parts[parts.length - 1];
    return filename.replace(/\.ts$/, '');
  }

  /**
   * 发现所有控制器文件
   */
  discoverControllers(): ControllerFile[] {
    const { sourceDir, outputFile, pattern, excludePatterns } = this.config;

    // 查找所有匹配的文件
    const files = this.findFiles(sourceDir, pattern, excludePatterns);

    // 转换为控制器文件信息
    const controllers: ControllerFile[] = files.map((absolutePath) => {
      const outputDir = join(outputFile, '..');
      const relativePath = this.toRelativeImport(outputDir, absolutePath);
      const moduleName = this.extractModuleName(absolutePath);
      const controllerName = this.extractControllerName(absolutePath);

      return {
        absolutePath,
        relativePath,
        moduleName,
        controllerName,
      };
    });

    return controllers;
  }

  /**
   * 对控制器进行排序
   */
  private sortControllers(controllers: ControllerFile[]): ControllerFile[] {
    return [...controllers].sort((a, b) => {
      // 首先按模块名排序
      const moduleCompare = a.moduleName.localeCompare(b.moduleName);
      if (moduleCompare !== 0) return moduleCompare;

      // 然后按控制器名排序
      return a.controllerName.localeCompare(b.controllerName);
    });
  }

  /**
   * 按模块分组控制器
   */
  private groupControllersByModule(controllers: ControllerFile[]): Map<string, ControllerFile[]> {
    const groups = new Map<string, ControllerFile[]>();

    for (const controller of controllers) {
      const existing = groups.get(controller.moduleName) || [];
      existing.push(controller);
      groups.set(controller.moduleName, existing);
    }

    return groups;
  }

  /**
   * 生成导入语句
   */
  generateImports(controllers: ControllerFile[]): string {
    const { sortImports, groupByModule } = this.config;

    // 排序控制器
    const sortedControllers = sortImports ? this.sortControllers(controllers) : controllers;

    let imports = '';

    if (groupByModule) {
      // 按模块分组
      const groups = this.groupControllersByModule(sortedControllers);
      const sortedModules = Array.from(groups.keys()).sort();

      for (const moduleName of sortedModules) {
        const moduleControllers = groups.get(moduleName);
        if (!moduleControllers) continue;

        // 添加模块注释
        const moduleTitle = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
        imports += `\n// ${moduleTitle} Module\n`;

        // 添加导入语句
        for (const controller of moduleControllers) {
          imports += `import '${controller.relativePath}';\n`;
        }
      }
    } else {
      // 不分组，直接列出
      for (const controller of sortedControllers) {
        imports += `import '${controller.relativePath}';\n`;
      }
    }

    return imports;
  }

  /**
   * 生成文件内容
   */
  private generateFileContent(controllers: ControllerFile[]): string {
    const timestamp = new Date().toISOString();
    const count = controllers.length;
    const imports = this.generateImports(controllers);

    return `/**
 * 控制器自动加载
 * 此文件由 scripts/generate-controllers.ts 自动生成
 * 请勿手动编辑 - 所有更改将在下次生成时被覆盖
 *
 * 生成时间: ${timestamp}
 * 控制器数量: ${count}
 */
${imports}
/**
 * 添加新的控制器时，只需创建符合命名规范的文件：
 * - 文件路径: src/modules/<module-name>/controllers/<name>.controller.ts
 * - 运行 npm run generate:controllers 重新生成此文件
 * - 或运行 npm run dev/build（会自动执行生成）
 */
`;
  }

  /**
   * 写入控制器文件
   */
  writeControllersFile(content: string): void {
    const { outputFile } = this.config;

    try {
      writeFileSync(outputFile, content, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        console.error(chalk.red(`❌ Permission denied: ${outputFile}`));
      } else {
        console.error(chalk.red(`❌ Failed to write file ${outputFile}: ${(error as Error).message}`));
      }
      throw error;
    }
  }

  /**
   * 执行生成
   */
  execute(): void {
    try {
      // 发现控制器
      const controllers = this.discoverControllers();

      if (controllers.length === 0) {
        console.warn(chalk.yellow('⚠️  No controller files found'));
        console.log(chalk.cyan('Expected pattern: src/modules/**/controllers/*.controller.ts\n'));
        // 仍然生成文件，但导入为空
      }

      // 生成文件内容
      const content = this.generateFileContent(controllers);

      // 写入文件
      this.writeControllersFile(content);
    } catch (_error) {
      console.error(chalk.red('\n❌ Failed to generate controllers file\n'));
      process.exit(1);
    }
  }
}

// 执行生成
const generator = new ControllerGenerator();
generator.execute();
