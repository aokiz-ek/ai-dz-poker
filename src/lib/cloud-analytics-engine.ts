/**
 * 云端数据分析引擎 - Week 15核心功能
 * 
 * 功能特性：
 * 1. 用户行为数据收集和分析
 * 2. 性能指标监控和分析
 * 3. 游戏数据深度挖掘
 * 4. 实时数据流处理
 * 5. 预测性分析
 * 6. 自定义数据报告生成
 */

import { CloudAdapter } from './storage/cloud-adapter';
import { HandHistory, PlayerStats } from './storage/interfaces';

export interface UserBehaviorEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: 'page_view' | 'action' | 'training' | 'error' | 'performance';
  eventName: string;
  timestamp: number;
  properties: Record<string, any>;
  context: {
    userAgent: string;
    platform: string;
    screen: { width: number; height: number };
    timezone: string;
  };
}

export interface PerformanceMetrics {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: number;
  metrics: {
    // 页面性能
    pageLoadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    
    // 交互性能
    firstInputDelay: number;
    totalBlockingTime: number;
    cumulativeLayoutShift: number;
    
    // 内存使用
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    
    // 网络性能
    connectionType: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

export interface GameAnalytics {
  id: string;
  userId: string;
  gameType: string;
  timestamp: number;
  analytics: {
    // 游戏表现
    totalHands: number;
    winRate: number;
    vpip: number;
    pfr: number;
    aggressionFactor: number;
    
    // 学习进度
    trainingHours: number;
    completedScenarios: number;
    averageScore: number;
    improvementRate: number;
    
    // 技能分析
    skillLevels: {
      preflop: number;
      postflop: number;
      reading: number;
      bankroll: number;
    };
    
    // 错误分析
    commonMistakes: string[];
    improvementAreas: string[];
  };
}

export interface DataInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  data: any;
  timestamp: number;
  relevantPeriod: {
    start: number;
    end: number;
  };
}

export interface AnalyticsQuery {
  dimension: string;
  metrics: string[];
  filters?: Record<string, any>;
  timeRange: {
    start: number;
    end: number;
  };
  groupBy?: string[];
  orderBy?: string;
  limit?: number;
}

export interface AnalyticsResult {
  query: AnalyticsQuery;
  data: any[];
  summary: {
    totalRecords: number;
    timeRange: { start: number; end: number };
    aggregations: Record<string, number>;
  };
  insights: DataInsight[];
  executionTime: number;
}

export class CloudAnalyticsEngine {
  private cloudAdapter: CloudAdapter;
  private sessionId: string;
  private userId: string;
  private eventQueue: UserBehaviorEvent[] = [];
  private performanceQueue: PerformanceMetrics[] = [];
  private batchTimer?: NodeJS.Timeout;
  private performanceObserver?: PerformanceObserver;

  constructor(cloudAdapter: CloudAdapter, userId: string) {
    this.cloudAdapter = cloudAdapter;
    this.userId = userId;
    this.sessionId = this.generateSessionId();
    
    this.setupPerformanceMonitoring();
    this.setupBatchProcessing();
  }

  /**
   * 初始化分析引擎
   */
  async initialize(): Promise<void> {
    console.log('🔄 初始化云端数据分析引擎...');
    
    try {
      // 记录会话开始事件
      await this.trackEvent('session_start', {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: {
          width: screen.width,
          height: screen.height
        }
      });
      
      // 收集初始性能数据
      this.collectInitialPerformanceMetrics();
      
      console.log('✅ 云端数据分析引擎初始化完成');
    } catch (error) {
      console.error('❌ 分析引擎初始化失败:', error);
      throw error;
    }
  }

