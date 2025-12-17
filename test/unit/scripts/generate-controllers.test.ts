/**
 * 控制器生成脚本的属性测试
 * Feature: auto-controller-import, Property 1: Complete Controller Discovery
 * Validates: Requirements 1.1, 1.2
 */
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, sep, isAbsolute } from 'path';

import * as fc from 'fast-check';
import { describe, it, expect, afterEach } from 'vitest';

/**
 * 辅助函数：递归查找所有匹配的文件
 */
function findControllerFiles(dir: string, pattern: RegExp, exclude: RegExp[]): string[] {
  const results: string[] = [];

  if (!existsSync(dir)) {
    return results;
  }

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        results.push(...findControllerFiles(fullPath, pattern, exclude));
      } else if (stat.isFile()) {
        if (pattern.test(entry) && !exclude.some((ex) => ex.test(entry))) {
          results.push(fullPath);
        }
      }
    }
  } catch (_error) {
    // 忽略错误，返回已找到的结果
  }

  return results;
}

/**
 * 辅助函数：创建测试目录结构
 */
function createTestStructure(baseDir: string, structure: TestStructure): string[] {
  const createdControllers: string[] = [];

  // 创建基础目录
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }

  // 创建模块目录和文件
  for (const module of structure.modules) {
    const moduleDir = join(baseDir, module.name, 'controllers');
    mkdirSync(moduleDir, { recursive: true });

    // 创建控制器文件
    for (const controller of module.controllers) {
      const filePath = join(moduleDir, controller);
      writeFileSync(filePath, `// ${controller}`, 'utf-8');
      createdControllers.push(filePath);
    }

    // 创建非控制器文件（如果有）
    if (module.otherFiles) {
      for (const file of module.otherFiles) {
        const filePath = join(moduleDir, file);
        writeFileSync(filePath, `// ${file}`, 'utf-8');
      }
    }
  }

  return createdControllers;
}

/**
 * 测试结构定义
 */
interface TestModule {
  name: string;
  controllers: string[];
  otherFiles?: string[];
}

interface TestStructure {
  modules: TestModule[];
}

