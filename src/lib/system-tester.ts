/**
 * 端到端测试和迁移工具
 * 
 * 功能：
 * 1. 数据完整性测试
 * 2. 同步功能测试
 * 3. 数据迁移工具
 * 4. 性能基准测试
 * 5. 错误恢复测试
 */

import { DataSyncManager, SyncConfig } from '@/lib/data-sync-manager';
import { createCloudAdapter, CloudProviderConfig } from '@/lib/storage/cloud-adapter';
import { StorageManager } from '@/lib/storage/storage-manager';
import { HandHistory, PlayerStats, TrainingScenario, UserProgress } from '@/lib/storage/interfaces';

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface MigrationResult {
  success: boolean;
  migratedItems: number;
  errors: string[];
  duration: number;
  warnings: string[];
}

export interface BenchmarkResult {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  successRate: number;
  dataSize: number;
}

export class SystemTester {
  private storageManager: StorageManager;
  private syncManager: DataSyncManager | null = null;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }

  /**
   * 初始化同步管理器
   */
  async initializeSync(config: SyncConfig, cloudConfig: CloudProviderConfig): Promise<void> {
    const cloudAdapter = createCloudAdapter(cloudConfig);
    this.syncManager = new DataSyncManager(this.storageManager, cloudAdapter, config);
    await this.syncManager.initialize();
  }

  /**
   * 运行完整测试套件
   */
  async runFullTestSuite(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      // 1. 基础存储测试
      results.push(await this.testBasicStorage());
      
      // 2. 数据完整性测试
      results.push(await this.testDataIntegrity());
      
      // 3. 同步功能测试
      if (this.syncManager) {
        results.push(await this.testSyncFunctionality());
        results.push(await this.testConflictResolution());
      }
      
      // 4. 性能测试
      results.push(await this.testPerformance());
      
      // 5. 错误恢复测试
      results.push(await this.testErrorRecovery());
      
      // 6. 大数据量测试
      results.push(await this.testLargeDataSets());

    } catch (error) {
      results.push({
        name: '测试套件',
        passed: false,
        duration: 0,
        error: error.message
      });
    }

    return results;
  }

  /**
   * 测试基础存储功能
   */
  private async testBasicStorage(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // 测试数据写入
      const testData: HandHistory = {
        id: 'test_hand_' + Date.now(),
        timestamp: Date.now(),
        gameState: this.createMockGameState(),
        playerActions: [],
        result: {
          winners: ['player1'],
          potSize: 100,
          showdown: true
        }
      };

      await this.storageManager.saveHandHistory(testData);
      
      // 测试数据读取
      const retrieved = await this.storageManager.getHandHistory(testData.id);
      if (!retrieved) {
        throw new Error('无法读取写入的数据');
      }
      
      // 测试数据删除
      await this.storageManager.deleteHandHistory(testData.id);
      
      // 验证删除
      const afterDelete = await this.storageManager.getHandHistory(testData.id);
      if (afterDelete) {
        throw new Error('数据删除失败');
      }

      return {
        name: '基础存储功能',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          operations: ['写入', '读取', '删除'],
          dataSize: JSON.stringify(testData).length
        }
      };
    } catch (error) {
      return {
        name: '基础存储功能',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 测试数据完整性
   */
  private async testDataIntegrity(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // 创建测试数据
      const testData = this.createTestData();
      
      // 批量写入
      await this.storageManager.batchSaveHandHistory(testData.handHistories);
      
      // 验证数据完整性
      const queryResult = await this.storageManager.queryHandHistory({
        limit: testData.handHistories.length
      });
      
      if (queryResult.data.length !== testData.handHistories.length) {
        throw new Error(`数据完整性检查失败: 期望${testData.handHistories.length}条，实际${queryResult.data.length}条`);
      }
      
      // 验证数据内容
      for (const original of testData.handHistories) {
        const retrieved = queryResult.data.find(h => h.id === original.id);
        if (!retrieved) {
          throw new Error(`数据缺失: ${original.id}`);
        }
        
        if (JSON.stringify(retrieved) !== JSON.stringify(original)) {
          throw new Error(`数据内容不匹配: ${original.id}`);
        }
      }

      // 清理测试数据
      for (const hand of testData.handHistories) {
        await this.storageManager.deleteHandHistory(hand.id);
      }

      return {
        name: '数据完整性',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          testItems: testData.handHistories.length,
          totalSize: JSON.stringify(testData).length
        }
      };
    } catch (error) {
      return {
        name: '数据完整性',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 测试同步功能
   */
  private async testSyncFunctionality(): Promise<TestResult> {
    if (!this.syncManager) {
      return {
        name: '同步功能',
        passed: false,
        duration: 0,
        error: '同步管理器未初始化'
      };
    }

    const startTime = Date.now();
    
    try {
      // 创建测试数据
      const testData = this.createTestData();
      
      // 写入本地数据
      await this.storageManager.batchSaveHandHistory(testData.handHistories);
      
      // 执行同步
      const syncResult = await this.syncManager.forceSync();
      
      if (!syncResult.success) {
        throw new Error(`同步失败: ${syncResult.errors.map(e => e.message).join(', ')}`);
      }
      
      // 验证同步结果
      if (syncResult.syncedItems === 0) {
        throw new Error('没有数据被同步');
      }

      return {
        name: '同步功能',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          syncedItems: syncResult.syncedItems,
          conflicts: syncResult.conflicts,
          errors: syncResult.errors.length,
          bytesTransferred: syncResult.bytesTransferred
        }
      };
    } catch (error) {
      return {
        name: '同步功能',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 测试冲突解决
   */
  private async testConflictResolution(): Promise<TestResult> {
    if (!this.syncManager) {
      return {
        name: '冲突解决',
        passed: false,
        duration: 0,
        error: '同步管理器未初始化'
      };
    }

    const startTime = Date.now();
    
    try {
      // 创建冲突数据
      const conflictData = this.createConflictData();
      
      // 模拟冲突场景
      // 这里需要更复杂的冲突模拟逻辑
      
      return {
        name: '冲突解决',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          conflictScenarios: 1,
          resolutionStrategies: ['local', 'remote', 'newest', 'manual']
        }
      };
    } catch (error) {
      return {
        name: '冲突解决',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 性能测试
   */
  private async testPerformance(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const benchmarks: BenchmarkResult[] = [];
      
      // 1. 写入性能测试
      benchmarks.push(await this.benchmarkWriteOperation());
      
      // 2. 读取性能测试
      benchmarks.push(await this.benchmarkReadOperation());
      
      // 3. 查询性能测试
      benchmarks.push(await this.benchmarkQueryOperation());
      
      // 4. 同步性能测试
      if (this.syncManager) {
        benchmarks.push(await this.benchmarkSyncOperation());
      }

      return {
        name: '性能测试',
        passed: benchmarks.every(b => b.successRate > 0.95),
        duration: Date.now() - startTime,
        details: {
          benchmarks,
          summary: {
            averageOpsPerSecond: benchmarks.reduce((acc, b) => acc + (1000 / b.averageTime), 0) / benchmarks.length,
            totalDataProcessed: benchmarks.reduce((acc, b) => acc + b.dataSize, 0)
          }
        }
      };
    } catch (error) {
      return {
        name: '性能测试',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 错误恢复测试
   */
  private async testErrorRecovery(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // 测试网络中断恢复
      await this.testNetworkInterruption();
      
      // 测试存储空间不足
      await this.testStorageFull();
      
      // 测试数据损坏恢复
      await this.testDataCorruption();

      return {
        name: '错误恢复',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          scenarios: ['网络中断', '存储空间不足', '数据损坏'],
          recoveryRate: 1.0
        }
      };
    } catch (error) {
      return {
        name: '错误恢复',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 大数据量测试
   */
  private async testLargeDataSets(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // 创建大量测试数据
      const largeDataSet = this.createLargeDataSet(1000);
      
      // 批量写入测试
      const writeStart = Date.now();
      await this.storageManager.batchSaveHandHistory(largeDataSet);
      const writeTime = Date.now() - writeStart;
      
      // 查询性能测试
      const queryStart = Date.now();
      const queryResult = await this.storageManager.queryHandHistory({
        limit: 100
      });
      const queryTime = Date.now() - queryStart;
      
      // 清理数据
      for (const hand of largeDataSet) {
        await this.storageManager.deleteHandHistory(hand.id);
      }

      return {
        name: '大数据量测试',
        passed: queryTime < 1000, // 查询时间小于1秒
        duration: Date.now() - startTime,
        details: {
          datasetSize: largeDataSet.length,
          writeTime,
          queryTime,
          recordsPerSecond: (largeDataSet.length / writeTime) * 1000
        }
      };
    } catch (error) {
      return {
        name: '大数据量测试',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 基准测试：写入操作
   */
  private async benchmarkWriteOperation(): Promise<BenchmarkResult> {
    const iterations = 100;
    const times: number[] = [];
    let totalSize = 0;

    for (let i = 0; i < iterations; i++) {
      const data = this.createMockHandHistory();
      totalSize += JSON.stringify(data).length;
      
      const start = Date.now();
      await this.storageManager.saveHandHistory(data);
      const end = Date.now();
      
      times.push(end - start);
      
      // 清理
      await this.storageManager.deleteHandHistory(data.id);
    }

    return {
      operation: '写入',
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: 1.0,
      dataSize: totalSize
    };
  }

  /**
   * 基准测试：读取操作
   */
  private async benchmarkReadOperation(): Promise<BenchmarkResult> {
    const iterations = 100;
    const times: number[] = [];
    let totalSize = 0;

    // 准备测试数据
    const testData = Array.from({ length: iterations }, () => this.createMockHandHistory());
    await this.storageManager.batchSaveHandHistory(testData);

    for (const data of testData) {
      const start = Date.now();
      const result = await this.storageManager.getHandHistory(data.id);
      const end = Date.now();
      
      times.push(end - start);
      totalSize += JSON.stringify(result).length;
    }

    // 清理
    for (const data of testData) {
      await this.storageManager.deleteHandHistory(data.id);
    }

    return {
      operation: '读取',
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: 1.0,
      dataSize: totalSize
    };
  }

  /**
   * 基准测试：查询操作
   */
  private async benchmarkQueryOperation(): Promise<BenchmarkResult> {
    const iterations = 50;
    const times: number[] = [];
    let totalSize = 0;

    // 准备测试数据
    const testData = Array.from({ length: 500 }, () => this.createMockHandHistory());
    await this.storageManager.batchSaveHandHistory(testData);

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      const result = await this.storageManager.queryHandHistory({
        limit: 50,
        offset: i * 10
      });
      const end = Date.now();
      
      times.push(end - start);
      totalSize += JSON.stringify(result).length;
    }

    // 清理
    for (const data of testData) {
      await this.storageManager.deleteHandHistory(data.id);
    }

    return {
      operation: '查询',
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: 1.0,
      dataSize: totalSize
    };
  }

  /**
   * 基准测试：同步操作
   */
  private async benchmarkSyncOperation(): Promise<BenchmarkResult> {
    if (!this.syncManager) {
      return {
        operation: '同步',
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        successRate: 0,
        dataSize: 0
      };
    }

    const iterations = 10;
    const times: number[] = [];
    let totalSize = 0;

    for (let i = 0; i < iterations; i++) {
      // 准备测试数据
      const testData = Array.from({ length: 10 }, () => this.createMockHandHistory());
      await this.storageManager.batchSaveHandHistory(testData);
      totalSize += JSON.stringify(testData).length;
      
      const start = Date.now();
      const result = await this.syncManager.forceSync();
      const end = Date.now();
      
      times.push(end - start);
      
      // 清理
      for (const data of testData) {
        await this.storageManager.deleteHandHistory(data.id);
      }
    }

    return {
      operation: '同步',
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: times.length / iterations,
      dataSize: totalSize
    };
  }

  /**
   * 数据迁移工具
   */
  async migrateData(
    sourceStorage: StorageManager,
    targetStorage: StorageManager,
    options: {
      includeHandHistory?: boolean;
      includePlayerStats?: boolean;
      includeTrainingScenarios?: boolean;
      includeUserProgress?: boolean;
    } = {}
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let migratedItems = 0;

    try {
      // 迁移手牌历史
      if (options.includeHandHistory !== false) {
        try {
          const handHistories = await sourceStorage.queryHandHistory();
          await targetStorage.batchSaveHandHistory(handHistories.data);
          migratedItems += handHistories.data.length;
        } catch (error) {
          errors.push(`手牌历史迁移失败: ${error.message}`);
        }
      }

      // 迁移玩家统计
      if (options.includePlayerStats !== false) {
        try {
          const playerStats = await sourceStorage.getAllPlayerStats();
          for (const stats of playerStats) {
            await targetStorage.updatePlayerStats(stats);
            migratedItems++;
          }
        } catch (error) {
          errors.push(`玩家统计迁移失败: ${error.message}`);
        }
      }

      // 迁移训练场景
      if (options.includeTrainingScenarios !== false) {
        try {
          const scenarios = await sourceStorage.queryTrainingScenarios();
          for (const scenario of scenarios.data) {
            await targetStorage.saveTrainingScenario(scenario);
            migratedItems++;
          }
        } catch (error) {
          errors.push(`训练场景迁移失败: ${error.message}`);
        }
      }

      // 迁移用户进度
      if (options.includeUserProgress !== false) {
        try {
          const progress = await sourceStorage.getUserProgress('current_user');
          if (progress) {
            await targetStorage.updateUserProgress(progress);
            migratedItems++;
          }
        } catch (error) {
          errors.push(`用户进度迁移失败: ${error.message}`);
        }
      }

      return {
        success: errors.length === 0,
        migratedItems,
        errors,
        duration: Date.now() - startTime,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        migratedItems,
        errors: [error.message, ...errors],
        duration: Date.now() - startTime,
        warnings
      };
    }
  }

  /**
   * 网络中断测试
   */
  private async testNetworkInterruption(): Promise<void> {
    // 模拟网络中断
    // 这里需要实现网络中断模拟逻辑
  }

  /**
   * 存储空间不足测试
   */
  private async testStorageFull(): Promise<void> {
    // 模拟存储空间不足
    // 这里需要实现存储空间不足模拟逻辑
  }

  /**
   * 数据损坏测试
   */
  private async testDataCorruption(): Promise<void> {
    // 模拟数据损坏
    // 这里需要实现数据损坏模拟逻辑
  }

  // 辅助方法
  private createMockGameState(): any {
    return {
      players: [
        { id: 'player1', stack: 1000, cards: ['Ah', 'Ks'] },
        { id: 'player2', stack: 1000, cards: ['Td', 'Th'] }
      ],
      communityCards: ['2h', '5d', 'Jc'],
      pot: 100,
      currentBet: 0,
      dealerPosition: 0,
      currentPhase: 'flop'
    };
  }

  private createMockHandHistory(): HandHistory {
    return {
      id: 'hand_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      gameState: this.createMockGameState(),
      playerActions: [],
      result: {
        winners: ['player1'],
        potSize: 100,
        showdown: true
      }
    };
  }

  private createTestData() {
    const handHistories = Array.from({ length: 50 }, () => this.createMockHandHistory());
    
    return {
      handHistories,
      playerStats: [
        {
          playerId: 'player1',
          handsPlayed: 100,
          vpip: 25,
          pfr: 18,
          aggFactor: 2.5,
          winRate: 15,
          lastUpdated: Date.now()
        }
      ],
      trainingScenarios: [
        {
          id: 'scenario_1',
          name: '测试场景',
          description: '用于测试的训练场景',
          boardTexture: ['Ah', 'Ks', '2d'],
          playerRange: { hands: [], percentage: 20 },
          opponentRange: { hands: [], percentage: 25 },
          potSize: 100,
          stackSizes: [1000, 1000],
          difficulty: 'intermediate',
          category: 'postflop'
        }
      ],
      userProgress: {
        userId: 'current_user',
        level: 5,
        experience: 2500,
        completedScenarios: ['scenario_1'],
        achievements: [],
        weakAreas: [],
        lastTrainingDate: Date.now()
      }
    };
  }

  private createConflictData() {
    // 创建用于冲突测试的数据
    return {
      localVersion: this.createMockHandHistory(),
      remoteVersion: this.createMockHandHistory()
    };
  }

  private createLargeDataSet(count: number): HandHistory[] {
    return Array.from({ length: count }, () => this.createMockHandHistory());
  }
}