  /**
   * 追踪用户行为事件
   */
  async trackEvent(eventName: string, properties: Record<string, any> = {}): Promise<void> {
    const event: UserBehaviorEvent = {
      id: this.generateEventId(),
      userId: this.userId,
      sessionId: this.sessionId,
      eventType: this.categorizeEvent(eventName),
      eventName,
      timestamp: Date.now(),
      properties,
      context: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screen: {
          width: screen.width,
          height: screen.height
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    // 添加到队列，批量处理
    this.eventQueue.push(event);
    
    // 对于重要事件，立即发送
    if (this.isCriticalEvent(eventName)) {
      await this.flushEventQueue();
    }
  }

  /**
   * 追踪游戏数据
   */
  async trackGameData(handHistory: HandHistory): Promise<void> {
    try {
      // 基础游戏事件
      await this.trackEvent('game_hand_completed', {
        handId: handHistory.id,
        gameType: handHistory.gameType,
        stakes: handHistory.stakes,
        position: handHistory.position,
        outcome: handHistory.winAmount > 0 ? 'win' : 'loss',
        winAmount: handHistory.winAmount,
        duration: handHistory.duration
      });

      // 生成游戏分析数据
      const gameAnalytics = await this.generateGameAnalytics(handHistory);
      await this.saveGameAnalytics(gameAnalytics);
      
    } catch (error) {
      console.error('游戏数据追踪失败:', error);
    }
  }

  /**
   * 追踪训练数据
   */
  async trackTrainingSession(scenarioId: string, score: number, duration: number): Promise<void> {
    await this.trackEvent('training_session_completed', {
      scenarioId,
      score,
      duration,
      timestamp: Date.now()
    });

    // 分析训练表现趋势
    const trainingTrend = await this.analyzeTrainingTrend();
    if (trainingTrend) {
      await this.saveInsight(trainingTrend);
    }
  }

  /**
   * 执行数据查询
   */
  async query(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = Date.now();
    
    try {
      console.log('📊 执行数据分析查询:', query);
      
      // 构建查询条件
      const filters = this.buildQueryFilters(query);
      
      // 执行查询
      const rawData = await this.executeQuery(query, filters);
      
      // 数据聚合和处理
      const processedData = this.processQueryData(rawData, query);
      
      // 生成洞察
      const insights = await this.generateInsights(processedData, query);
      
      const result: AnalyticsResult = {
        query,
        data: processedData,
        summary: {
          totalRecords: rawData.length,
          timeRange: query.timeRange,
          aggregations: this.calculateAggregations(processedData, query.metrics)
        },
        insights,
        executionTime: Date.now() - startTime
      };
      
      console.log('✅ 查询完成, 耗时:', result.executionTime + 'ms');
      return result;
    } catch (error) {
      console.error('❌ 查询执行失败:', error);
      throw error;
    }
  }

  /**
   * 生成用户报告
   */
  async generateUserReport(timeRange: { start: number; end: number }): Promise<any> {
    console.log('📈 生成用户分析报告...');
    
    try {
      // 并行执行多个查询
      const [
        behaviorData,
        performanceData,
        gameData,
        trainingData
      ] = await Promise.all([
        this.getUserBehaviorData(timeRange),
        this.getPerformanceData(timeRange),
        this.getGameData(timeRange),
        this.getTrainingData(timeRange)
      ]);

      // 生成综合报告
      const report = {
        userId: this.userId,
        timeRange,
        generatedAt: Date.now(),
        
        // 用户行为分析
        behavior: {
          totalSessions: behaviorData.sessions,
          averageSessionDuration: behaviorData.avgDuration,
          mostUsedFeatures: behaviorData.topFeatures,
          userJourney: behaviorData.journey
        },
        
        // 性能分析
        performance: {
          averageLoadTime: performanceData.avgLoadTime,
          performanceScore: this.calculatePerformanceScore(performanceData),
          issues: performanceData.issues
        },
        
        // 游戏表现分析
        gaming: {
          totalHands: gameData.totalHands,
          winRate: gameData.winRate,
          improvement: gameData.improvementTrend,
          skillBreakdown: gameData.skills
        },
        
        // 训练分析
        training: {
          hoursSpent: trainingData.totalHours,
          scenariosCompleted: trainingData.completedScenarios,
          averageScore: trainingData.avgScore,
          progressTrend: trainingData.progressTrend
        },
        
        // 个性化建议
        recommendations: await this.generateRecommendations({
          behaviorData,
          performanceData,
          gameData,
          trainingData
        })
      };
      
      // 保存报告
      await this.saveUserReport(report);
      
      console.log('✅ 用户报告生成完成');
      return report;
    } catch (error) {
      console.error('❌ 报告生成失败:', error);
      throw error;
    }
  }

  /**
   * 实时数据监控
   */
  async startRealtimeMonitoring(): Promise<void> {
    // 监控关键指标
    setInterval(async () => {
      try {
        const metrics = await this.collectRealtimeMetrics();
        await this.processRealtimeMetrics(metrics);
      } catch (error) {
        console.error('实时监控错误:', error);
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 异常检测
   */
  async detectAnomalies(): Promise<DataInsight[]> {
    const insights: DataInsight[] = [];
    
    try {
      // 检测性能异常
      const performanceAnomalies = await this.detectPerformanceAnomalies();
      insights.push(...performanceAnomalies);
      
      // 检测行为异常
      const behaviorAnomalies = await this.detectBehaviorAnomalies();
      insights.push(...behaviorAnomalies);
      
      // 检测游戏表现异常
      const gameAnomalies = await this.detectGameAnomalies();
      insights.push(...gameAnomalies);
      
    } catch (error) {
      console.error('异常检测失败:', error);
    }
    
    return insights;
  }

  // =================== 私有方法 ===================

  /**
   * 设置性能监控
   */
  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.collectPerformanceEntry(entry);
        });
      });

      // 监控各种性能指标
      try {
        this.performanceObserver.observe({ entryTypes: ['navigation', 'measure', 'paint'] });
      } catch (error) {
        console.warn('性能监控设置失败:', error);
      }
    }
  }