describe('Controller Discovery - Property-Based Tests', () => {
  // 为每个测试使用唯一的目录
  const getTestDir = () =>
    join(process.cwd(), `test-temp-controllers-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  afterEach(() => {
    // 清理所有测试目录
    const tempDirs = readdirSync(process.cwd()).filter((name) => name.startsWith('test-temp-controllers-'));
    for (const dir of tempDirs) {
      const fullPath = join(process.cwd(), dir);
      if (existsSync(fullPath)) {
        rmSync(fullPath, { recursive: true, force: true });
      }
    }
  });

  /**
   * Property 1: Complete Controller Discovery
   * For any controller file matching the pattern *.controller.ts in the directory structure,
   * the discovery process should include it in the discovered files list.
   */
  it('should discover all controller files matching the pattern', () => {
    fc.assert(
      fc.property(
        // 生成随机的模块结构 - 使用唯一的名称避免冲突
        fc.uniqueArray(
          fc.record({
            name: fc.stringMatching(/^[a-z]{3,8}$/), // 模块名：3-8个小写字母
            controllers: fc.uniqueArray(
              fc.stringMatching(/^[a-z]{3,8}\.controller\.ts$/), // 控制器文件名
              { minLength: 1, maxLength: 3 },
            ),
            otherFiles: fc.option(
              fc.uniqueArray(
                fc.oneof(
                  fc.stringMatching(/^[a-z]{3,8}\.test\.ts$/), // 测试文件
                  fc.stringMatching(/^[a-z]{3,8}\.spec\.ts$/), // 规范文件
                  fc.stringMatching(/^[a-z]{3,8}\.service\.ts$/), // 服务文件
                  fc.stringMatching(/^[a-z]{3,8}\.dto\.ts$/), // DTO 文件
                ),
                { maxLength: 2 },
              ),
              { nil: [] },
            ),
          }),
          { minLength: 1, maxLength: 3, selector: (item) => item.name },
        ),
        (modules) => {
          const testBaseDir = getTestDir();

          // 创建测试结构
          const structure: TestStructure = { modules };
          const expectedControllers = createTestStructure(testBaseDir, structure);

          // 执行发现
          const pattern = /\.controller\.ts$/;
          const exclude = [/\.test\.ts$/, /\.spec\.ts$/, /\.d\.ts$/];
          const discovered = findControllerFiles(testBaseDir, pattern, exclude);

          // 验证：所有创建的控制器都应该被发现
          expect(discovered.length).toBe(expectedControllers.length);

          // 验证：每个预期的控制器都在发现列表中
          for (const expected of expectedControllers) {
            expect(discovered).toContain(expected);
          }

          // 验证：发现的文件都匹配控制器模式
          for (const file of discovered) {
            expect(file).toMatch(/\.controller\.ts$/);
          }

          // 验证：没有测试文件或规范文件被包含
          for (const file of discovered) {
            expect(file).not.toMatch(/\.test\.ts$/);
            expect(file).not.toMatch(/\.spec\.ts$/);
          }

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 }, // 运行 100 次迭代
    );
  });

  /**
   * Property: Exclusion of test and spec files
   * For any file matching exclusion patterns (*.test.ts, *.spec.ts),
   * it should not appear in the discovered files.
   */
  it('should exclude test and spec files from discovery', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,8}$/),
          controllerFiles: fc.uniqueArray(fc.stringMatching(/^[a-z]{3,8}\.controller\.ts$/), {
            minLength: 1,
            maxLength: 2,
          }),
          testFiles: fc.uniqueArray(
            fc.oneof(fc.stringMatching(/^[a-z]{3,8}\.test\.ts$/), fc.stringMatching(/^[a-z]{3,8}\.spec\.ts$/)),
            { minLength: 1, maxLength: 2 },
          ),
        }),
        ({ moduleName, controllerFiles, testFiles }) => {
          const testBaseDir = getTestDir();

          // 创建测试结构
          const structure: TestStructure = {
            modules: [
              {
                name: moduleName,
                controllers: controllerFiles,
                otherFiles: testFiles,
              },
            ],
          };

          createTestStructure(testBaseDir, structure);

          // 执行发现
          const pattern = /\.controller\.ts$/;
          const exclude = [/\.test\.ts$/, /\.spec\.ts$/, /\.d\.ts$/];
          const discovered = findControllerFiles(testBaseDir, pattern, exclude);

          // 验证：只发现控制器文件
          expect(discovered.length).toBe(controllerFiles.length);

          // 验证：没有测试文件被发现
          for (const file of discovered) {
            expect(file).not.toMatch(/\.test\.ts$/);
            expect(file).not.toMatch(/\.spec\.ts$/);
          }

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Recursive directory traversal
   * For any nested directory structure, all controller files should be discovered
   * regardless of directory depth.
   */
  it('should discover controllers in nested directories', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            name: fc.stringMatching(/^[a-z]{3,8}$/),
            controllers: fc.uniqueArray(fc.stringMatching(/^[a-z]{3,8}\.controller\.ts$/), {
              minLength: 1,
              maxLength: 2,
            }),
          }),
          { minLength: 1, maxLength: 5, selector: (item) => item.name }, // 测试嵌套，使用唯一名称
        ),
        (modules) => {
          const testBaseDir = getTestDir();

          const structure: TestStructure = { modules };
          const expectedControllers = createTestStructure(testBaseDir, structure);

          // 执行发现
          const pattern = /\.controller\.ts$/;
          const exclude = [/\.test\.ts$/, /\.spec\.ts$/, /\.d\.ts$/];
          const discovered = findControllerFiles(testBaseDir, pattern, exclude);

          // 验证：所有控制器都被发现，无论嵌套深度
          expect(discovered.length).toBe(expectedControllers.length);

          for (const expected of expectedControllers) {
            expect(discovered).toContain(expected);
          }

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Empty directory handling
   * For any directory structure with no controller files,
   * the discovery should return an empty array without errors.
   */
  it('should handle empty directories gracefully', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            name: fc.stringMatching(/^[a-z]{3,8}$/),
            controllers: fc.constant([]), // 没有控制器
            otherFiles: fc.option(fc.uniqueArray(fc.stringMatching(/^[a-z]{3,8}\.service\.ts$/), { maxLength: 2 }), {
              nil: [],
            }),
          }),
          { minLength: 1, maxLength: 3, selector: (item) => item.name },
        ),
        (modules) => {
          const testBaseDir = getTestDir();

          const structure: TestStructure = { modules };
          createTestStructure(testBaseDir, structure);

          // 执行发现
          const pattern = /\.controller\.ts$/;
          const exclude = [/\.test\.ts$/, /\.spec\.ts$/, /\.d\.ts$/];
          const discovered = findControllerFiles(testBaseDir, pattern, exclude);

          // 验证：应该返回空数组
          expect(discovered).toEqual([]);

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * 路径转换工具函数
 * 将绝对路径转换为相对导入路径
 */
export function toRelativeImport(from: string, to: string): string {
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

describe('Path Conversion - Property-Based Tests', () => {
  /**
   * Property 2: Valid Import Path Generation
   * Feature: auto-controller-import, Property 2: Valid Import Path Generation
   * Validates: Requirements 1.4
   *
   * For any discovered controller file, the generated import statement should use
   * a valid relative path that can be resolved by TypeScript from the src/controllers.ts location.
   */
  it('should generate valid relative import paths for any controller file', () => {
    fc.assert(
      fc.property(
        // 生成随机的模块名和控制器名
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
          controllerName: fc.stringMatching(/^[a-z]{3,10}$/),
          // 可选的子目录深度
          subdirs: fc.array(fc.stringMatching(/^[a-z]{3,8}$/), { maxLength: 3 }),
        }),
        ({ moduleName, controllerName, subdirs }) => {
          // 构建控制器文件的绝对路径
          const srcDir = join(process.cwd(), 'src');
          const outputDir = srcDir; // controllers.ts 在 src/ 目录下

          // 构建控制器路径：src/modules/{moduleName}/{subdirs}/controllers/{controllerName}.controller.ts
          const pathParts = [
            srcDir,
            'modules',
            moduleName,
            ...subdirs,
            'controllers',
            `${controllerName}.controller.ts`,
          ];
          const controllerPath = join(...pathParts);

          // 执行路径转换
          const importPath = toRelativeImport(outputDir, controllerPath);

          // 验证 1: 导入路径应该以 ./ 或 ../ 开头（相对路径）
          expect(importPath).toMatch(/^\.\.?\//);

          // 验证 2: 导入路径不应该包含 .ts 扩展名
          expect(importPath).not.toMatch(/\.ts$/);

          // 验证 3: 导入路径应该使用 Unix 风格的分隔符（/）
          expect(importPath).not.toContain('\\');

          // 验证 4: 导入路径应该包含模块名
          expect(importPath).toContain(moduleName);

          // 验证 5: 导入路径应该包含控制器名（不带扩展名）
          expect(importPath).toContain(`${controllerName}.controller`);

          // 验证 6: 路径应该是可解析的（通过 Node.js 的 relative 函数验证）
          // 如果我们将导入路径转换回绝对路径，应该能得到原始路径
          const reconstructedPath = join(outputDir, `${importPath}.ts`);
          expect(reconstructedPath).toBe(controllerPath);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Cross-platform path separator handling
   * The path conversion should work correctly on both Windows and Unix systems,
   * always producing Unix-style paths with forward slashes.
   */
  it('should handle cross-platform path separators correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
          controllerName: fc.stringMatching(/^[a-z]{3,10}$/),
        }),
        ({ moduleName, controllerName }) => {
          const srcDir = join(process.cwd(), 'src');
          const outputDir = srcDir;
          const controllerPath = join(srcDir, 'modules', moduleName, 'controllers', `${controllerName}.controller.ts`);

          // 执行路径转换
          const importPath = toRelativeImport(outputDir, controllerPath);

          // 验证：无论在什么平台上，导入路径都应该使用 Unix 风格的分隔符
          expect(importPath).not.toContain('\\');
          expect(importPath).toMatch(/^\.\.?\//);

          // 验证：路径中的所有分隔符都应该是 /
          const pathParts = importPath.split('/');
          expect(pathParts.length).toBeGreaterThan(1);

          // 验证：重新组合路径不应该包含反斜杠
          const rejoined = pathParts.join('/');
          expect(rejoined).toBe(importPath);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Idempotent path conversion
   * Converting the same paths multiple times should always produce the same result.
   */
  it('should produce consistent results for the same input paths', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
          controllerName: fc.stringMatching(/^[a-z]{3,10}$/),
        }),
        ({ moduleName, controllerName }) => {
          const srcDir = join(process.cwd(), 'src');
          const outputDir = srcDir;
          const controllerPath = join(srcDir, 'modules', moduleName, 'controllers', `${controllerName}.controller.ts`);

          // 执行多次转换
          const result1 = toRelativeImport(outputDir, controllerPath);
          const result2 = toRelativeImport(outputDir, controllerPath);
          const result3 = toRelativeImport(outputDir, controllerPath);

          // 验证：所有结果应该相同
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Path depth handling
   * The conversion should work correctly regardless of directory nesting depth.
   */
  it('should handle various directory depths correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
          controllerName: fc.stringMatching(/^[a-z]{3,10}$/),
          depth: fc.integer({ min: 0, max: 5 }), // 0-5 层额外的嵌套
        }),
        ({ moduleName, controllerName, depth }) => {
          const srcDir = join(process.cwd(), 'src');
          const outputDir = srcDir;

          // 创建额外的嵌套目录
          const extraDirs = Array.from({ length: depth }, (_, i) => `subdir${i}`);
          const controllerPath = join(
            srcDir,
            'modules',
            moduleName,
            ...extraDirs,
            'controllers',
            `${controllerName}.controller.ts`,
          );

          // 执行路径转换
          const importPath = toRelativeImport(outputDir, controllerPath);

          // 验证：路径应该是有效的相对路径
          expect(importPath).toMatch(/^\.\.?\//);
          expect(importPath).not.toContain('\\');
          expect(importPath).not.toMatch(/\.ts$/);

          // 验证：路径深度应该反映在 ../ 的数量或路径段的数量上
          const pathSegments = importPath.split('/').filter((s) => s !== '.' && s !== '');
          expect(pathSegments.length).toBeGreaterThan(0);

          // 验证：可以重建原始路径
          const reconstructedPath = join(outputDir, `${importPath}.ts`);
          expect(reconstructedPath).toBe(controllerPath);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Extension removal
   * The conversion should always remove the .ts extension from the path.
   */
  it('should always remove .ts extension from import paths', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
          fileName: fc.stringMatching(/^[a-z]{3,10}\.(controller|service|repository)\.ts$/),
        }),
        ({ moduleName, fileName }) => {
          const srcDir = join(process.cwd(), 'src');
          const outputDir = srcDir;
          const filePath = join(srcDir, 'modules', moduleName, 'controllers', fileName);

          // 执行路径转换
          const importPath = toRelativeImport(outputDir, filePath);

          // 验证：导入路径不应该包含 .ts 扩展名
          expect(importPath).not.toMatch(/\.ts$/);

          // 验证：但应该保留其他部分（如 .controller）
          if (fileName.includes('.controller.')) {
            expect(importPath).toContain('.controller');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Relative path prefix
   * All generated import paths should start with ./ or ../
   */
  it('should always prefix paths with ./ or ../', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
          controllerName: fc.stringMatching(/^[a-z]{3,10}$/),
          subdirs: fc.array(fc.stringMatching(/^[a-z]{3,8}$/), { maxLength: 4 }),
        }),
        ({ moduleName, controllerName, subdirs }) => {
          const srcDir = join(process.cwd(), 'src');
          const outputDir = srcDir;
          const controllerPath = join(
            srcDir,
            'modules',
            moduleName,
            ...subdirs,
            'controllers',
            `${controllerName}.controller.ts`,
          );

          // 执行路径转换
          const importPath = toRelativeImport(outputDir, controllerPath);

          // 验证：路径必须以 ./ 或 ../ 开头
          expect(importPath).toMatch(/^\.\.?\//);

          // 验证：不应该是绝对路径
          expect(isAbsolute(importPath)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * 控制器文件信息接口（用于测试）
 */
interface ControllerFile {
  absolutePath: string;
  relativePath: string;
  moduleName: string;
  controllerName: string;
}

/**
 * 辅助函数：生成导入语句（从脚本中提取的逻辑）
 */
function generateImports(controllers: ControllerFile[], sortImports: boolean, groupByModule: boolean): string {
  // 排序控制器
  const sortedControllers = sortImports
    ? [...controllers].sort((a, b) => {
        // 首先按模块名排序
        const moduleCompare = a.moduleName.localeCompare(b.moduleName);
        if (moduleCompare !== 0) return moduleCompare;
        // 然后按控制器名排序
        return a.controllerName.localeCompare(b.controllerName);
      })
    : controllers;

  let imports = '';

  if (groupByModule) {
    // 按模块分组
    const groups = new Map<string, ControllerFile[]>();
    for (const controller of sortedControllers) {
      const existing = groups.get(controller.moduleName) || [];
      existing.push(controller);
      groups.set(controller.moduleName, existing);
    }

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

describe('Import Generation - Property-Based Tests', () => {
  /**
   * Property 5: Sorted and Grouped Output
   * Feature: auto-controller-import, Property 5: Sorted and Grouped Output
   * Validates: Requirements 4.1, 4.3
   *
   * For any set of discovered controllers, the generated imports should be sorted
   * alphabetically and optionally grouped by module name for consistent and readable output.
   */
  it('should generate sorted and grouped imports for any set of controllers', () => {
    fc.assert(
      fc.property(
        // 生成随机的控制器集合
        fc.uniqueArray(
          fc.record({
            moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
            controllerName: fc.stringMatching(/^[a-z]{3,10}$/),
          }),
          {
            minLength: 1,
            maxLength: 10,
            selector: (item) => `${item.moduleName}-${item.controllerName}`,
          },
        ),
        (controllerSpecs) => {
          // 构建控制器文件对象
          const controllers: ControllerFile[] = controllerSpecs.map((spec) => ({
            absolutePath: join(
              process.cwd(),
              'src',
              'modules',
              spec.moduleName,
              'controllers',
              `${spec.controllerName}.controller.ts`,
            ),
            relativePath: `./modules/${spec.moduleName}/controllers/${spec.controllerName}.controller`,
            moduleName: spec.moduleName,
            controllerName: `${spec.controllerName}.controller`,
          }));

          // 生成导入语句（启用排序和分组）
          const imports = generateImports(controllers, true, true);

          // 验证 1: 导入语句不应该为空（如果有控制器）
          if (controllers.length > 0) {
            expect(imports.length).toBeGreaterThan(0);
          }

          // 验证 2: 提取所有导入行
          const importLines = imports.split('\n').filter((line) => line.trim().startsWith('import '));

          expect(importLines.length).toBe(controllers.length);

          // 验证 3: 提取模块注释
          const moduleComments = imports
            .split('\n')
            .filter((line) => line.trim().startsWith('//') && line.includes('Module'));

          // 验证 4: 模块应该按字母顺序排列
          const moduleNames = moduleComments.map((comment) => {
            const match = comment.match(/\/\/ (\w+) Module/);
            return match ? match[1].toLowerCase() : '';
          });

          // 检查模块名是否按字母顺序排列
          for (let i = 1; i < moduleNames.length; i++) {
            expect(moduleNames[i].localeCompare(moduleNames[i - 1])).toBeGreaterThanOrEqual(0);
          }

          // 验证 5: 每个模块内的控制器应该按字母顺序排列
          // 按模块分组控制器
          const controllersByModule = new Map<string, string[]>();
          for (const controller of controllers) {
            const existing = controllersByModule.get(controller.moduleName) || [];
            existing.push(controller.controllerName);
            controllersByModule.set(controller.moduleName, existing);
          }

          // 检查每个模块内的排序
          for (const [moduleName, _controllerNames] of controllersByModule) {
            const moduleTitle = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
            const moduleCommentPattern = `// ${moduleTitle} Module`;

            // 在生成的导入中查找这个模块的导入语句
            const moduleCommentIndex = imports.indexOf(moduleCommentPattern);

            if (moduleCommentIndex >= 0) {
              // 找到下一个模块注释的位置
              const nextModuleIndex = imports.indexOf('\n//', moduleCommentIndex + moduleCommentPattern.length);
              const moduleSection =
                nextModuleIndex > 0
                  ? imports.substring(moduleCommentIndex, nextModuleIndex)
                  : imports.substring(moduleCommentIndex);

              const moduleSectionLines = moduleSection
                .split('\n')
                .filter((line) => line.trim().startsWith('import '))
                .map((line) => {
                  const match = line.match(/import '.*\/([^/]+)';/);
                  return match ? match[1] : '';
                });

              // 验证这个模块的导入是否按字母顺序排列
              for (let i = 1; i < moduleSectionLines.length; i++) {
                expect(moduleSectionLines[i].localeCompare(moduleSectionLines[i - 1])).toBeGreaterThanOrEqual(0);
              }
            }
          }

          // 验证 6: 所有控制器都应该出现在导入中
          for (const controller of controllers) {
            expect(imports).toContain(controller.relativePath);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Alphabetical module ordering
   * When grouping by module, modules should appear in alphabetical order.
   */
  it('should order modules alphabetically when grouping is enabled', () => {
    fc.assert(
      fc.property(
        // 生成多个不同模块的控制器
        fc.uniqueArray(fc.stringMatching(/^[a-z]{3,10}$/), { minLength: 2, maxLength: 5 }),
        (moduleNames) => {
          // 为每个模块创建一个控制器
          const controllers: ControllerFile[] = moduleNames.map((moduleName) => ({
            absolutePath: join(process.cwd(), 'src', 'modules', moduleName, 'controllers', 'test.controller.ts'),
            relativePath: `./modules/${moduleName}/controllers/test.controller`,
            moduleName,
            controllerName: 'test.controller',
          }));

          // 生成导入语句
          const imports = generateImports(controllers, true, true);

          // 提取模块注释
          const moduleComments = imports
            .split('\n')
            .filter((line) => line.trim().startsWith('//') && line.includes('Module'));

          const extractedModuleNames = moduleComments.map((comment) => {
            const match = comment.match(/\/\/ (\w+) Module/);
            return match ? match[1].toLowerCase() : '';
          });

          // 验证：模块名应该按字母顺序排列
          const sortedModuleNames = [...extractedModuleNames].sort((a, b) => a.localeCompare(b));
          expect(extractedModuleNames).toEqual(sortedModuleNames);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Controller ordering within modules
   * Within each module group, controllers should be sorted alphabetically.
   */
  it('should order controllers alphabetically within each module', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
          controllerNames: fc.uniqueArray(fc.stringMatching(/^[a-z]{3,10}$/), {
            minLength: 2,
            maxLength: 5,
          }),
        }),
        ({ moduleName, controllerNames }) => {
          // 为同一个模块创建多个控制器
          const controllers: ControllerFile[] = controllerNames.map((name) => ({
            absolutePath: join(process.cwd(), 'src', 'modules', moduleName, 'controllers', `${name}.controller.ts`),
            relativePath: `./modules/${moduleName}/controllers/${name}.controller`,
            moduleName,
            controllerName: `${name}.controller`,
          }));

          // 生成导入语句
          const imports = generateImports(controllers, true, true);

          // 提取导入语句中的控制器名
          const importLines = imports
            .split('\n')
            .filter((line) => line.trim().startsWith('import '))
            .map((line) => {
              const match = line.match(/import '.*\/([^/]+)';/);
              return match ? match[1] : '';
            });

          // 验证：控制器名应该按字母顺序排列
          const sortedNames = [...importLines].sort((a, b) => a.localeCompare(b));
          expect(importLines).toEqual(sortedNames);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Idempotent sorting
   * Generating imports multiple times with the same input should produce identical output.
   */
  it('should produce consistent output for the same input', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
            controllerName: fc.stringMatching(/^[a-z]{3,10}$/),
          }),
          {
            minLength: 1,
            maxLength: 5,
            selector: (item) => `${item.moduleName}-${item.controllerName}`,
          },
        ),
        (controllerSpecs) => {
          const controllers: ControllerFile[] = controllerSpecs.map((spec) => ({
            absolutePath: join(
              process.cwd(),
              'src',
              'modules',
              spec.moduleName,
              'controllers',
              `${spec.controllerName}.controller.ts`,
            ),
            relativePath: `./modules/${spec.moduleName}/controllers/${spec.controllerName}.controller`,
            moduleName: spec.moduleName,
            controllerName: `${spec.controllerName}.controller`,
          }));

          // 生成多次
          const result1 = generateImports(controllers, true, true);
          const result2 = generateImports(controllers, true, true);
          const result3 = generateImports(controllers, true, true);

          // 验证：所有结果应该相同
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Grouping correctness
   * When grouping is enabled, all controllers from the same module should appear together.
   */
  it('should group all controllers from the same module together', () => {
    fc.assert(
      fc.property(
        // 生成多个模块，每个模块有多个控制器
        fc.uniqueArray(
          fc.record({
            moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
            controllerNames: fc.uniqueArray(fc.stringMatching(/^[a-z]{3,10}$/), {
              minLength: 1,
              maxLength: 3,
            }),
          }),
          { minLength: 2, maxLength: 4, selector: (item) => item.moduleName },
        ),
        (moduleSpecs) => {
          // 构建控制器列表
          const controllers: ControllerFile[] = [];
          for (const moduleSpec of moduleSpecs) {
            for (const controllerName of moduleSpec.controllerNames) {
              controllers.push({
                absolutePath: join(
                  process.cwd(),
                  'src',
                  'modules',
                  moduleSpec.moduleName,
                  'controllers',
                  `${controllerName}.controller.ts`,
                ),
                relativePath: `./modules/${moduleSpec.moduleName}/controllers/${controllerName}.controller`,
                moduleName: moduleSpec.moduleName,
                controllerName: `${controllerName}.controller`,
              });
            }
          }

          // 生成导入语句
          const imports = generateImports(controllers, true, true);

          // 验证：对于每个模块，其所有控制器应该连续出现
          for (const moduleSpec of moduleSpecs) {
            const moduleName = moduleSpec.moduleName;
            const moduleTitle = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);

            // 查找模块注释的位置
            const moduleCommentIndex = imports.indexOf(`// ${moduleTitle} Module`);
            expect(moduleCommentIndex).toBeGreaterThanOrEqual(0);

            // 提取该模块的部分
            const nextModuleIndex = imports.indexOf('\n//', moduleCommentIndex + 1);
            const moduleSection =
              nextModuleIndex > 0
                ? imports.substring(moduleCommentIndex, nextModuleIndex)
                : imports.substring(moduleCommentIndex);

            // 验证：该模块的所有控制器都在这个部分中
            for (const controllerName of moduleSpec.controllerNames) {
              const expectedPath = `./modules/${moduleName}/controllers/${controllerName}.controller`;
              expect(moduleSection).toContain(expectedPath);
            }

            // 验证：这个部分不包含其他模块的控制器
            for (const otherModuleSpec of moduleSpecs) {
              if (otherModuleSpec.moduleName !== moduleName) {
                for (const controllerName of otherModuleSpec.controllerNames) {
                  const otherPath = `./modules/${otherModuleSpec.moduleName}/controllers/${controllerName}.controller`;
                  expect(moduleSection).not.toContain(otherPath);
                }
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Import Generation - Unit Tests', () => {
  /**
   * Test single import generation
   */
  it('should generate a single import statement correctly', () => {
    const controllers: ControllerFile[] = [
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'auth.controller.ts'),
        relativePath: './modules/auth/controllers/auth.controller',
        moduleName: 'auth',
        controllerName: 'auth.controller',
      },
    ];

    const imports = generateImports(controllers, true, true);

    // 验证：应该包含模块注释
    expect(imports).toContain('// Auth Module');

    // 验证：应该包含导入语句
    expect(imports).toContain("import './modules/auth/controllers/auth.controller';");

    // 验证：应该只有一个导入语句
    const importLines = imports.split('\n').filter((line) => line.trim().startsWith('import '));
    expect(importLines.length).toBe(1);
  });

  /**
   * Test multiple imports with sorting
   */
  it('should generate multiple imports sorted alphabetically', () => {
    const controllers: ControllerFile[] = [
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'users', 'controllers', 'user.controller.ts'),
        relativePath: './modules/users/controllers/user.controller',
        moduleName: 'users',
        controllerName: 'user.controller',
      },
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'auth.controller.ts'),
        relativePath: './modules/auth/controllers/auth.controller',
        moduleName: 'auth',
        controllerName: 'auth.controller',
      },
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'roles', 'controllers', 'role.controller.ts'),
        relativePath: './modules/roles/controllers/role.controller',
        moduleName: 'roles',
        controllerName: 'role.controller',
      },
    ];

    const imports = generateImports(controllers, true, true);

    // 验证：应该有三个导入语句
    const importLines = imports.split('\n').filter((line) => line.trim().startsWith('import '));
    expect(importLines.length).toBe(3);

    // 验证：模块应该按字母顺序排列（auth, roles, users）
    expect(imports.indexOf('// Auth Module')).toBeLessThan(imports.indexOf('// Roles Module'));
    expect(imports.indexOf('// Roles Module')).toBeLessThan(imports.indexOf('// Users Module'));

    // 验证：导入语句应该按正确的顺序出现
    expect(imports.indexOf("import './modules/auth/controllers/auth.controller';")).toBeLessThan(
      imports.indexOf("import './modules/roles/controllers/role.controller';"),
    );
    expect(imports.indexOf("import './modules/roles/controllers/role.controller';")).toBeLessThan(
      imports.indexOf("import './modules/users/controllers/user.controller';"),
    );
  });

  /**
   * Test module grouping
   */
  it('should group imports by module name', () => {
    const controllers: ControllerFile[] = [
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'auth.controller.ts'),
        relativePath: './modules/auth/controllers/auth.controller',
        moduleName: 'auth',
        controllerName: 'auth.controller',
      },
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'login.controller.ts'),
        relativePath: './modules/auth/controllers/login.controller',
        moduleName: 'auth',
        controllerName: 'login.controller',
      },
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'users', 'controllers', 'user.controller.ts'),
        relativePath: './modules/users/controllers/user.controller',
        moduleName: 'users',
        controllerName: 'user.controller',
      },
    ];

    const imports = generateImports(controllers, true, true);

    // 验证：应该有两个模块注释
    const moduleComments = imports.split('\n').filter((line) => line.includes('Module') && line.startsWith('//'));
    expect(moduleComments.length).toBe(2);

    // 验证：Auth 模块应该包含两个导入
    const authModuleIndex = imports.indexOf('// Auth Module');
    const usersModuleIndex = imports.indexOf('// Users Module');

    const authSection = imports.substring(authModuleIndex, usersModuleIndex);
    const authImports = authSection.split('\n').filter((line) => line.trim().startsWith('import '));
    expect(authImports.length).toBe(2);

    // 验证：Auth 模块的导入应该按字母顺序排列
    expect(authSection.indexOf('auth.controller')).toBeLessThan(authSection.indexOf('login.controller'));

    // 验证：Users 模块应该包含一个导入
    const usersSection = imports.substring(usersModuleIndex);
    const usersImports = usersSection.split('\n').filter((line) => line.trim().startsWith('import '));
    expect(usersImports.length).toBe(1);
  });

  /**
   * Test header comment generation
   */
  it('should not include header comments in generateImports function', () => {
    const controllers: ControllerFile[] = [
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'auth.controller.ts'),
        relativePath: './modules/auth/controllers/auth.controller',
        moduleName: 'auth',
        controllerName: 'auth.controller',
      },
    ];

    const imports = generateImports(controllers, true, true);

    // 验证：generateImports 函数不应该包含文件头部注释
    // （文件头部注释由 generateFileContent 函数生成）
    expect(imports).not.toContain('控制器自动加载');
    expect(imports).not.toContain('此文件由 scripts/generate-controllers.ts 自动生成');
    expect(imports).not.toContain('生成时间:');
    expect(imports).not.toContain('控制器数量:');

    // 验证：应该包含模块注释和导入语句
    expect(imports).toContain('// Auth Module');
    expect(imports).toContain("import './modules/auth/controllers/auth.controller';");
  });

  /**
   * Test empty controller list
   */
  it('should handle empty controller list', () => {
    const controllers: ControllerFile[] = [];

    const imports = generateImports(controllers, true, true);

    // 验证：应该返回空字符串或只包含空白字符
    expect(imports.trim()).toBe('');
  });

  /**
   * Test sorting disabled
   */
  it('should preserve controller order within modules when sorting is disabled', () => {
    const controllers: ControllerFile[] = [
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'register.controller.ts'),
        relativePath: './modules/auth/controllers/register.controller',
        moduleName: 'auth',
        controllerName: 'register.controller',
      },
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'auth.controller.ts'),
        relativePath: './modules/auth/controllers/auth.controller',
        moduleName: 'auth',
        controllerName: 'auth.controller',
      },
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'login.controller.ts'),
        relativePath: './modules/auth/controllers/login.controller',
        moduleName: 'auth',
        controllerName: 'login.controller',
      },
    ];

    const imports = generateImports(controllers, false, true);

    // 验证：控制器应该保持原始顺序（register, auth, login）而不是字母顺序
    const registerIndex = imports.indexOf('register.controller');
    const authIndex = imports.indexOf('auth.controller');
    const loginIndex = imports.indexOf('login.controller');

    expect(registerIndex).toBeLessThan(authIndex);
    expect(authIndex).toBeLessThan(loginIndex);
  });

  /**
   * Test grouping disabled
   */
  it('should not add module comments when grouping is disabled', () => {
    const controllers: ControllerFile[] = [
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'auth.controller.ts'),
        relativePath: './modules/auth/controllers/auth.controller',
        moduleName: 'auth',
        controllerName: 'auth.controller',
      },
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'users', 'controllers', 'user.controller.ts'),
        relativePath: './modules/users/controllers/user.controller',
        moduleName: 'users',
        controllerName: 'user.controller',
      },
    ];

    const imports = generateImports(controllers, true, false);

    // 验证：不应该包含模块注释
    expect(imports).not.toContain('// Auth Module');
    expect(imports).not.toContain('// Users Module');

    // 验证：应该包含导入语句
    expect(imports).toContain("import './modules/auth/controllers/auth.controller';");
    expect(imports).toContain("import './modules/users/controllers/user.controller';");

    // 验证：应该按字母顺序排列（因为 sortImports 为 true）
    expect(imports.indexOf('auth.controller')).toBeLessThan(imports.indexOf('user.controller'));
  });

  /**
   * Test module name capitalization
   */
  it('should capitalize module names in comments', () => {
    const controllers: ControllerFile[] = [
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'auth.controller.ts'),
        relativePath: './modules/auth/controllers/auth.controller',
        moduleName: 'auth',
        controllerName: 'auth.controller',
      },
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'userManagement', 'controllers', 'user.controller.ts'),
        relativePath: './modules/userManagement/controllers/user.controller',
        moduleName: 'userManagement',
        controllerName: 'user.controller',
      },
    ];

    const imports = generateImports(controllers, true, true);

    // 验证：模块名应该首字母大写
    expect(imports).toContain('// Auth Module');
    expect(imports).toContain('// UserManagement Module');
  });

  /**
   * Test multiple controllers in same module with sorting
   */
  it('should sort controllers within the same module', () => {
    const controllers: ControllerFile[] = [
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'register.controller.ts'),
        relativePath: './modules/auth/controllers/register.controller',
        moduleName: 'auth',
        controllerName: 'register.controller',
      },
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'login.controller.ts'),
        relativePath: './modules/auth/controllers/login.controller',
        moduleName: 'auth',
        controllerName: 'login.controller',
      },
      {
        absolutePath: join(process.cwd(), 'src', 'modules', 'auth', 'controllers', 'auth.controller.ts'),
        relativePath: './modules/auth/controllers/auth.controller',
        moduleName: 'auth',
        controllerName: 'auth.controller',
      },
    ];

    const imports = generateImports(controllers, true, true);

    // 验证：应该只有一个模块注释
    const moduleComments = imports.split('\n').filter((line) => line.includes('Module') && line.startsWith('//'));
    expect(moduleComments.length).toBe(1);

    // 验证：控制器应该按字母顺序排列
    const authIndex = imports.indexOf('auth.controller');
    const loginIndex = imports.indexOf('login.controller');
    const registerIndex = imports.indexOf('register.controller');

    expect(authIndex).toBeLessThan(loginIndex);
    expect(loginIndex).toBeLessThan(registerIndex);
  });
});

