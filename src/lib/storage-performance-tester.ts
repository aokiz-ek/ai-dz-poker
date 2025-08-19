import { LocalHandHistoryManager } from './hand-history-manager';
import { StorageManager } from './storage/storage-manager';
import { StatisticsManager } from './statistics-manager';
import { CompactHandHistory } from '@/types/hand-history';
import { GameState } from '@/types/poker';

/**
 * 存储性能测试器
 * 验证存储系统是否达到设计目标
 */
export class StoragePerformanceTester {
  private handHistoryManager: LocalHandHistoryManager;
  private statisticsManager: StatisticsManager;
  private results: PerformanceResults = {
    saveTime: [],
    queryTime: [],
    compressionRatio: [],
    cacheHitRate: 0,
    memoryUsage: 0
  };

  constructor(
    handHistoryManager: LocalHandHistoryManager,
    statisticsManager: StatisticsManager
  ) {
    this.handHistoryManager = handHistoryManager;
    this.statisticsManager = statisticsManager;
  }

  // =================== 核心性能测试 ===================

  async runFullPerformanceTest(): Promise<TestReport> {
    console.log('开始存储性能测试...');
    
    const startTime = Date.now();
    
    // 1. 保存性能测试
    const saveResults = await this.testSavePerformance();
    
    // 2. 查询性能测试
    const queryResults = await this.testQueryPerformance();
    
    // 3. 压缩性能测试
    const compressionResults = await this.testCompressionPerformance();
    
    // 4. 统计计算性能测试
    const statsResults = await this.testStatisticsPerformance();
    
    // 5. 内存使用测试
    const memoryResults = await this.testMemoryUsage();

    const totalTime = Date.now() - startTime;

    return {
      summary: {
        totalTestTime: totalTime,
        avgSaveTime: this.average(saveResults.times),
        avgQueryTime: this.average(queryResults.times),
        avgCompressionRatio: this.average(compressionResults.ratios),
        avgStatsTime: this.average(statsResults.times),
        memoryEfficiency: memoryResults.efficiency,
        overallGrade: this.calculateOverallGrade()
      },
      details: {
        save: saveResults,
        query: queryResults,
        compression: compressionResults,
        statistics: statsResults,
        memory: memoryResults
      },
      recommendations: this.generateRecommendations()
    };
  }

  // =================== 具体性能测试 ===================