  /**
   * 设置批量处理
   */
  private setupBatchProcessing(): void {
    this.batchTimer = setInterval(async () => {
      if (this.eventQueue.length > 0 || this.performanceQueue.length > 0) {
        await this.flushQueues();
      }
    }, 10000); // 每10秒批量发送一次
  }

  /**
   * 分类事件类型
   */
  private categorizeEvent(eventName: string): UserBehaviorEvent['eventType'] {
    if (eventName.includes('page') || eventName.includes('view')) {
      return 'page_view';
    } else if (eventName.includes('training') || eventName.includes('scenario')) {
      return 'training';
    } else if (eventName.includes('error') || eventName.includes('fail')) {
      return 'error';
    } else if (eventName.includes('performance') || eventName.includes('load')) {
      return 'performance';
    } else {
      return 'action';
    }
  }

  /**
   * 判断是否为关键事件
   */
  private isCriticalEvent(eventName: string): boolean {
    const criticalEvents = [
      'session_start',
      'session_end',
      'error',
      'crash',
      'payment',
      'registration'
    ];
    
    return criticalEvents.some(critical => eventName.includes(critical));
  }

  /**
   * 收集初始性能指标
   */
  private collectInitialPerformanceMetrics(): void {
    if (performance.timing) {
      const timing = performance.timing;
      const navigation = performance.navigation;
      
      const metrics: PerformanceMetrics = {
        id: this.generateEventId(),
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        metrics: {
          pageLoadTime: timing.loadEventEnd - timing.navigationStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          firstContentfulPaint: 0, // 将通过 PerformanceObserver 获取
          largestContentfulPaint: 0,
          firstInputDelay: 0,
          totalBlockingTime: 0,
          cumulativeLayoutShift: 0,
          usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
          totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0,
          jsHeapSizeLimit: (performance as any).memory?.jsHeapSizeLimit || 0,
          connectionType: (navigator as any).connection?.type || 'unknown',
          effectiveType: (navigator as any).connection?.effectiveType || 'unknown',
          downlink: (navigator as any).connection?.downlink || 0,
          rtt: (navigator as any).connection?.rtt || 0
        }
      };
      
      this.performanceQueue.push(metrics);
    }
  }

  /**
   * 收集性能条目
   */
  private collectPerformanceEntry(entry: PerformanceEntry): void {
    // 根据不同类型的性能条目进行处理
    if (entry.entryType === 'paint') {
      // 处理绘制性能
    } else if (entry.entryType === 'navigation') {
      // 处理导航性能
    }
    // 可以根据需要扩展其他类型
  }

  /**
   * 生成游戏分析数据
   */
  private async generateGameAnalytics(handHistory: HandHistory): Promise<GameAnalytics> {
    // 获取历史数据进行对比分析
    const recentHands = await this.getRecentHandHistory(50);
    
    return {
      id: this.generateEventId(),
      userId: this.userId,
      gameType: handHistory.gameType,
      timestamp: Date.now(),
      analytics: {
        totalHands: recentHands.length + 1,
        winRate: this.calculateWinRate(recentHands),
        vpip: this.calculateVPIP(recentHands),
        pfr: this.calculatePFR(recentHands),
        aggressionFactor: this.calculateAggressionFactor(recentHands),
        trainingHours: await this.getTrainingHours(),
        completedScenarios: await this.getCompletedScenarios(),
        averageScore: await this.getAverageScore(),
        improvementRate: this.calculateImprovementRate(recentHands),
        skillLevels: await this.calculateSkillLevels(recentHands),
        commonMistakes: this.identifyCommonMistakes(recentHands),
        improvementAreas: this.identifyImprovementAreas(recentHands)
      }
    };
  }

  /**
   * 构建查询过滤器
   */
  private buildQueryFilters(query: AnalyticsQuery): Record<string, any> {
    const filters: Record<string, any> = {
      userId: this.userId,
      timestamp: {
        $gte: query.timeRange.start,
        $lte: query.timeRange.end
      }
    };

    if (query.filters) {
      Object.assign(filters, query.filters);
    }

    return filters;
  }

  /**
   * 执行查询
   */
  private async executeQuery(query: AnalyticsQuery, filters: Record<string, any>): Promise<any[]> {
    const collection = this.getCollectionName(query.dimension);
    
    const result = await this.cloudAdapter.cloudQuery(collection, {
      filters,
      sortBy: query.orderBy || 'timestamp',
      sortOrder: 'desc',
      limit: query.limit || 1000
    });
    
    return result.data;
  }