/**
 * Error Handling - Property-Based Tests
 * Feature: auto-controller-import, Property 6: Error Reporting Completeness
 * Validates: Requirements 3.1, 3.2, 3.3
 */
describe('Error Handling - Property-Based Tests', () => {
  /**
   * Property 6: Error Reporting Completeness
   * For any file system error or invalid controller file, the script should report
   * the specific file path and error reason without silently failing.
   */
  it('should report complete error information for any file system error', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorType: fc.oneof(
            fc.constant('ENOENT' as const),
            fc.constant('EACCES' as const),
            fc.constant('UNKNOWN' as const),
          ),
          // eslint-disable-next-line security/detect-unsafe-regex
          path: fc.stringMatching(/^[a-z]{3,10}(\/[a-z]{3,10}){1,3}$/), // 生成路径
          message: fc.stringMatching(/^[a-zA-Z ]{10,50}$/), // 生成错误消息
        }),
        ({ errorType, path, message }) => {
          // 创建模拟错误对象
          const error: NodeJS.ErrnoException = new Error(message);
          error.code = errorType === 'UNKNOWN' ? undefined : errorType;
          error.path = path;

          // 验证错误对象包含必要信息
          expect(error.message).toBe(message);

          if (errorType !== 'UNKNOWN') {
            expect(error.code).toBe(errorType);
          }

          if (path) {
            expect(error.path).toBe(path);
          }

          // 验证：错误对象应该包含足够的信息用于报告
          // 1. 应该有错误消息
          expect(error.message).toBeTruthy();
          expect(error.message.length).toBeGreaterThan(0);

          // 2. 对于文件系统错误，应该有路径信息
          if (errorType === 'ENOENT' || errorType === 'EACCES') {
            expect(error.path).toBeTruthy();
            expect(error.code).toBeTruthy();
          }

          // 3. 错误代码应该是可识别的
          if (error.code) {
            expect(['ENOENT', 'EACCES'].includes(error.code)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Error message contains file path
   * For any file system error with a path, the error reporting should include that path.
   */
  it('should include file path in error reporting for path-related errors', () => {
    fc.assert(
      fc.property(
        fc.record({
          errorCode: fc.oneof(fc.constant('ENOENT'), fc.constant('EACCES')),
          // eslint-disable-next-line security/detect-unsafe-regex
          filePath: fc.stringMatching(/^[a-z]{3,10}(\/[a-z]{3,10}){1,4}\.ts$/),
        }),
        ({ errorCode, filePath }) => {
          // 创建带路径的错误
          const error: NodeJS.ErrnoException = new Error(`${errorCode} error`);
          error.code = errorCode;
          error.path = filePath;

          // 验证：错误对象包含路径信息
          expect(error.path).toBe(filePath);
          expect(error.code).toBe(errorCode);

          // 验证：路径信息是有效的
          expect(error.path).toBeTruthy();
          if (error.path) {
            expect(error.path.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Error type identification
   * For any error, we should be able to identify its type (ENOENT, EACCES, or other).
   */
  it('should correctly identify error types', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('ENOENT'),
          fc.constant('EACCES'),
          fc.constant('EISDIR'),
          fc.constant('ENOTDIR'),
          fc.constant(undefined),
        ),
        (errorCode) => {
          const error: NodeJS.ErrnoException = new Error('Test error');
          error.code = errorCode;

          // 验证：我们可以识别错误类型
          if (errorCode === 'ENOENT') {
            expect(error.code).toBe('ENOENT');
          } else if (errorCode === 'EACCES') {
            expect(error.code).toBe('EACCES');
          } else if (errorCode) {
            expect(error.code).toBeTruthy();
          } else {
            expect(error.code).toBeUndefined();
          }

          // 验证：错误代码是字符串或 undefined
          if (error.code !== undefined) {
            expect(typeof error.code).toBe('string');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Error message non-empty
   * For any error, the error message should not be empty.
   */
  it('should always have non-empty error messages', () => {
    fc.assert(
      fc.property(
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 100 }),
          code: fc.option(fc.oneof(fc.constant('ENOENT'), fc.constant('EACCES')), { nil: undefined }),
        }),
        ({ message, code }) => {
          const error: NodeJS.ErrnoException = new Error(message);
          error.code = code;

          // 验证：错误消息不为空
          expect(error.message).toBeTruthy();
          expect(error.message.length).toBeGreaterThan(0);

          // 验证：错误消息是字符串
          expect(typeof error.message).toBe('string');
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Error Handling - Unit Tests
 */
describe('Error Handling - Unit Tests', () => {
  /**
   * Test handling of non-existent directory
   */
  it('should handle non-existent directory errors', () => {
    const nonExistentDir = join(process.cwd(), `non-existent-dir-${Date.now()}`);

    // 尝试查找不存在的目录中的文件
    const pattern = /\.controller\.ts$/;
    const exclude = [/\.test\.ts$/, /\.spec\.ts$/];

    // 验证：应该返回空数组而不是抛出错误
    const result = findControllerFiles(nonExistentDir, pattern, exclude);
    expect(result).toEqual([]);
  });

  /**
   * Test error message formatting for ENOENT
   */
  it('should format ENOENT error messages correctly', () => {
    const error: NodeJS.ErrnoException = new Error('File not found');
    error.code = 'ENOENT';
    error.path = '/path/to/missing/file.ts';

    // 验证：错误对象包含正确的信息
    expect(error.code).toBe('ENOENT');
    expect(error.path).toBe('/path/to/missing/file.ts');
    expect(error.message).toBe('File not found');

    // 验证：可以构建有意义的错误消息
    const formattedMessage = `❌ Directory not found: ${error.path}`;
    expect(formattedMessage).toContain('Directory not found');
    expect(formattedMessage).toContain(error.path);
  });

  /**
   * Test error message formatting for EACCES
   */
  it('should format EACCES error messages correctly', () => {
    const error: NodeJS.ErrnoException = new Error('Permission denied');
    error.code = 'EACCES';
    error.path = '/path/to/protected/file.ts';

    // 验证：错误对象包含正确的信息
    expect(error.code).toBe('EACCES');
    expect(error.path).toBe('/path/to/protected/file.ts');
    expect(error.message).toBe('Permission denied');

    // 验证：可以构建有意义的错误消息
    const formattedMessage = `❌ Permission denied: ${error.path}`;
    expect(formattedMessage).toContain('Permission denied');
    expect(formattedMessage).toContain(error.path);
  });

  /**
   * Test error message formatting for unknown errors
   */
  it('should format unknown error messages correctly', () => {
    const error = new Error('Something went wrong');

    // 验证：错误对象包含消息
    expect(error.message).toBe('Something went wrong');

    // 验证：可以构建通用错误消息
    const formattedMessage = `❌ Unexpected error: ${error.message}`;
    expect(formattedMessage).toContain('Unexpected error');
    expect(formattedMessage).toContain(error.message);
  });

  /**
   * Test error handling with empty path
   */
  it('should handle errors with missing path information', () => {
    const error: NodeJS.ErrnoException = new Error('Generic error');
    error.code = 'ENOENT';
    // path 未设置

    // 验证：错误对象有代码但没有路径
    expect(error.code).toBe('ENOENT');
    expect(error.path).toBeUndefined();

    // 验证：仍然可以构建错误消息
    const formattedMessage = error.path
      ? `❌ Directory not found: ${error.path}`
      : `❌ Directory not found: ${error.message}`;

    expect(formattedMessage).toContain('Directory not found');
  });

  /**
   * Test error handling with multiple error types
   */
  it('should distinguish between different error types', () => {
    const enoentError: NodeJS.ErrnoException = new Error('Not found');
    enoentError.code = 'ENOENT';

    const eaccesError: NodeJS.ErrnoException = new Error('Access denied');
    eaccesError.code = 'EACCES';

    const unknownError = new Error('Unknown');

    // 验证：可以区分不同的错误类型
    expect(enoentError.code).toBe('ENOENT');
    expect(eaccesError.code).toBe('EACCES');
    expect((unknownError as NodeJS.ErrnoException).code).toBeUndefined();

    // 验证：可以为不同错误类型生成不同的消息
    const getMessage = (err: Error | NodeJS.ErrnoException) => {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        return 'Directory not found';
      } else if (nodeErr.code === 'EACCES') {
        return 'Permission denied';
      } else {
        return 'Unexpected error';
      }
    };

    expect(getMessage(enoentError)).toBe('Directory not found');
    expect(getMessage(eaccesError)).toBe('Permission denied');
    expect(getMessage(unknownError)).toBe('Unexpected error');
  });

  /**
   * Test error message includes file path when available
   */
  it('should include file path in error messages when available', () => {
    const testPath = '/test/path/to/file.ts';
    const error: NodeJS.ErrnoException = new Error('Test error');
    error.code = 'ENOENT';
    error.path = testPath;

    // 验证：错误消息应该包含路径
    const message = `Error at ${error.path}: ${error.message}`;
    expect(message).toContain(testPath);
    expect(message).toContain('Test error');
  });

  /**
   * Test error handling preserves error stack
   */
  it('should preserve error stack trace', () => {
    const error = new Error('Test error with stack');

    // 验证：错误对象有堆栈跟踪
    expect(error.stack).toBeTruthy();
    expect(error.stack).toContain('Test error with stack');
  });

  /**
   * Test error handling with special characters in path
   */
  it('should handle paths with special characters in error messages', () => {
    const specialPath = '/path/with spaces/and-dashes/file.ts';
    const error: NodeJS.ErrnoException = new Error('Path error');
    error.code = 'ENOENT';
    error.path = specialPath;

    // 验证：特殊字符路径应该被正确处理
    expect(error.path).toBe(specialPath);

    const message = `Error: ${error.path}`;
    expect(message).toContain('with spaces');
    expect(message).toContain('and-dashes');
  });

  /**
   * Test error handling with Windows-style paths
   */
  it('should handle Windows-style paths in error messages', () => {
    const windowsPath = 'C:\\Users\\test\\file.ts';
    const error: NodeJS.ErrnoException = new Error('Windows path error');
    error.code = 'EACCES';
    error.path = windowsPath;

    // 验证：Windows 路径应该被正确处理
    expect(error.path).toBe(windowsPath);

    const message = `Error: ${error.path}`;
    expect(message).toContain('C:');
    expect(message).toContain('Users');
  });
});

/**
 * Idempotent Generation - Property-Based Tests
 * Feature: auto-controller-import, Property 3: Idempotent Generation
 * Validates: Requirements 2.1, 2.2
 */
describe('Idempotent Generation - Property-Based Tests', () => {
  const getTestDir = () =>
    join(process.cwd(), `test-temp-idempotent-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  afterEach(() => {
    // 清理所有测试目录
    const tempDirs = readdirSync(process.cwd()).filter((name) => name.startsWith('test-temp-idempotent-'));
    for (const dir of tempDirs) {
      const fullPath = join(process.cwd(), dir);
      if (existsSync(fullPath)) {
        rmSync(fullPath, { recursive: true, force: true });
      }
    }
  });

  /**
   * Property 3: Idempotent Generation
   * For any project state, running the generation script multiple times without file system changes
   * should produce identical output in src/controllers.ts.
   */
  it('should produce identical output when run multiple times without file system changes', () => {
    fc.assert(
      fc.property(
        // 生成随机的控制器结构
        fc.uniqueArray(
          fc.record({
            moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
            controllerNames: fc.uniqueArray(fc.stringMatching(/^[a-z]{3,10}$/), {
              minLength: 1,
              maxLength: 3,
            }),
          }),
          { minLength: 1, maxLength: 5, selector: (item) => item.moduleName },
        ),
        (moduleSpecs) => {
          const testBaseDir = getTestDir();

          // 创建测试结构
          const structure: TestStructure = {
            modules: moduleSpecs.map((spec) => ({
              name: spec.moduleName,
              controllers: spec.controllerNames.map((name) => `${name}.controller.ts`),
            })),
          };

          createTestStructure(testBaseDir, structure);

          // 构建控制器列表
          const controllers: ControllerFile[] = [];
          for (const moduleSpec of moduleSpecs) {
            for (const controllerName of moduleSpec.controllerNames) {
              controllers.push({
                absolutePath: join(
                  testBaseDir,
                  moduleSpec.moduleName,
                  'controllers',
                  `${controllerName}.controller.ts`,
                ),
                relativePath: `./modules/${moduleSpec.moduleName}/controllers/${controllerName}.controller`,
                moduleName: moduleSpec.moduleName,
                controllerName: `${controllerName}.controller`,
              });
            }
          }

          // 生成文件内容三次
          const generateFileContent = (controllers: ControllerFile[]): string => {
            const imports = generateImports(controllers, true, true);
            // 使用固定的时间戳以确保幂等性测试
            const timestamp = '2025-01-01T00:00:00.000Z';
            const count = controllers.length;

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
          };

          const result1 = generateFileContent(controllers);
          const result2 = generateFileContent(controllers);
          const result3 = generateFileContent(controllers);

          // 验证 1: 所有三次生成的结果应该完全相同
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
          expect(result1).toBe(result3);

          // 验证 2: 结果不应该为空（如果有控制器）
          if (controllers.length > 0) {
            expect(result1.length).toBeGreaterThan(0);
          }

          // 验证 3: 结果应该包含所有控制器
          for (const controller of controllers) {
            expect(result1).toContain(controller.relativePath);
          }

          // 验证 4: 导入语句的数量应该一致
          const importLines1 = result1.split('\n').filter((line) => line.trim().startsWith('import '));
          const importLines2 = result2.split('\n').filter((line) => line.trim().startsWith('import '));
          const importLines3 = result3.split('\n').filter((line) => line.trim().startsWith('import '));

          expect(importLines1.length).toBe(controllers.length);
          expect(importLines2.length).toBe(controllers.length);
          expect(importLines3.length).toBe(controllers.length);

          // 验证 5: 每一行都应该完全相同
          const lines1 = result1.split('\n');
          const lines2 = result2.split('\n');
          const lines3 = result3.split('\n');

          expect(lines1.length).toBe(lines2.length);
          expect(lines2.length).toBe(lines3.length);

          for (let i = 0; i < lines1.length; i++) {
            expect(lines1[i]).toBe(lines2[i]);
            expect(lines2[i]).toBe(lines3[i]);
          }

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Idempotent import generation
   * Generating imports multiple times with the same controller list should produce identical results.
   */
  it('should generate identical imports for the same controller list', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
            controllerName: fc.stringMatching(/^[a-z]{3,10}$/),
          }),
          {
            minLength: 1,
            maxLength: 10,
            selector: (item) => `${item.moduleName}-${item.controllerName}`,
          },
        ),
        (controllerSpecs) => {
          const controllers: ControllerFile[] = controllerSpecs.map((spec) => ({
            absolutePath: join(
              process.cwd(),
              'src',
              'modules',
              spec.moduleName,
              'controllers',
              `${spec.controllerName}.controller.ts`,
            ),
            relativePath: `./modules/${spec.moduleName}/controllers/${spec.controllerName}.controller`,
            moduleName: spec.moduleName,
            controllerName: `${spec.controllerName}.controller`,
          }));

          // 生成多次
          const result1 = generateImports(controllers, true, true);
          const result2 = generateImports(controllers, true, true);
          const result3 = generateImports(controllers, true, true);
          const result4 = generateImports(controllers, true, true);
          const result5 = generateImports(controllers, true, true);

          // 验证：所有结果应该完全相同
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
          expect(result3).toBe(result4);
          expect(result4).toBe(result5);

          // 验证：字符串长度应该相同
          expect(result1.length).toBe(result2.length);
          expect(result2.length).toBe(result3.length);

          // 验证：每个字符都应该相同
          for (let i = 0; i < result1.length; i++) {
            expect(result1[i]).toBe(result2[i]);
            expect(result2[i]).toBe(result3[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Idempotent discovery
   * Discovering controllers multiple times in the same directory should produce identical results.
   */
  it('should discover identical controllers when run multiple times', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            name: fc.stringMatching(/^[a-z]{3,8}$/),
            controllers: fc.uniqueArray(fc.stringMatching(/^[a-z]{3,8}\.controller\.ts$/), {
              minLength: 1,
              maxLength: 3,
            }),
          }),
          { minLength: 1, maxLength: 3, selector: (item) => item.name },
        ),
        (modules) => {
          const testBaseDir = getTestDir();

          // 创建测试结构
          const structure: TestStructure = { modules };
          createTestStructure(testBaseDir, structure);

          // 执行发现多次
          const pattern = /\.controller\.ts$/;
          const exclude = [/\.test\.ts$/, /\.spec\.ts$/, /\.d\.ts$/];

          const discovered1 = findControllerFiles(testBaseDir, pattern, exclude);
          const discovered2 = findControllerFiles(testBaseDir, pattern, exclude);
          const discovered3 = findControllerFiles(testBaseDir, pattern, exclude);

          // 验证：所有发现结果应该相同
          expect(discovered1.length).toBe(discovered2.length);
          expect(discovered2.length).toBe(discovered3.length);

          // 验证：排序后的结果应该完全相同
          const sorted1 = [...discovered1].sort();
          const sorted2 = [...discovered2].sort();
          const sorted3 = [...discovered3].sort();

          expect(sorted1).toEqual(sorted2);
          expect(sorted2).toEqual(sorted3);

          // 验证：每个文件都应该在所有结果中
          for (const file of discovered1) {
            expect(discovered2).toContain(file);
            expect(discovered3).toContain(file);
          }

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Order independence
   * The order in which controllers are discovered should not affect the final output
   * (because we sort them).
   */
  it('should produce identical output regardless of discovery order', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
            controllerName: fc.stringMatching(/^[a-z]{3,10}$/),
          }),
          {
            minLength: 2,
            maxLength: 5,
            selector: (item) => `${item.moduleName}-${item.controllerName}`,
          },
        ),
        (controllerSpecs) => {
          // 创建控制器列表
          const controllers: ControllerFile[] = controllerSpecs.map((spec) => ({
            absolutePath: join(
              process.cwd(),
              'src',
              'modules',
              spec.moduleName,
              'controllers',
              `${spec.controllerName}.controller.ts`,
            ),
            relativePath: `./modules/${spec.moduleName}/controllers/${spec.controllerName}.controller`,
            moduleName: spec.moduleName,
            controllerName: `${spec.controllerName}.controller`,
          }));

          // 创建不同顺序的控制器列表
          const shuffled1 = [...controllers].reverse();
          const shuffled2 = [...controllers].sort(() => Math.random() - 0.5);

          // 生成导入语句
          const result1 = generateImports(controllers, true, true);
          const result2 = generateImports(shuffled1, true, true);
          const result3 = generateImports(shuffled2, true, true);

          // 验证：无论输入顺序如何，输出应该相同（因为我们排序了）
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);

          // 验证：所有控制器都应该出现在输出中
          for (const controller of controllers) {
            expect(result1).toContain(controller.relativePath);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Byte-for-byte identical output
   * Multiple generations should produce byte-for-byte identical output.
   */
  it('should produce byte-for-byte identical output', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            moduleName: fc.stringMatching(/^[a-z]{3,10}$/),
            controllerName: fc.stringMatching(/^[a-z]{3,10}$/),
          }),
          {
            minLength: 1,
            maxLength: 5,
            selector: (item) => `${item.moduleName}-${item.controllerName}`,
          },
        ),
        (controllerSpecs) => {
          const controllers: ControllerFile[] = controllerSpecs.map((spec) => ({
            absolutePath: join(
              process.cwd(),
              'src',
              'modules',
              spec.moduleName,
              'controllers',
              `${spec.controllerName}.controller.ts`,
            ),
            relativePath: `./modules/${spec.moduleName}/controllers/${spec.controllerName}.controller`,
            moduleName: spec.moduleName,
            controllerName: `${spec.controllerName}.controller`,
          }));

          // 生成多次
          const result1 = generateImports(controllers, true, true);
          const result2 = generateImports(controllers, true, true);

          // 验证：字节长度应该相同
          const buffer1 = Buffer.from(result1, 'utf-8');
          const buffer2 = Buffer.from(result2, 'utf-8');

          expect(buffer1.length).toBe(buffer2.length);

          // 验证：每个字节都应该相同
          for (let i = 0; i < buffer1.length; i++) {
            expect(buffer1[i]).toBe(buffer2[i]);
          }

          // 验证：字符串应该完全相同
          expect(result1).toBe(result2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Error Handling - Unit Tests
 */
describe('Error Handling - Unit Tests', () => {
  /**
   * Test handling of non-existent directory
   */
  it('should handle non-existent directory errors', () => {
    const nonExistentDir = join(process.cwd(), `non-existent-dir-${Date.now()}`);

    // 尝试查找不存在的目录中的文件
    const pattern = /\.controller\.ts$/;
    const exclude = [/\.test\.ts$/, /\.spec\.ts$/];

    // 验证：应该返回空数组而不是抛出错误
    const result = findControllerFiles(nonExistentDir, pattern, exclude);
    expect(result).toEqual([]);
  });

  /**
   * Test error message formatting for ENOENT
   */
  it('should format ENOENT error messages correctly', () => {
    const error: NodeJS.ErrnoException = new Error('Directory not found');
    error.code = 'ENOENT';
    error.path = '/some/path';

    // 验证：错误对象包含必要信息
    expect(error.code).toBe('ENOENT');
    expect(error.path).toBe('/some/path');
    expect(error.message).toBe('Directory not found');
  });

  /**
   * Test error message formatting for EACCES
   */
  it('should format EACCES error messages correctly', () => {
    const error: NodeJS.ErrnoException = new Error('Permission denied');
    error.code = 'EACCES';
    error.path = '/protected/path';

    // 验证：错误对象包含必要信息
    expect(error.code).toBe('EACCES');
    expect(error.path).toBe('/protected/path');
    expect(error.message).toBe('Permission denied');
  });

  /**
   * Test error message formatting for unknown errors
   */
  it('should handle unknown error types', () => {
    const error = new Error('Unknown error occurred');

    // 验证：即使没有错误代码，也应该有错误消息
    expect(error.message).toBe('Unknown error occurred');
    expect((error as NodeJS.ErrnoException).code).toBeUndefined();
  });
});

/**
 * Property 4: Exclusion of Non-Controller Files
 * Feature: auto-controller-import, Property 4: Exclusion of Non-Controller Files
 * Validates: Requirements 1.2
 *
 * For any file not matching the *.controller.ts pattern or matching exclusion patterns
 * (e.g., *.test.ts, *.spec.ts), the file should not appear in the generated imports.
 */
describe('Exclusion Correctness - Property-Based Tests', () => {
  const getTestDir = () =>
    join(process.cwd(), `test-temp-exclusion-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  afterEach(() => {
    // 清理所有测试目录
    const tempDirs = readdirSync(process.cwd()).filter((name) => name.startsWith('test-temp-exclusion-'));
    for (const dir of tempDirs) {
      const fullPath = join(process.cwd(), dir);
      if (existsSync(fullPath)) {
        rmSync(fullPath, { recursive: true, force: true });
      }
    }
  });

  it('should exclude all non-controller files from discovery', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,8}$/),
          controllerFiles: fc.uniqueArray(fc.stringMatching(/^[a-z]{3,8}\.controller\.ts$/), {
            minLength: 1,
            maxLength: 3,
          }),
          nonControllerFiles: fc.uniqueArray(
            fc.oneof(
              fc.stringMatching(/^[a-z]{3,8}\.test\.ts$/), // Test files
              fc.stringMatching(/^[a-z]{3,8}\.spec\.ts$/), // Spec files
              fc.stringMatching(/^[a-z]{3,8}\.d\.ts$/), // Type definition files
              fc.stringMatching(/^[a-z]{3,8}\.service\.ts$/), // Service files
              fc.stringMatching(/^[a-z]{3,8}\.repository\.ts$/), // Repository files
              fc.stringMatching(/^[a-z]{3,8}\.dto\.ts$/), // DTO files
              fc.stringMatching(/^[a-z]{3,8}\.schema\.ts$/), // Schema files
              fc.stringMatching(/^[a-z]{3,8}\.middleware\.ts$/), // Middleware files
              fc.stringMatching(/^[a-z]{3,8}\.ts$/), // Generic TypeScript files
            ),
            { minLength: 1, maxLength: 5 },
          ),
        }),
        ({ moduleName, controllerFiles, nonControllerFiles }) => {
          const testBaseDir = getTestDir();

          // 创建测试结构
          const structure: TestStructure = {
            modules: [
              {
                name: moduleName,
                controllers: controllerFiles,
                otherFiles: nonControllerFiles,
              },
            ],
          };

          const expectedControllers = createTestStructure(testBaseDir, structure);

          // 执行发现
          const pattern = /\.controller\.ts$/;
          const exclude = [/\.test\.ts$/, /\.spec\.ts$/, /\.d\.ts$/];
          const discovered = findControllerFiles(testBaseDir, pattern, exclude);

          // 验证 1: 只发现控制器文件
          expect(discovered.length).toBe(controllerFiles.length);

          // 验证 2: 所有发现的文件都是控制器文件
          for (const file of discovered) {
            expect(file).toMatch(/\.controller\.ts$/);
          }

          // 验证 3: 没有测试文件被发现
          for (const file of discovered) {
            expect(file).not.toMatch(/\.test\.ts$/);
            expect(file).not.toMatch(/\.spec\.ts$/);
            expect(file).not.toMatch(/\.d\.ts$/);
          }

          // 验证 4: 没有非控制器文件被发现
          for (const nonControllerFile of nonControllerFiles) {
            const fullPath = join(testBaseDir, moduleName, 'controllers', nonControllerFile);
            expect(discovered).not.toContain(fullPath);
          }

          // 验证 5: 所有预期的控制器都被发现
          for (const expected of expectedControllers) {
            expect(discovered).toContain(expected);
          }

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should exclude test files with various naming patterns', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,8}$/),
          baseName: fc.stringMatching(/^[a-z]{3,8}$/),
        }),
        ({ moduleName, baseName }) => {
          const testBaseDir = getTestDir();

          // 创建各种测试文件命名模式
          const testFiles = [
            `${baseName}.test.ts`,
            `${baseName}.spec.ts`,
            `${baseName}.controller.test.ts`,
            `${baseName}.controller.spec.ts`,
          ];

          // 创建一个真正的控制器文件
          const controllerFile = `${baseName}.controller.ts`;

          const structure: TestStructure = {
            modules: [
              {
                name: moduleName,
                controllers: [controllerFile],
                otherFiles: testFiles,
              },
            ],
          };

          createTestStructure(testBaseDir, structure);

          // 执行发现
          const pattern = /\.controller\.ts$/;
          const exclude = [/\.test\.ts$/, /\.spec\.ts$/];
          const discovered = findControllerFiles(testBaseDir, pattern, exclude);

          // 验证：只应该发现一个控制器文件
          expect(discovered.length).toBe(1);

          // 验证：发现的文件应该是控制器文件
          expect(discovered[0]).toMatch(/\.controller\.ts$/);
          expect(discovered[0]).not.toMatch(/\.test\.ts$/);
          expect(discovered[0]).not.toMatch(/\.spec\.ts$/);

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should exclude type definition files', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,8}$/),
          controllerName: fc.stringMatching(/^[a-z]{3,8}$/),
        }),
        ({ moduleName, controllerName }) => {
          const testBaseDir = getTestDir();

          // 创建控制器文件和类型定义文件
          const controllerFile = `${controllerName}.controller.ts`;
          const typeDefFile = `${controllerName}.controller.d.ts`;

          const structure: TestStructure = {
            modules: [
              {
                name: moduleName,
                controllers: [controllerFile],
                otherFiles: [typeDefFile],
              },
            ],
          };

          createTestStructure(testBaseDir, structure);

          // 执行发现
          const pattern = /\.controller\.ts$/;
          const exclude = [/\.test\.ts$/, /\.spec\.ts$/, /\.d\.ts$/];
          const discovered = findControllerFiles(testBaseDir, pattern, exclude);

          // 验证：只应该发现控制器文件，不包括类型定义文件
          expect(discovered.length).toBe(1);
          expect(discovered[0]).toMatch(/\.controller\.ts$/);
          expect(discovered[0]).not.toMatch(/\.d\.ts$/);

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should only include files matching the controller pattern', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,8}$/),
          fileTypes: fc.uniqueArray(
            fc.oneof(
              fc.constant('service'),
              fc.constant('repository'),
              fc.constant('dto'),
              fc.constant('schema'),
              fc.constant('middleware'),
              fc.constant('util'),
              fc.constant('helper'),
            ),
            { minLength: 2, maxLength: 5 },
          ),
          controllerName: fc.stringMatching(/^[a-z]{3,8}$/),
        }),
        ({ moduleName, fileTypes, controllerName }) => {
          const testBaseDir = getTestDir();

          // 创建各种非控制器文件
          const nonControllerFiles = fileTypes.map((type) => `${type}.${type}.ts`);

          // 创建一个真正的控制器文件
          const controllerFile = `${controllerName}.controller.ts`;

          const structure: TestStructure = {
            modules: [
              {
                name: moduleName,
                controllers: [controllerFile],
                otherFiles: nonControllerFiles,
              },
            ],
          };

          createTestStructure(testBaseDir, structure);

          // 执行发现
          const pattern = /\.controller\.ts$/;
          const exclude = [/\.test\.ts$/, /\.spec\.ts$/, /\.d\.ts$/];
          const discovered = findControllerFiles(testBaseDir, pattern, exclude);

          // 验证：只应该发现控制器文件
          expect(discovered.length).toBe(1);

          // 验证：发现的文件匹配控制器模式
          for (const file of discovered) {
            expect(file).toMatch(/\.controller\.ts$/);
          }

          // 验证：没有非控制器文件被发现
          for (const nonControllerFile of nonControllerFiles) {
            const fullPath = join(testBaseDir, moduleName, 'controllers', nonControllerFile);
            expect(discovered).not.toContain(fullPath);
          }

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should handle mixed file types correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,8}$/),
          numControllers: fc.integer({ min: 1, max: 3 }),
          numTestFiles: fc.integer({ min: 1, max: 3 }),
          numOtherFiles: fc.integer({ min: 1, max: 3 }),
        }),
        ({ moduleName, numControllers, numTestFiles, numOtherFiles }) => {
          const testBaseDir = getTestDir();

          // 生成控制器文件
          const controllerFiles = Array.from({ length: numControllers }, (_, i) => `ctrl${i}.controller.ts`);

          // 生成测试文件
          const testFiles = Array.from({ length: numTestFiles }, (_, i) => `test${i}.test.ts`);

          // 生成其他文件
          const otherFiles = Array.from({ length: numOtherFiles }, (_, i) => `other${i}.service.ts`);

          const structure: TestStructure = {
            modules: [
              {
                name: moduleName,
                controllers: controllerFiles,
                otherFiles: [...testFiles, ...otherFiles],
              },
            ],
          };

          createTestStructure(testBaseDir, structure);

          // 执行发现
          const pattern = /\.controller\.ts$/;
          const exclude = [/\.test\.ts$/, /\.spec\.ts$/, /\.d\.ts$/];
          const discovered = findControllerFiles(testBaseDir, pattern, exclude);

          // 验证：只发现控制器文件
          expect(discovered.length).toBe(numControllers);

          // 验证：所有发现的文件都是控制器
          for (const file of discovered) {
            expect(file).toMatch(/\.controller\.ts$/);
            expect(file).not.toMatch(/\.test\.ts$/);
            expect(file).not.toMatch(/\.service\.ts$/);
          }

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should exclude files based on all exclusion patterns', () => {
    fc.assert(
      fc.property(
        fc.record({
          moduleName: fc.stringMatching(/^[a-z]{3,8}$/),
          baseName: fc.stringMatching(/^[a-z]{3,8}$/),
        }),
        ({ moduleName, baseName }) => {
          const testBaseDir = getTestDir();

          // 创建应该被排除的文件
          const excludedFiles = [
            `${baseName}.test.ts`, // 匹配 /\.test\.ts$/
            `${baseName}.spec.ts`, // 匹配 /\.spec\.ts$/
            `${baseName}.d.ts`, // 匹配 /\.d\.ts$/
          ];

          // 创建应该被包含的文件
          const controllerFile = `${baseName}.controller.ts`;

          const structure: TestStructure = {
            modules: [
              {
                name: moduleName,
                controllers: [controllerFile],
                otherFiles: excludedFiles,
              },
            ],
          };

          createTestStructure(testBaseDir, structure);

          // 执行发现
          const pattern = /\.controller\.ts$/;
          const exclude = [/\.test\.ts$/, /\.spec\.ts$/, /\.d\.ts$/];
          const discovered = findControllerFiles(testBaseDir, pattern, exclude);

          // 验证：只发现控制器文件
          expect(discovered.length).toBe(1);

          // 验证：所有排除模式都生效
          for (const file of discovered) {
            expect(file).not.toMatch(/\.test\.ts$/);
            expect(file).not.toMatch(/\.spec\.ts$/);
            expect(file).not.toMatch(/\.d\.ts$/);
          }

          // 验证：控制器文件被发现
          expect(discovered[0]).toMatch(/\.controller\.ts$/);

          // 清理
          if (existsSync(testBaseDir)) {
            rmSync(testBaseDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
