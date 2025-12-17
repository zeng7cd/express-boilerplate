/**
 * Build Pipeline Integration Tests
 * Tests that the controller generation script integrates correctly with the build pipeline
 */
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Build Pipeline Integration', () => {
  const controllersPath = 'src/controllers.ts';
  const testControllerDir = 'src/modules/test-module/controllers';
  const testControllerPath = join(testControllerDir, 'test.controller.ts');
  let originalControllersContent: string;

  beforeEach(() => {
    // Backup original controllers.ts
    if (existsSync(controllersPath)) {
      originalControllersContent = readFileSync(controllersPath, 'utf-8');
    }
  });

  afterEach(() => {
    // Restore original controllers.ts
    if (originalControllersContent) {
      writeFileSync(controllersPath, originalControllersContent, 'utf-8');
    }

    // Clean up test controller
    if (existsSync(testControllerPath)) {
      rmSync(testControllerPath);
    }
    if (existsSync(testControllerDir)) {
      rmSync(testControllerDir, { recursive: true });
    }
    if (existsSync('src/modules/test-module')) {
      rmSync('src/modules/test-module', { recursive: true });
    }
  });

  it('should run generation before build', () => {
    // Run the generate:controllers script
    const output = execSync('npm run generate:controllers', { encoding: 'utf-8' });

    // Verify the script executed successfully
    expect(output).toContain('Controllers file generated successfully');

    // Verify the controllers.ts file was created/updated
    expect(existsSync(controllersPath)).toBe(true);

    // Verify the file contains the expected structure
    const content = readFileSync(controllersPath, 'utf-8');
    expect(content).toContain('控制器自动加载');
    expect(content).toContain('scripts/generate-controllers.ts 自动生成');
  });

  it('should generate valid TypeScript file', () => {
    // Run generation
    execSync('npm run generate:controllers', { encoding: 'utf-8' });

    // Verify the generated file exists
    expect(existsSync(controllersPath)).toBe(true);

    // Read the generated file
    const content = readFileSync(controllersPath, 'utf-8');

    // Verify it contains valid import statements
    expect(content).toMatch(/import\s+['"]\.\/modules\/.+\.controller['"]/);

    // Verify it has proper structure
    expect(content).toContain('/**');
    expect(content).toContain('*/');

    // Verify it doesn't have syntax errors (basic check)
    expect(content).not.toContain('undefined');
    expect(content).not.toContain('null');
  });

  it('should discover new controllers after creation', () => {
    // Create a test controller
    mkdirSync(testControllerDir, { recursive: true });
    const testControllerContent = `
import { Controller, Get } from '@/core/router';

@Controller('/test')
export class TestController {
  @Get('/')
  test() {
    return { message: 'test' };
  }
}
`;
    writeFileSync(testControllerPath, testControllerContent, 'utf-8');

    // Run generation
    const output = execSync('npm run generate:controllers', { encoding: 'utf-8' });

    // Verify the new controller was discovered
    expect(output).toContain('test-module/test.controller');

    // Verify the generated file includes the new controller
    const content = readFileSync(controllersPath, 'utf-8');
    expect(content).toContain('./modules/test-module/controllers/test.controller');
  });

  it('should work with build script', () => {
    // This test verifies that the build script includes generation
    // We don't actually run the full build (too slow), but verify the script configuration
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));

    // Verify build script includes generate:controllers
    expect(packageJson.scripts.build).toContain('generate:controllers');

    // Verify the order is correct (generation before compilation)
    const buildScript = packageJson.scripts.build;
    const generateIndex = buildScript.indexOf('generate:controllers');
    const tscIndex = buildScript.indexOf('tsc');

    expect(generateIndex).toBeLessThan(tscIndex);
  });

  it('should work with dev script', () => {
    // Verify dev script includes generation
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));

    // Verify start:dev script includes generate:controllers
    expect(packageJson.scripts['start:dev']).toContain('generate:controllers');

    // Verify the order is correct (generation before dev server)
    const devScript = packageJson.scripts['start:dev'];
    const generateIndex = devScript.indexOf('generate:controllers');
    const nodeIndex = devScript.indexOf('node');

    expect(generateIndex).toBeLessThan(nodeIndex);
  });

  it('should maintain consistent output across multiple runs', () => {
    // Run generation first time
    execSync('npm run generate:controllers', { encoding: 'utf-8' });
    const firstContent = readFileSync(controllersPath, 'utf-8');

    // Remove timestamp for comparison (it will be different)
    const firstContentWithoutTimestamp = firstContent.replace(/生成时间: .+/, '生成时间: TIMESTAMP');

    // Run generation second time
    execSync('npm run generate:controllers', { encoding: 'utf-8' });
    const secondContent = readFileSync(controllersPath, 'utf-8');
    const secondContentWithoutTimestamp = secondContent.replace(/生成时间: .+/, '生成时间: TIMESTAMP');

    // Verify the content is identical (except timestamp)
    expect(firstContentWithoutTimestamp).toBe(secondContentWithoutTimestamp);
  });
});