  /**
   * 处理查询数据
   */
  private processQueryData(data: any[], query: AnalyticsQuery): any[] {
    let processedData = data;

    // 应用分组
    if (query.groupBy && query.groupBy.length > 0) {
      processedData = this.groupData(processedData, query.groupBy);
    }

    // 应用聚合
    if (query.metrics && query.metrics.length > 0) {
      processedData = this.aggregateData(processedData, query.metrics);
    }

    return processedData;
  }

  /**
   * 生成洞察
   */
  private async generateInsights(data: any[], query: AnalyticsQuery): Promise<DataInsight[]> {
    const insights: DataInsight[] = [];
    
    // 趋势分析
    const trendInsight = this.analyzeTrend(data);
    if (trendInsight) {
      insights.push(trendInsight);
    }
    
    // 异常检测
    const anomalies = this.detectDataAnomalies(data);
    insights.push(...anomalies);
    
    return insights;
  }

  /**
   * 刷新事件队列
   */
  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];
      
      await this.cloudAdapter.cloudBatchSet(
        events.map(event => ({
          key: `user_event_${event.id}`,
          data: event
        }))
      );
    } catch (error) {
      console.error('事件队列刷新失败:', error);
      // 重新加入队列
      // this.eventQueue.unshift(...events);
    }
  }

  /**
   * 刷新所有队列
   */
  private async flushQueues(): Promise<void> {
    await Promise.all([
      this.flushEventQueue(),
      this.flushPerformanceQueue()
    ]);
  }

  /**
   * 刷新性能队列
   */
  private async flushPerformanceQueue(): Promise<void> {
    if (this.performanceQueue.length === 0) return;
    
    try {
      const metrics = [...this.performanceQueue];
      this.performanceQueue = [];
      
      await this.cloudAdapter.cloudBatchSet(
        metrics.map(metric => ({
          key: `performance_metric_${metric.id}`,
          data: metric
        }))
      );
    } catch (error) {
      console.error('性能队列刷新失败:', error);
    }
  }

  // =================== 工具方法 ===================

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCollectionName(dimension: string): string {
    const mapping: Record<string, string> = {
      'user_behavior': 'user_events',
      'performance': 'performance_metrics',
      'game': 'game_analytics',
      'training': 'training_analytics'
    };
    
    return mapping[dimension] || dimension;
  }

  // 这些方法需要根据具体的数据结构来实现
  private calculateWinRate(hands: HandHistory[]): number { return 0; }
  private calculateVPIP(hands: HandHistory[]): number { return 0; }
  private calculatePFR(hands: HandHistory[]): number { return 0; }
  private calculateAggressionFactor(hands: HandHistory[]): number { return 0; }
  private calculateImprovementRate(hands: HandHistory[]): number { return 0; }
  private async calculateSkillLevels(hands: HandHistory[]): Promise<any> { return {}; }
  private identifyCommonMistakes(hands: HandHistory[]): string[] { return []; }
  private identifyImprovementAreas(hands: HandHistory[]): string[] { return []; }
  
  private async getRecentHandHistory(limit: number): Promise<HandHistory[]> { return []; }
  private async getTrainingHours(): Promise<number> { return 0; }
  private async getCompletedScenarios(): Promise<number> { return 0; }
  private async getAverageScore(): Promise<number> { return 0; }
  
  private groupData(data: any[], groupBy: string[]): any[] { return data; }
  private aggregateData(data: any[], metrics: string[]): any[] { return data; }
  private calculateAggregations(data: any[], metrics: string[]): Record<string, number> { return {}; }
  
  private analyzeTrend(data: any[]): DataInsight | null { return null; }
  private detectDataAnomalies(data: any[]): DataInsight[] { return []; }
  
  private async getUserBehaviorData(timeRange: any): Promise<any> { return {}; }
  private async getPerformanceData(timeRange: any): Promise<any> { return {}; }
  private async getGameData(timeRange: any): Promise<any> { return {}; }
  private async getTrainingData(timeRange: any): Promise<any> { return {}; }
  
  private calculatePerformanceScore(data: any): number { return 0; }
  private async generateRecommendations(data: any): Promise<any[]> { return []; }
  
  private async saveGameAnalytics(analytics: GameAnalytics): Promise<void> {}
  private async saveInsight(insight: DataInsight): Promise<void> {}
  private async saveUserReport(report: any): Promise<void> {}
  
  private async analyzeTrainingTrend(): Promise<DataInsight | null> { return null; }
  private async collectRealtimeMetrics(): Promise<any> { return {}; }
  private async processRealtimeMetrics(metrics: any): Promise<void> {}
  
  private async detectPerformanceAnomalies(): Promise<DataInsight[]> { return []; }
  private async detectBehaviorAnomalies(): Promise<DataInsight[]> { return []; }
  private async detectGameAnomalies(): Promise<DataInsight[]> { return []; }

  /**
   * 销毁资源
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    // 最后一次刷新队列
    this.flushQueues().catch(console.error);
  }
}

export default CloudAnalyticsEngine;