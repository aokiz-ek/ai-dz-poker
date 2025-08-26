/**
 * 云端适配器测试工具
 * 
 * 功能：
 * 1. 连接测试
 * 2. 认证测试  
 * 3. 数据操作测试
 * 4. 同步功能测试
 * 5. 性能基准测试
 * 6. 错误恢复测试
 */

import { CloudAdapter, createCloudAdapter, CloudProviderConfig } from './storage/cloud-adapter';
import { CloudAuthManager } from './cloud-auth-manager';
import { HandHistory, PlayerStats, TrainingScenario } from './storage/interfaces';

export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuite {
  suiteName: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

export interface BenchmarkResult {
  operation: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  operations: number;
  opsPerSecond: number;
}

export class CloudAdapterTester {
  private adapter: CloudAdapter;
  private authManager: CloudAuthManager;
  private config: CloudProviderConfig;
  private testResults: TestSuite[] = [];

  constructor(config: CloudProviderConfig) {
    this.config = config;
    this.adapter = createCloudAdapter(config);
    this.authManager = new CloudAuthManager(config);
  }

  /**
   * 运行完整的测试套件
   */
  async runAllTests(): Promise<TestSuite[]> {
    console.log(`🚀 开始测试 ${this.config.provider} 云端适配器...`);
    
    this.testResults = [];

    // 1. 基础连接测试
    await this.runConnectionTests();

    // 2. 认证系统测试
    await this.runAuthTests();

    // 3. 数据操作测试
    await this.runDataOperationTests();

    // 4. 批量操作测试
    await this.runBatchOperationTests();

    // 5. 查询功能测试
    await this.runQueryTests();

    // 6. 同步功能测试
    await this.runSyncTests();

    // 7. 错误恢复测试
    await this.runErrorRecoveryTests();

    // 8. 性能基准测试
    await this.runBenchmarkTests();

    this.printTestSummary();
    return this.testResults;
  }

  /**
   * 基础连接测试
   */
  private async runConnectionTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: '连接测试',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    // 初始化测试
    await this.runTest(suite, '适配器初始化', async () => {
      await this.adapter.initialize();
      return true;
    });

    // 可用性检查
    await this.runTest(suite, '服务可用性检查', async () => {
      const isAvailable = await this.adapter.isAvailable();
      if (!isAvailable) {
        throw new Error('服务不可用');
      }
      return true;
    });

    // 存储使用情况获取
    await this.runTest(suite, '存储使用情况获取', async () => {
      const usage = await this.adapter.getStorageUsage();
      return usage && typeof usage.used === 'number';
    });

    this.testResults.push(suite);
  }

  /**
   * 认证系统测试
   */
  private async runAuthTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: '认证测试',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    // 认证管理器初始化
    await this.runTest(suite, '认证管理器初始化', async () => {
      await this.authManager.initialize();
      return true;
    });

    // 匿名登录测试（仅Firebase）
    if (this.config.provider === 'firebase') {
      await this.runTest(suite, '匿名登录', async () => {
        const user = await this.authManager.signInAnonymously();
        return !!user && user.isAnonymous;
      });
    }

    // 测试令牌获取
    await this.runTest(suite, '访问令牌获取', async () => {
      const token = await this.authManager.getAccessToken();
      return typeof token === 'string';
    });

    this.testResults.push(suite);
  }

  /**
   * 数据操作测试
   */
  private async runDataOperationTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: '数据操作测试',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    const testKey = 'test_data_' + Date.now();
    const testData = { message: 'Hello Cloud!', timestamp: Date.now() };

    // 数据写入测试
    await this.runTest(suite, '数据写入', async () => {
      await this.adapter.set(testKey, testData);
      return true;
    });

    // 数据读取测试
    await this.runTest(suite, '数据读取', async () => {
      const data = await this.adapter.get(testKey);
      return JSON.stringify(data) === JSON.stringify(testData);
    });

    // 数据存在性检查
    await this.runTest(suite, '数据存在性检查', async () => {
      const exists = await this.adapter.has(testKey);
      return exists === true;
    });

    // 键列表获取
    await this.runTest(suite, '键列表获取', async () => {
      const keys = await this.adapter.keys('test_data_');
      return Array.isArray(keys) && keys.includes(testKey);
    });

    // 数据删除测试
    await this.runTest(suite, '数据删除', async () => {
      await this.adapter.delete(testKey);
      const exists = await this.adapter.has(testKey);
      return exists === false;
    });

    this.testResults.push(suite);
  }

  /**
   * 批量操作测试
   */
  private async runBatchOperationTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: '批量操作测试',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    const testHandHistories: HandHistory[] = [];
    for (let i = 0; i < 5; i++) {
      testHandHistories.push({
        id: `test_hand_${Date.now()}_${i}`,
        gameType: 'nlhe',
        stakes: '0.5/1',
        playersCount: 6,
        position: 'BTN',
        holeCards: ['As', 'Kd'],
        boardCards: ['Qh', 'Jc', '10s'],
        actions: [],
        potSize: 100,
        winAmount: 150,
        bbWon: 1.5,
        duration: 300000,
        playedAt: Date.now() - i * 60000,
        gtoAnalysis: null
      });
    }

    // 批量保存手牌历史
    await this.runTest(suite, '批量手牌历史保存', async () => {
      await this.adapter.batchSaveHandHistory(testHandHistories);
      return true;
    });

    // 查询手牌历史
    await this.runTest(suite, '手牌历史查询', async () => {
      const result = await this.adapter.queryHandHistory({ limit: 10 });
      return result.data.length > 0;
    });

    // 清理测试数据
    await this.runTest(suite, '测试数据清理', async () => {
      for (const hand of testHandHistories) {
        await this.adapter.deleteHandHistory(hand.id);
      }
      return true;
    });

    this.testResults.push(suite);
  }

  /**
   * 查询功能测试
   */
  private async runQueryTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: '查询功能测试',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    // 创建测试数据
    const testStats: PlayerStats = {
      playerId: 'test_player',
      handsPlayed: 1000,
      vpip: 22.5,
      pfr: 18.2,
      aggressionFactor: 2.8,
      winratePerHour: 15.5,
      lastUpdated: Date.now()
    };

    await this.runTest(suite, '玩家统计数据保存', async () => {
      await this.adapter.updatePlayerStats(testStats);
      return true;
    });

    await this.runTest(suite, '玩家统计数据查询', async () => {
      const stats = await this.adapter.getPlayerStats('test_player');
      return !!stats && stats.playerId === 'test_player';
    });

    await this.runTest(suite, '所有玩家统计查询', async () => {
      const allStats = await this.adapter.getAllPlayerStats();
      return Array.isArray(allStats) && allStats.length > 0;
    });

    this.testResults.push(suite);
  }

  /**
   * 同步功能测试
   */
  private async runSyncTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: '同步功能测试',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    // 获取远程变更
    await this.runTest(suite, '获取远程变更', async () => {
      const changes = await this.adapter.getRemoteChanges('handHistory', 0);
      return Array.isArray(changes);
    });

    // 获取数据校验和
    await this.runTest(suite, '获取数据校验和', async () => {
      const checksums = await this.adapter.getChecksums();
      return typeof checksums === 'object';
    });

    // 缓存统计
    await this.runTest(suite, '获取缓存统计', async () => {
      const stats = await this.adapter.getCacheStats();
      return typeof stats.hitRate === 'number';
    });

    this.testResults.push(suite);
  }

  /**
   * 错误恢复测试
   */
  private async runErrorRecoveryTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: '错误恢复测试',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    // 不存在的数据读取
    await this.runTest(suite, '读取不存在的数据', async () => {
      const data = await this.adapter.get('non_existent_key_' + Date.now());
      return data === null;
    });

    // 删除不存在的数据
    await this.runTest(suite, '删除不存在的数据', async () => {
      await this.adapter.delete('non_existent_key_' + Date.now());
      return true; // 不应该抛出错误
    });

    // 无效查询参数
    await this.runTest(suite, '无效查询参数处理', async () => {
      const result = await this.adapter.queryHandHistory({
        filters: { invalidField: 'invalidValue' }
      });
      return result.data.length >= 0; // 应该返回空结果而不是错误
    });

    this.testResults.push(suite);
  }

  /**
   * 性能基准测试
   */
  private async runBenchmarkTests(): Promise<void> {
    const suite: TestSuite = {
      suiteName: '性能基准测试',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    };

    const iterations = 10;
    
    // 写入性能测试
    const writeResults = await this.runBenchmark('数据写入', iterations, async (i) => {
      await this.adapter.set(`benchmark_key_${i}`, { data: `test data ${i}`, timestamp: Date.now() });
    });

    await this.runTest(suite, `写入性能 (${iterations}次)`, async () => {
      return writeResults.avgTime < 1000; // 平均时间应小于1秒
    }, { benchmark: writeResults });

    // 读取性能测试
    const readResults = await this.runBenchmark('数据读取', iterations, async (i) => {
      await this.adapter.get(`benchmark_key_${i}`);
    });

    await this.runTest(suite, `读取性能 (${iterations}次)`, async () => {
      return readResults.avgTime < 500; // 平均时间应小于0.5秒
    }, { benchmark: readResults });

    // 清理基准测试数据
    await this.runTest(suite, '清理基准测试数据', async () => {
      for (let i = 0; i < iterations; i++) {
        await this.adapter.delete(`benchmark_key_${i}`);
      }
      return true;
    });

    this.testResults.push(suite);
  }

  /**
   * 运行单个测试
   */
  private async runTest(
    suite: TestSuite, 
    testName: string, 
    testFn: () => Promise<boolean>,
    details?: any
  ): Promise<void> {
    const startTime = Date.now();
    let result: TestResult;

    try {
      const passed = await testFn();
      result = {
        testName,
        passed,
        duration: Date.now() - startTime,
        details
      };
    } catch (error) {
      result = {
        testName,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        details
      };
    }

    suite.results.push(result);
    suite.totalTests++;
    if (result.passed) {
      suite.passedTests++;
    } else {
      suite.failedTests++;
    }
    suite.totalDuration += result.duration;

    // 实时输出测试结果
    const status = result.passed ? '✅' : '❌';
    const duration = result.duration < 1000 ? `${result.duration}ms` : `${(result.duration / 1000).toFixed(2)}s`;
    console.log(`  ${status} ${testName} (${duration})`);
    
    if (!result.passed && result.error) {
      console.log(`    错误: ${result.error}`);
    }
  }

  /**
   * 运行基准测试
   */
  private async runBenchmark(
    name: string,
    iterations: number,
    operation: (i: number) => Promise<void>
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    
    console.log(`  🔄 运行基准测试: ${name} (${iterations}次迭代)...`);
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await operation(i);
      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const totalTime = times.reduce((a, b) => a + b, 0);
    const opsPerSecond = iterations / (totalTime / 1000);

    return {
      operation: name,
      avgTime,
      minTime,
      maxTime,
      operations: iterations,
      opsPerSecond
    };
  }

  /**
   * 打印测试总结
   */
  private printTestSummary(): void {
    console.log('\n📊 测试总结:');
    console.log('=' .repeat(50));

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;

    for (const suite of this.testResults) {
      totalTests += suite.totalTests;
      totalPassed += suite.passedTests;
      totalFailed += suite.failedTests;
      totalDuration += suite.totalDuration;

      const successRate = suite.totalTests > 0 ? (suite.passedTests / suite.totalTests * 100).toFixed(1) : '0';
      const durationStr = suite.totalDuration < 1000 ? 
        `${suite.totalDuration}ms` : 
        `${(suite.totalDuration / 1000).toFixed(2)}s`;

      console.log(`${suite.suiteName}: ${suite.passedTests}/${suite.totalTests} passed (${successRate}%) - ${durationStr}`);
      
      // 显示失败的测试
      const failedTests = suite.results.filter(r => !r.passed);
      if (failedTests.length > 0) {
        failedTests.forEach(test => {
          console.log(`  ❌ ${test.testName}: ${test.error}`);
        });
      }
    }

    console.log('=' .repeat(50));
    const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : '0';
    const overallDuration = totalDuration < 1000 ? 
      `${totalDuration}ms` : 
      `${(totalDuration / 1000).toFixed(2)}s`;

    console.log(`总计: ${totalPassed}/${totalTests} passed (${overallSuccessRate}%) - ${overallDuration}`);
    
    if (totalFailed === 0) {
      console.log('🎉 所有测试通过！');
    } else {
      console.log(`⚠️  ${totalFailed} 个测试失败`);
    }
  }

  /**
   * 导出测试报告
   */
  exportReport(): any {
    return {
      provider: this.config.provider,
      timestamp: new Date().toISOString(),
      testSuites: this.testResults,
      summary: {
        totalSuites: this.testResults.length,
        totalTests: this.testResults.reduce((sum, suite) => sum + suite.totalTests, 0),
        totalPassed: this.testResults.reduce((sum, suite) => sum + suite.passedTests, 0),
        totalFailed: this.testResults.reduce((sum, suite) => sum + suite.failedTests, 0),
        totalDuration: this.testResults.reduce((sum, suite) => sum + suite.totalDuration, 0)
      }
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      if (this.authManager) {
        this.authManager.destroy();
      }
      if (this.adapter) {
        await this.adapter.clearCache();
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }
}

/**
 * 快速测试工具函数
 */
export async function testCloudAdapter(config: CloudProviderConfig): Promise<any> {
  const tester = new CloudAdapterTester(config);
  
  try {
    await tester.runAllTests();
    return tester.exportReport();
  } finally {
    await tester.cleanup();
  }
}

export default CloudAdapterTester;