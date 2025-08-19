import { StorageManager } from './storage/storage-manager';
import { LocalHandHistoryManager } from './hand-history-manager';
import { StatisticsManager } from './statistics-manager';
import { DynamicScenarioGenerator } from './dynamic-scenario-generator';
import { LearningPathManager } from './learning-path-manager';
import { StoragePerformanceTester } from './storage-performance-tester';
import { GameState } from '@/types/poker';

/**
 * 系统集成测试器
 * 确保Phase 2.2的所有模块能够无缝协作
 */
export class SystemIntegrationTester {
  private storageManager: StorageManager;
  private handHistoryManager: LocalHandHistoryManager;
  private statisticsManager: StatisticsManager;
  private scenarioGenerator: DynamicScenarioGenerator;
  private learningPathManager: LearningPathManager;
  private performanceTester: StoragePerformanceTester;

  constructor() {
    this.initializeComponents();
  }

  // =================== 完整集成测试 ===================

  async runFullIntegrationTest(): Promise<IntegrationTestResult> {
    console.log('开始Phase 2.2系统集成测试...');
    
    const results: IntegrationTestResult = {
      overall: 'pending',
      modules: {},
      integrations: {},
      performance: {} as any,
      issues: [],
      recommendations: []
    };

    try {
      // 1. 模块独立测试
      results.modules = await this.testIndividualModules();
      
      // 2. 模块间集成测试
      results.integrations = await this.testModuleIntegrations();
      
      // 3. 端到端流程测试
      const e2eResults = await this.testEndToEndWorkflows();
      results.integrations.endToEnd = e2eResults;
      
      // 4. 性能集成测试
      results.performance = await this.testIntegratedPerformance();
      
      // 5. 数据一致性测试
      const consistencyResults = await this.testDataConsistency();
      results.integrations.dataConsistency = consistencyResults;

      // 计算总体结果
      results.overall = this.calculateOverallResult(results);
      results.recommendations = this.generateRecommendations(results);

    } catch (error) {
      results.overall = 'failed';
      results.issues.push({
        severity: 'critical',
        module: 'integration',
        description: `Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        impact: 'System unusable'
      });
    }

    return results;
  }

  // =================== 模块独立测试 ===================

  private async testIndividualModules(): Promise<ModuleTestResults> {
    const results: ModuleTestResults = {};

    // 测试存储管理器
    results.storageManager = await this.testStorageManager();
    
    // 测试手牌历史管理器
    results.handHistoryManager = await this.testHandHistoryManager();
    
    // 测试统计管理器
    results.statisticsManager = await this.testStatisticsManager();
    
    // 测试动态场景生成器
    results.scenarioGenerator = await this.testScenarioGenerator();
    
    // 测试学习路径管理器
    results.learningPathManager = await this.testLearningPathManager();

    return results;
  }

  private async testStorageManager(): Promise<ModuleTestResult> {
    try {
      await this.storageManager.initialize();
      
      // 测试基本CRUD操作
      await this.storageManager.set('test_key', { test: 'data' });
      const retrieved = await this.storageManager.get('test_key');
      
      if (!retrieved || retrieved.test !== 'data') {
        throw new Error('Storage CRUD operation failed');
      }
      
      // 测试存储状态
      const usage = await this.storageManager.getStorageUsage();
      if (usage.total <= 0) {
        throw new Error('Storage usage reporting failed');
      }

      return { status: 'passed', issues: [] };
      
    } catch (error) {
      return {
        status: 'failed',
        issues: [{
          severity: 'high',
          description: `Storage manager test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  private async testHandHistoryManager(): Promise<ModuleTestResult> {
    try {
      // 创建测试用手牌历史
      const mockGameState = this.createMockGameState();
      const mockActions = this.createMockActions();
      const mockResult = this.createMockResult();

      // 测试记录手牌
      const handHistory = await this.handHistoryManager.recordHand(mockGameState, mockActions, mockResult);
      
      // 测试查询手牌
      const retrieved = await this.handHistoryManager.getHandHistory(handHistory.id);
      if (!retrieved) {
        throw new Error('Hand history retrieval failed');
      }

      // 测试查询功能
      const queryResult = await this.handHistoryManager.queryHandHistory({ limit: 1 });
      if (queryResult.hands.length === 0) {
        throw new Error('Hand history query failed');
      }

      return { status: 'passed', issues: [] };
      
    } catch (error) {
      return {
        status: 'failed',
        issues: [{
          severity: 'high',
          description: `Hand history manager test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  private async testStatisticsManager(): Promise<ModuleTestResult> {
    try {
      // 使用之前记录的手牌历史进行统计测试
      const { hands } = await this.handHistoryManager.queryHandHistory({ limit: 10 });
      
      if (hands.length === 0) {
        // 创建一些测试数据
        for (let i = 0; i < 5; i++) {
          const mockGameState = this.createMockGameState();
          const mockActions = this.createMockActions();
          const mockResult = this.createMockResult();
          await this.handHistoryManager.recordHand(mockGameState, mockActions, mockResult);
        }
        
        const { hands: newHands } = await this.handHistoryManager.queryHandHistory({ limit: 10 });
        if (newHands.length === 0) {
          throw new Error('Unable to create test data for statistics');
        }
      }

      // 测试统计计算
      const statistics = await this.statisticsManager.calculateStatistics(hands, 'hero');
      
      if (!statistics.basicStats) {
        throw new Error('Basic statistics calculation failed');
      }

      return { status: 'passed', issues: [] };
      
    } catch (error) {
      return {
        status: 'failed',
        issues: [{
          severity: 'medium',
          description: `Statistics manager test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  private async testScenarioGenerator(): Promise<ModuleTestResult> {
    try {
      // 测试场景生成
      const scenarios = await this.scenarioGenerator.generateScenariosByType(
        'preflop_positioning', 'intermediate', 2
      );
      
      if (scenarios.length === 0) {
        throw new Error('Scenario generation failed');
      }

      // 验证场景结构
      const scenario = scenarios[0];
      if (!scenario.id || !scenario.name || !scenario.gameSettings) {
        throw new Error('Generated scenario structure invalid');
      }

      return { status: 'passed', issues: [] };
      
    } catch (error) {
      return {
        status: 'failed',
        issues: [{
          severity: 'medium',
          description: `Scenario generator test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  private async testLearningPathManager(): Promise<ModuleTestResult> {
    try {
      // 创建模拟用户进度和统计数据
      const mockProgress = this.createMockUserProgress();
      const mockStats = this.createMockStatistics();

      // 测试场景推荐
      const recommendation = await this.learningPathManager.recommendNextScenario(mockProgress, mockStats);
      
      if (!recommendation.scenario || !recommendation.reasoning) {
        throw new Error('Scenario recommendation failed');
      }

      return { status: 'passed', issues: [] };
      
    } catch (error) {
      return {
        status: 'failed',
        issues: [{
          severity: 'medium',
          description: `Learning path manager test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  // =================== 模块间集成测试 ===================

  private async testModuleIntegrations(): Promise<IntegrationTestResults> {
    const results: IntegrationTestResults = {};

    // 测试存储与手牌历史集成
    results.storageToHistory = await this.testStorageHistoryIntegration();
    
    // 测试手牌历史与统计集成
    results.historyToStats = await this.testHistoryStatsIntegration();
    
    // 测试统计与场景生成集成
    results.statsToScenarios = await this.testStatsScenarioIntegration();
    
    // 测试场景生成与学习路径集成
    results.scenariosToLearning = await this.testScenarioLearningIntegration();

    return results;
  }

  private async testStorageHistoryIntegration(): Promise<IntegrationResult> {
    try {
      // 测试数据从存储到手牌历史的完整流程
      const gameState = this.createMockGameState();
      const actions = this.createMockActions();
      const result = this.createMockResult();

      // 记录手牌，这应该触发存储操作
      const handHistory = await this.handHistoryManager.recordHand(gameState, actions, result);
      
      // 验证数据确实存储了
      const stored = await this.storageManager.get(`hand:${handHistory.id}`);
      if (!stored) {
        throw new Error('Hand history not properly stored');
      }

      // 验证可以通过历史管理器检索
      const retrieved = await this.handHistoryManager.getHandHistory(handHistory.id);
      if (!retrieved) {
        throw new Error('Hand history not retrievable through manager');
      }

      return { success: true, message: 'Storage-History integration working' };
      
    } catch (error) {
      return { 
        success: false, 
        message: `Storage-History integration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private async testHistoryStatsIntegration(): Promise<IntegrationResult> {
    try {
      // 获取手牌历史数据
      const { hands } = await this.handHistoryManager.queryHandHistory({ limit: 5 });
      
      if (hands.length === 0) {
        return { success: false, message: 'No hand history data available for stats integration test' };
      }

      // 使用手牌历史计算统计
      const stats = await this.statisticsManager.calculateStatistics(hands, 'hero');
      
      if (!stats || !stats.basicStats) {
        throw new Error('Statistics calculation from hand history failed');
      }

      return { success: true, message: 'History-Stats integration working' };
      
    } catch (error) {
      return { 
        success: false, 
        message: `History-Stats integration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private async testStatsScenarioIntegration(): Promise<IntegrationResult> {
    try {
      // 获取统计数据
      const { hands } = await this.handHistoryManager.queryHandHistory({ limit: 5 });
      const stats = await this.statisticsManager.calculateStatistics(hands, 'hero');
      
      // 使用统计数据生成个性化场景
      const scenarios = await this.scenarioGenerator.generatePersonalizedScenarios(stats, 3);
      
      if (scenarios.length === 0) {
        throw new Error('No personalized scenarios generated from statistics');
      }

      return { success: true, message: 'Stats-Scenarios integration working' };
      
    } catch (error) {
      return { 
        success: false, 
        message: `Stats-Scenarios integration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private async testScenarioLearningIntegration(): Promise<IntegrationResult> {
    try {
      const mockProgress = this.createMockUserProgress();
      const mockStats = this.createMockStatistics();

      // 测试学习路径生成
      const learningPath = await this.learningPathManager.generateLearningPath(mockProgress, mockStats, 14);
      
      if (!learningPath || learningPath.phases.length === 0) {
        throw new Error('Learning path generation failed');
      }

      // 测试场景推荐
      const recommendation = await this.learningPathManager.recommendNextScenario(mockProgress, mockStats);
      
      if (!recommendation.scenario) {
        throw new Error('Scenario recommendation failed');
      }

      return { success: true, message: 'Scenarios-Learning integration working' };
      
    } catch (error) {
      return { 
        success: false, 
        message: `Scenarios-Learning integration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // =================== 端到端工作流测试 ===================

  private async testEndToEndWorkflows(): Promise<IntegrationResult> {
    try {
      // 完整的用户学习流程测试
      console.log('Testing complete user learning workflow...');

      // 1. 用户开始训练，系统记录手牌历史
      const gameState = this.createMockGameState();
      const actions = this.createMockActions();
      const result = this.createMockResult();
      
      const handHistory = await this.handHistoryManager.recordHand(gameState, actions, result);
      
      // 2. 系统基于历史计算统计
      const { hands } = await this.handHistoryManager.queryHandHistory({ limit: 10 });
      const statistics = await this.statisticsManager.calculateStatistics(hands, 'hero');
      
      // 3. 系统推荐个性化场景
      const userProgress = this.createMockUserProgress();
      const recommendation = await this.learningPathManager.recommendNextScenario(userProgress, statistics);
      
      // 4. 验证整个流程完整性
      if (!handHistory.id || !statistics.basicStats || !recommendation.scenario) {
        throw new Error('End-to-end workflow incomplete');
      }

      return { success: true, message: 'End-to-end workflow test passed' };
      
    } catch (error) {
      return { 
        success: false, 
        message: `End-to-end workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // =================== 性能集成测试 ===================

  private async testIntegratedPerformance(): Promise<PerformanceTestResult> {
    try {
      const performanceResult = await this.performanceTester.runFullPerformanceTest();
      
      return {
        passed: performanceResult.summary.overallGrade !== 'D',
        metrics: {
          averageResponseTime: performanceResult.summary.avgQueryTime,
          memoryUsage: performanceResult.summary.memoryEfficiency,
          compressionRatio: performanceResult.summary.avgCompressionRatio,
          overallScore: performanceResult.summary.overallGrade
        },
        issues: performanceResult.recommendations
      };
      
    } catch (error) {
      return {
        passed: false,
        metrics: {
          averageResponseTime: -1,
          memoryUsage: -1,
          compressionRatio: -1,
          overallScore: 'F'
        },
        issues: [`Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  // =================== 数据一致性测试 ===================

  private async testDataConsistency(): Promise<IntegrationResult> {
    try {
      // 创建多个手牌历史记录
      const handHistories = [];
      for (let i = 0; i < 5; i++) {
        const gameState = this.createMockGameState();
        const actions = this.createMockActions();
        const result = this.createMockResult();
        const handHistory = await this.handHistoryManager.recordHand(gameState, actions, result);
        handHistories.push(handHistory);
      }

      // 验证数据在不同组件间的一致性
      for (const handHistory of handHistories) {
        // 通过存储管理器直接获取
        const directData = await this.storageManager.get(`hand:${handHistory.id}`);
        
        // 通过手牌历史管理器获取
        const managerData = await this.handHistoryManager.getHandHistory(handHistory.id);
        
        if (!directData || !managerData) {
          throw new Error(`Data consistency check failed for hand ${handHistory.id}`);
        }
      }

      return { success: true, message: 'Data consistency check passed' };
      
    } catch (error) {
      return { 
        success: false, 
        message: `Data consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // =================== 辅助方法 ===================

  private initializeComponents(): void {
    this.storageManager = new StorageManager();
    this.handHistoryManager = new LocalHandHistoryManager(this.storageManager);
    this.statisticsManager = new StatisticsManager();
    this.scenarioGenerator = new DynamicScenarioGenerator();
    this.learningPathManager = new LearningPathManager();
    this.performanceTester = new StoragePerformanceTester(this.handHistoryManager, this.statisticsManager);
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

  private createMockActions(): any[] {
    return [
      { type: 'bet', amount: 6, playerId: 'hero', stage: 'preflop', timestamp: Date.now() },
      { type: 'call', amount: 6, playerId: 'villain', stage: 'preflop', timestamp: Date.now() + 1000 }
    ];
  }

  private createMockResult(): any {
    return {
      winners: ['hero'],
      potSize: 15,
      showdown: false
    };
  }

  private createMockUserProgress(): any {
    return {
      userId: 'test_user',
      level: 5,
      experience: 1000,
      completedScenarios: ['scenario1', 'scenario2'],
      achievements: [],
      weakAreas: ['postflop'],
      lastTrainingDate: Date.now()
    };
  }

  private createMockStatistics(): any {
    return {
      timeRange: { start: Date.now() - 86400000, end: Date.now(), totalHands: 100 },
      basicStats: { handsPlayed: 100, handsWon: 55, winRate: 0.55, totalProfit: 150, hourlyRate: 25, avgPotSize: 20 },
      positionalStats: new Map(),
      stageStats: {},
      opponentStats: [],
      trends: { winRateTrend: [], profitTrend: [], scoreTrend: [] }
    };
  }

  private calculateOverallResult(results: IntegrationTestResult): 'passed' | 'failed' | 'warning' {
    const moduleFailures = Object.values(results.modules).filter(m => m.status === 'failed').length;
    const integrationFailures = Object.values(results.integrations).filter(i => !i.success).length;
    
    if (moduleFailures > 0 || integrationFailures > 0) {
      return moduleFailures > 2 || integrationFailures > 2 ? 'failed' : 'warning';
    }
    
    return 'passed';
  }

  private generateRecommendations(results: IntegrationTestResult): string[] {
    const recommendations: string[] = [];
    
    if (results.overall === 'failed') {
      recommendations.push('Critical issues found - system requires fixes before deployment');
    }
    
    if (results.performance && !results.performance.passed) {
      recommendations.push('Performance optimization needed');
    }
    
    if (results.issues.length > 0) {
      recommendations.push('Address identified issues before production release');
    }
    
    return recommendations;
  }
}

// =================== 类型定义 ===================

interface IntegrationTestResult {
  overall: 'passed' | 'failed' | 'warning' | 'pending';
  modules: ModuleTestResults;
  integrations: IntegrationTestResults;
  performance: PerformanceTestResult;
  issues: TestIssue[];
  recommendations: string[];
}

interface ModuleTestResults {
  [moduleName: string]: ModuleTestResult;
}

interface ModuleTestResult {
  status: 'passed' | 'failed' | 'warning';
  issues: TestIssue[];
}

interface IntegrationTestResults {
  [integrationName: string]: IntegrationResult;
}

interface IntegrationResult {
  success: boolean;
  message: string;
}

interface PerformanceTestResult {
  passed: boolean;
  metrics: {
    averageResponseTime: number;
    memoryUsage: number;
    compressionRatio: number;
    overallScore: string;
  };
  issues: string[];
}

interface TestIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  module?: string;
  description: string;
  impact?: string;
}

export default SystemIntegrationTester;