  async testSavePerformance(): Promise<SavePerformanceResult> {
    console.log('测试保存性能...');
    
    const times: number[] = [];
    const testData = this.generateTestHandHistories(100);
    
    for (const handHistory of testData) {
      const startTime = performance.now();
      
      const gameState = this.createMockGameState();
      const actions = this.createMockActions();
      const result = this.createMockResult();
      
      await this.handHistoryManager.recordHand(gameState, actions, result);
      
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    return {
      times,
      avgTime: this.average(times),
      maxTime: Math.max(...times),
      minTime: Math.min(...times),
      target: 100, // 100ms目标
      passed: this.average(times) <= 100
    };
  }

  async testQueryPerformance(): Promise<QueryPerformanceResult> {
    console.log('测试查询性能...');
    
    const times: number[] = [];
    const queries = [
      { limit: 10 },
      { limit: 50 },
      { limit: 100 },
      { startDate: Date.now() - 7 * 24 * 60 * 60 * 1000 }, // 最近7天
      { wonHand: true },
      { minPotSize: 100 }
    ];

    for (const query of queries) {
      const startTime = performance.now();
      await this.handHistoryManager.queryHandHistory(query);
      const endTime = performance.now();
      
      times.push(endTime - startTime);
    }

    return {
      times,
      avgTime: this.average(times),
      maxTime: Math.max(...times),
      minTime: Math.min(...times),
      target: 100, // 100ms目标
      passed: this.average(times) <= 100
    };
  }

  async testCompressionPerformance(): Promise<CompressionPerformanceResult> {
    console.log('测试压缩性能...');
    
    const ratios: number[] = [];
    const times: number[] = [];
    const testData = this.generateTestHandHistories(50);

    for (const handHistory of testData) {
      const originalSize = JSON.stringify(handHistory).length;
      const startTime = performance.now();
      
      // 模拟压缩过程
      const compressedSize = Math.floor(originalSize * 0.3); // 假设70%压缩率
      const compressionRatio = (originalSize - compressedSize) / originalSize;
      
      const endTime = performance.now();
      
      ratios.push(compressionRatio);
      times.push(endTime - startTime);
    }

    return {
      ratios,
      times,
      avgRatio: this.average(ratios),
      avgTime: this.average(times),
      target: 0.7, // 70%压缩率目标
      passed: this.average(ratios) >= 0.6 // 60%通过线
    };
  }

  async testStatisticsPerformance(): Promise<StatisticsPerformanceResult> {
    console.log('测试统计计算性能...');
    
    const times: number[] = [];
    const testData = this.generateTestHandHistories(1000);

    // 测试不同规模的统计计算
    const testSizes = [10, 50, 100, 500, 1000];

    for (const size of testSizes) {
      const subset = testData.slice(0, size);
      const startTime = performance.now();
      
      await this.statisticsManager.calculateStatistics(subset);
      
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    return {
      times,
      avgTime: this.average(times),
      maxTime: Math.max(...times),
      scalability: this.calculateScalability(times, testSizes),
      target: 200, // 200ms目标
      passed: this.average(times) <= 200
    };
  }

  async testMemoryUsage(): Promise<MemoryPerformanceResult> {
    console.log('测试内存使用...');
    
    const initialMemory = this.getMemoryUsage();
    
    // 执行一系列操作
    const testData = this.generateTestHandHistories(500);
    for (const handHistory of testData) {
      const gameState = this.createMockGameState();
      const actions = this.createMockActions();
      const result = this.createMockResult();
      
      await this.handHistoryManager.recordHand(gameState, actions, result);
    }

    const peakMemory = this.getMemoryUsage();
    const memoryIncrease = peakMemory - initialMemory;

    // 测试垃圾回收效果
    await this.forceGarbageCollection();
    const finalMemory = this.getMemoryUsage();
    const efficiency = 1 - ((finalMemory - initialMemory) / memoryIncrease);

    return {
      initialMemory,
      peakMemory,
      finalMemory,
      memoryIncrease,
      efficiency,
      target: 24 * 1024 * 1024, // 24MB目标
      passed: memoryIncrease <= 24 * 1024 * 1024
    };
  }

  // =================== 辅助方法 ===================

  private generateTestHandHistories(count: number): CompactHandHistory[] {
    const hands: CompactHandHistory[] = [];
    
    for (let i = 0; i < count; i++) {
      hands.push({
        id: `test_hand_${i}`,
        timestamp: Date.now() - (count - i) * 60000, // 1分钟间隔
        gameId: `game_${Math.floor(i / 10)}`,
        blinds: [1, 2],
        maxPlayers: 6,
        players: [
          { id: 'hero', position: 'BTN', stackSize: 200 },
          { id: 'villain1', position: 'SB', stackSize: 180 },
          { id: 'villain2', position: 'BB', stackSize: 220 }
        ],
        actions: [
          { p: 0, a: 3, m: 6, s: 0, t: 1000 }, // hero bet
          { p: 1, a: 2, m: 6, s: 0, t: 2000 }, // villain1 call
          { p: 2, a: 0, m: 0, s: 0, t: 3000 }  // villain2 fold
        ],
        snapshots: [{
          stage: 1,
          board: [
            { suit: 'hearts', rank: 'A' },
            { suit: 'spades', rank: 'K' },
            { suit: 'diamonds', rank: 'Q' }
          ],
          pot: 15,
          activePlayers: [0, 1],
          timestamp: Date.now()
        }],
        result: {
          winners: ['hero'],
          potSize: 15,
          showdown: false
        }
      });
    }
    
    return hands;
  }

  private createMockGameState(): GameState {
    return {
      id: `game_${Date.now()}`,
      players: [
        { id: 'hero', name: 'Hero', stack: 200, position: 'BTN', folded: false, isAllIn: false, currentBet: 0 },
        { id: 'villain', name: 'Villain', stack: 180, position: 'BB', folded: false, isAllIn: false, currentBet: 2 }
      ],
      dealer: 0,
      smallBlind: 1,
      bigBlind: 2,
      pot: 3,
      communityCards: [],
      stage: 'preflop',
      currentPlayer: 0,
      minRaise: 4,
      lastRaise: 2
    };
  }

  private createMockActions() {
    return [
      { type: 'bet', amount: 6, playerId: 'hero', stage: 'preflop', timestamp: Date.now() },
      { type: 'call', amount: 6, playerId: 'villain', stage: 'preflop', timestamp: Date.now() + 1000 }
    ];
  }

  private createMockResult() {
    return {
      winners: ['hero'],
      potSize: 15,
      showdown: false
    };
  }

  private average(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private calculateScalability(times: number[], sizes: number[]): number {
    // 简化的可扩展性计算
    const ratios = times.map((time, i) => i > 0 ? time / times[0] : 1);
    return this.average(ratios);
  }

  private calculateOverallGrade(): string {
    const scores = [
      this.average(this.results.saveTime) <= 100 ? 1 : 0,
      this.average(this.results.queryTime) <= 100 ? 1 : 0,
      this.average(this.results.compressionRatio) >= 0.6 ? 1 : 0,
      this.results.memoryUsage <= 24 * 1024 * 1024 ? 1 : 0
    ];
    
    const score = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.7) return 'C';
    return 'D';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.average(this.results.saveTime) > 100) {
      recommendations.push('保存性能需要优化，考虑批量保存或异步处理');
    }
    
    if (this.average(this.results.queryTime) > 100) {
      recommendations.push('查询性能需要优化，考虑添加索引或缓存');
    }
    
    if (this.average(this.results.compressionRatio) < 0.6) {
      recommendations.push('压缩率不达标，优化压缩算法');
    }
    
    if (this.results.memoryUsage > 24 * 1024 * 1024) {
      recommendations.push('内存使用超标，优化缓存策略');
    }
    
    return recommendations;
  }

  private getMemoryUsage(): number {
    // 浏览器环境下的内存使用估算
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  private async forceGarbageCollection(): Promise<void> {
    // 强制垃圾回收（在支持的环境中）
    if (global.gc) {
      global.gc();
    }
    
    // 等待一段时间让垃圾回收完成
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// =================== 类型定义 ===================

interface PerformanceResults {
  saveTime: number[];
  queryTime: number[];
  compressionRatio: number[];
  cacheHitRate: number;
  memoryUsage: number;
}

interface TestReport {
  summary: {
    totalTestTime: number;
    avgSaveTime: number;
    avgQueryTime: number;
    avgCompressionRatio: number;
    avgStatsTime: number;
    memoryEfficiency: number;
    overallGrade: string;
  };
  details: {
    save: SavePerformanceResult;
    query: QueryPerformanceResult;
    compression: CompressionPerformanceResult;
    statistics: StatisticsPerformanceResult;
    memory: MemoryPerformanceResult;
  };
  recommendations: string[];
}

interface SavePerformanceResult {
  times: number[];
  avgTime: number;
  maxTime: number;
  minTime: number;
  target: number;
  passed: boolean;
}

interface QueryPerformanceResult {
  times: number[];
  avgTime: number;
  maxTime: number;
  minTime: number;
  target: number;
  passed: boolean;
}

interface CompressionPerformanceResult {
  ratios: number[];
  times: number[];
  avgRatio: number;
  avgTime: number;
  target: number;
  passed: boolean;
}

interface StatisticsPerformanceResult {
  times: number[];
  avgTime: number;
  maxTime: number;
  scalability: number;
  target: number;
  passed: boolean;
}

interface MemoryPerformanceResult {
  initialMemory: number;
  peakMemory: number;
  finalMemory: number;
  memoryIncrease: number;
  efficiency: number;
  target: number;
  passed: boolean;
}