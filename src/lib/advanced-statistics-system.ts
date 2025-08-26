/**
 * 高级统计系统 - Week 15核心功能
 * 
 * 功能特性：
 * 1. 多维度数据统计分析
 * 2. 趋势预测和模式识别
 * 3. 对比分析和基准测试
 * 4. 实时数据聚合
 * 5. 统计图表数据生成
 * 6. 导出和报告功能
 */

import { CloudAdapter } from './storage/cloud-adapter';
import { HandHistory, PlayerStats } from './storage/interfaces';
import { CloudAnalyticsEngine, UserBehaviorEvent, PerformanceMetrics } from './cloud-analytics-engine';

export interface StatisticsConfig {
  // 统计周期配置
  timePeriods: ('daily' | 'weekly' | 'monthly' | 'yearly')[];
  
  // 统计维度配置
  dimensions: {
    temporal: boolean;      // 时间维度
    positional: boolean;    // 位置维度
    gameType: boolean;      // 游戏类型维度
    stakes: boolean;        // 盲注维度
    opponents: boolean;     // 对手维度
  };
  
  // 统计指标配置
  metrics: {
    winRate: boolean;
    vpip: boolean;
    pfr: boolean;
    aggressionFactor: boolean;
    showdownWinning: boolean;
    hourlyWinRate: boolean;
    volumeStats: boolean;
  };
  
  // 数据保留配置
  retentionDays: number;
  aggregationLevels: number[];
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface StatisticalSummary {
  mean: number;
  median: number;
  mode: number[];
  standardDeviation: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  range: number;
  quartiles: {
    q1: number;
    q2: number;
    q3: number;
  };
  percentiles: Record<number, number>;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  strength: number; // 0-1
  confidence: number; // 0-1
  slope: number;
  correlation: number;
  seasonality?: {
    detected: boolean;
    period?: number;
    amplitude?: number;
  };
  forecastPoints?: TimeSeriesData[];
}

export interface ComparisonAnalysis {
  baselineValue: number;
  currentValue: number;
  change: number;
  changePercent: number;
  significance: number; // 0-1
  trend: TrendAnalysis;
  insights: string[];
}

export interface MultiDimensionalStats {
  dimension: string;
  breakdown: Array<{
    category: string;
    value: number;
    percentage: number;
    count: number;
    trend?: TrendAnalysis;
  }>;
  topPerformers: Array<{
    category: string;
    value: number;
    rank: number;
  }>;
  correlations: Array<{
    with: string;
    coefficient: number;
    significance: number;
  }>;
}

export interface AdvancedStatsResult {
  id: string;
  userId: string;
  generatedAt: number;
  timeRange: {
    start: number;
    end: number;
  };
  
  // 基础统计
  summary: StatisticalSummary;
  
  // 时间序列分析
  timeSeries: {
    data: TimeSeriesData[];
    trend: TrendAnalysis;
    forecast: TimeSeriesData[];
  };
  
  // 多维度分析
  dimensions: MultiDimensionalStats[];
  
  // 对比分析
  comparisons: {
    previousPeriod: ComparisonAnalysis;
    benchmark: ComparisonAnalysis;
    peerGroup?: ComparisonAnalysis;
  };
  
  // 性能分析
  performance: {
    keyMetrics: Record<string, number>;
    improvements: Array<{
      metric: string;
      current: number;
      target: number;
      gap: number;
      priority: number;
    }>;
    achievements: Array<{
      metric: string;
      value: number;
      percentile: number;
      description: string;
    }>;
  };
  
  // 洞察和建议
  insights: Array<{
    type: 'opportunity' | 'warning' | 'achievement' | 'trend';
    title: string;
    description: string;
    priority: number;
    actionable: boolean;
    recommendations?: string[];
  }>;
}

export class AdvancedStatisticsSystem {
  private cloudAdapter: CloudAdapter;
  private analyticsEngine: CloudAnalyticsEngine;
  private config: StatisticsConfig;
  private userId: string;
  private cachedStats: Map<string, any> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟缓存

  constructor(
    cloudAdapter: CloudAdapter,
    analyticsEngine: CloudAnalyticsEngine,
    userId: string,
    config: StatisticsConfig
  ) {
    this.cloudAdapter = cloudAdapter;
    this.analyticsEngine = analyticsEngine;
    this.userId = userId;
    this.config = config;
  }

  /**
   * 生成综合统计报告
   */
  async generateComprehensiveReport(
    timeRange: { start: number; end: number },
    dimensions?: string[]
  ): Promise<AdvancedStatsResult> {
    console.log('📊 生成综合统计报告...');
    
    try {
      const reportId = this.generateReportId();
      
      // 并行获取各类数据
      const [
        handHistoryData,
        behaviorData,
        performanceData,
        benchmarkData
      ] = await Promise.all([
        this.getHandHistoryData(timeRange),
        this.getBehaviorData(timeRange),
        this.getPerformanceData(timeRange),
        this.getBenchmarkData()
      ]);

      // 基础统计分析
      const summary = this.calculateStatisticalSummary(handHistoryData);
      
      // 时间序列分析
      const timeSeries = await this.performTimeSeriesAnalysis(handHistoryData, timeRange);
      
      // 多维度分析
      const dimensionStats = await this.performMultiDimensionalAnalysis(
        handHistoryData,
        dimensions || ['position', 'gameType', 'stakes']
      );
      
      // 对比分析
      const comparisons = await this.performComparisonAnalysis(
        handHistoryData,
        timeRange,
        benchmarkData
      );
      
      // 性能分析
      const performance = await this.performPerformanceAnalysis(
        handHistoryData,
        behaviorData,
        performanceData
      );
      
      // 生成洞察
      const insights = await this.generateInsights({
        summary,
        timeSeries,
        dimensions: dimensionStats,
        comparisons,
        performance
      });

      const result: AdvancedStatsResult = {
        id: reportId,
        userId: this.userId,
        generatedAt: Date.now(),
        timeRange,
        summary,
        timeSeries,
        dimensions: dimensionStats,
        comparisons,
        performance,
        insights
      };

      // 缓存结果
      this.cacheResult(reportId, result);
      
      // 保存到云端
      await this.saveReport(result);
      
      console.log('✅ 综合统计报告生成完成');
      return result;
    } catch (error) {
      console.error('❌ 统计报告生成失败:', error);
      throw error;
    }
  }

  /**
   * 计算基础统计摘要
   */
  calculateStatisticalSummary(data: HandHistory[]): StatisticalSummary {
    if (data.length === 0) {
      return this.getEmptyStatsSummary();
    }

    const values = data.map(hand => hand.bbWon || 0);
    const sortedValues = [...values].sort((a, b) => a - b);
    const n = values.length;

    // 基础统计量
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const median = this.calculateMedian(sortedValues);
    const mode = this.calculateMode(values);
    
    // 方差和标准差
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);
    
    // 偏度和峰度
    const skewness = this.calculateSkewness(values, mean, standardDeviation);
    const kurtosis = this.calculateKurtosis(values, mean, standardDeviation);
    
    // 范围和四分位数
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const quartiles = this.calculateQuartiles(sortedValues);
    
    // 百分位数
    const percentiles = this.calculatePercentiles(sortedValues, [5, 10, 25, 75, 90, 95]);

    return {
      mean,
      median,
      mode,
      standardDeviation,
      variance,
      skewness,
      kurtosis,
      min,
      max,
      range,
      quartiles,
      percentiles
    };
  }

  /**
   * 执行时间序列分析
   */
  async performTimeSeriesAnalysis(
    data: HandHistory[],
    timeRange: { start: number; end: number }
  ): Promise<{ data: TimeSeriesData[]; trend: TrendAnalysis; forecast: TimeSeriesData[] }> {
    // 按时间聚合数据
    const timeSeriesData = this.aggregateByTime(data, 'daily');
    
    // 趋势分析
    const trend = this.analyzeTrend(timeSeriesData);
    
    // 预测未来数据点
    const forecast = this.generateForecast(timeSeriesData, 7); // 预测7天
    
    return {
      data: timeSeriesData,
      trend,
      forecast
    };
  }

  /**
   * 执行多维度分析
   */
  async performMultiDimensionalAnalysis(
    data: HandHistory[],
    dimensions: string[]
  ): Promise<MultiDimensionalStats[]> {
    const results: MultiDimensionalStats[] = [];
    
    for (const dimension of dimensions) {
      const stats = await this.analyzeDimension(data, dimension);
      results.push(stats);
    }
    
    return results;
  }

  /**
   * 执行对比分析
   */
  async performComparisonAnalysis(
    currentData: HandHistory[],
    timeRange: { start: number; end: number },
    benchmarkData: any
  ): Promise<{
    previousPeriod: ComparisonAnalysis;
    benchmark: ComparisonAnalysis;
    peerGroup?: ComparisonAnalysis;
  }> {
    // 获取上一个周期的数据
    const previousPeriodRange = this.getPreviousPeriodRange(timeRange);
    const previousData = await this.getHandHistoryData(previousPeriodRange);
    
    // 计算对比指标
    const currentWinRate = this.calculateWinRate(currentData);
    const previousWinRate = this.calculateWinRate(previousData);
    const benchmarkWinRate = benchmarkData.averageWinRate || 0;
    
    return {
      previousPeriod: this.createComparisonAnalysis(
        previousWinRate,
        currentWinRate,
        'Previous Period Comparison'
      ),
      benchmark: this.createComparisonAnalysis(
        benchmarkWinRate,
        currentWinRate,
        'Benchmark Comparison'
      )
    };
  }

  /**
   * 执行性能分析
   */
  async performPerformanceAnalysis(
    handData: HandHistory[],
    behaviorData: UserBehaviorEvent[],
    performanceData: PerformanceMetrics[]
  ): Promise<AdvancedStatsResult['performance']> {
    // 计算关键指标
    const keyMetrics = {
      winRate: this.calculateWinRate(handData),
      vpip: this.calculateVPIP(handData),
      pfr: this.calculatePFR(handData),
      aggressionFactor: this.calculateAggressionFactor(handData),
      handsPerHour: this.calculateHandsPerHour(handData),
      averageSessionTime: this.calculateAverageSessionTime(behaviorData),
      loadTime: this.calculateAverageLoadTime(performanceData)
    };
    
    // 识别改进机会
    const improvements = this.identifyImprovements(keyMetrics);
    
    // 识别成就
    const achievements = this.identifyAchievements(keyMetrics);
    
    return {
      keyMetrics,
      improvements,
      achievements
    };
  }

  /**
   * 生成洞察和建议
   */
  async generateInsights(analysisData: {
    summary: StatisticalSummary;
    timeSeries: any;
    dimensions: MultiDimensionalStats[];
    comparisons: any;
    performance: any;
  }): Promise<AdvancedStatsResult['insights']> {
    const insights: AdvancedStatsResult['insights'] = [];
    
    // 趋势洞察
    if (analysisData.timeSeries.trend.direction === 'up' && analysisData.timeSeries.trend.confidence > 0.7) {
      insights.push({
        type: 'achievement',
        title: '表现持续改善',
        description: `您的表现在最近一段时间内呈现稳定上升趋势，置信度${(analysisData.timeSeries.trend.confidence * 100).toFixed(1)}%`,
        priority: 1,
        actionable: false
      });
    }
    
    // 性能洞察
    const lowPerformanceMetrics = analysisData.performance.improvements
      .filter(imp => imp.priority > 0.7)
      .slice(0, 3);
    
    if (lowPerformanceMetrics.length > 0) {
      insights.push({
        type: 'opportunity',
        title: '发现改进机会',
        description: `在${lowPerformanceMetrics.map(m => m.metric).join('、')}方面有较大改进空间`,
        priority: 1,
        actionable: true,
        recommendations: [
          '建议加强相关训练场景练习',
          '分析对应的手牌历史找出问题根源',
          '设定具体的改进目标和时间节点'
        ]
      });
    }
    
    // 异常检测洞察
    if (analysisData.summary.standardDeviation > analysisData.summary.mean * 0.5) {
      insights.push({
        type: 'warning',
        title: '表现波动较大',
        description: '您的表现波动超出正常范围，建议关注情绪管理和资金管理',
        priority: 0.8,
        actionable: true,
        recommendations: [
          '制定更严格的止损策略',
          '加强心理素质训练',
          '考虑降低游戏级别稳定表现'
        ]
      });
    }
    
    // 对比分析洞察
    if (analysisData.comparisons.previousPeriod.changePercent > 10) {
      insights.push({
        type: 'achievement',
        title: '显著进步',
        description: `相比上期表现提升${analysisData.comparisons.previousPeriod.changePercent.toFixed(1)}%`,
        priority: 0.9,
        actionable: false
      });
    }
    
    return insights.sort((a, b) => b.priority - a.priority);
  }

  // =================== 辅助计算方法 ===================

  private calculateMedian(sortedValues: number[]): number {
    const mid = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 !== 0
      ? sortedValues[mid]
      : (sortedValues[mid - 1] + sortedValues[mid]) / 2;
  }

  private calculateMode(values: number[]): number[] {
    const frequency: Record<number, number> = {};
    let maxFreq = 0;
    
    values.forEach(val => {
      frequency[val] = (frequency[val] || 0) + 1;
      maxFreq = Math.max(maxFreq, frequency[val]);
    });
    
    return Object.keys(frequency)
      .filter(key => frequency[Number(key)] === maxFreq)
      .map(Number);
  }

  private calculateSkewness(values: number[], mean: number, stdDev: number): number {
    const n = values.length;
    const skew = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / stdDev, 3);
    }, 0);
    
    return (n / ((n - 1) * (n - 2))) * skew;
  }

  private calculateKurtosis(values: number[], mean: number, stdDev: number): number {
    const n = values.length;
    const kurt = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / stdDev, 4);
    }, 0);
    
    return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * kurt - 
           (3 * (n - 1) * (n - 1) / ((n - 2) * (n - 3)));
  }

  private calculateQuartiles(sortedValues: number[]): { q1: number; q2: number; q3: number } {
    const n = sortedValues.length;
    const q1Index = Math.floor(n * 0.25);
    const q2Index = Math.floor(n * 0.5);
    const q3Index = Math.floor(n * 0.75);
    
    return {
      q1: sortedValues[q1Index],
      q2: sortedValues[q2Index],
      q3: sortedValues[q3Index]
    };
  }

  private calculatePercentiles(sortedValues: number[], percentiles: number[]): Record<number, number> {
    const result: Record<number, number> = {};
    
    percentiles.forEach(p => {
      const index = Math.floor((sortedValues.length - 1) * (p / 100));
      result[p] = sortedValues[index];
    });
    
    return result;
  }

  private aggregateByTime(data: HandHistory[], period: 'daily' | 'weekly' | 'monthly'): TimeSeriesData[] {
    const grouped: Record<string, HandHistory[]> = {};
    
    data.forEach(hand => {
      const key = this.getTimeKey(hand.playedAt, period);
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(hand);
    });
    
    return Object.entries(grouped).map(([key, hands]) => ({
      timestamp: this.parseTimeKey(key),
      value: this.calculateWinRate(hands),
      metadata: {
        handsCount: hands.length,
        totalWinnings: hands.reduce((sum, h) => sum + (h.winAmount || 0), 0)
      }
    })).sort((a, b) => a.timestamp - b.timestamp);
  }

  private analyzeTrend(data: TimeSeriesData[]): TrendAnalysis {
    if (data.length < 2) {
      return {
        direction: 'stable',
        strength: 0,
        confidence: 0,
        slope: 0,
        correlation: 0
      };
    }
    
    // 简单线性回归计算趋势
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.value, 0);
    const sumXY = data.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const correlation = this.calculateCorrelation(data);
    
    return {
      direction: slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'stable',
      strength: Math.abs(slope),
      confidence: Math.abs(correlation),
      slope,
      correlation
    };
  }

  private generateForecast(data: TimeSeriesData[], periods: number): TimeSeriesData[] {
    if (data.length < 3) {
      return [];
    }
    
    // 简单移动平均预测
    const recent = data.slice(-3);
    const avgValue = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
    const lastTimestamp = data[data.length - 1].timestamp;
    const interval = data.length > 1 ? data[data.length - 1].timestamp - data[data.length - 2].timestamp : 86400000; // 1天
    
    return Array.from({ length: periods }, (_, i) => ({
      timestamp: lastTimestamp + (i + 1) * interval,
      value: avgValue * (1 + (Math.random() - 0.5) * 0.1) // 添加小幅随机波动
    }));
  }

  // =================== 工具方法 ===================

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEmptyStatsSummary(): StatisticalSummary {
    return {
      mean: 0, median: 0, mode: [], standardDeviation: 0, variance: 0,
      skewness: 0, kurtosis: 0, min: 0, max: 0, range: 0,
      quartiles: { q1: 0, q2: 0, q3: 0 }, percentiles: {}
    };
  }

  private getTimeKey(timestamp: number, period: string): string {
    const date = new Date(timestamp);
    switch (period) {
      case 'daily':
        return date.toISOString().split('T')[0];
      case 'weekly':
        const week = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
        return `week_${week}`;
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }

  private parseTimeKey(key: string): number {
    if (key.startsWith('week_')) {
      const week = parseInt(key.split('_')[1]);
      return week * 7 * 24 * 60 * 60 * 1000;
    } else if (key.includes('-') && key.length === 7) {
      return new Date(key + '-01').getTime();
    } else {
      return new Date(key).getTime();
    }
  }

  private calculateCorrelation(data: TimeSeriesData[]): number {
    const n = data.length;
    const indices = data.map((_, i) => i);
    const values = data.map(d => d.value);
    
    const meanX = indices.reduce((sum, x) => sum + x, 0) / n;
    const meanY = values.reduce((sum, y) => sum + y, 0) / n;
    
    const numerator = indices.reduce((sum, x, i) => sum + (x - meanX) * (values[i] - meanY), 0);
    const denomX = Math.sqrt(indices.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0));
    const denomY = Math.sqrt(values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0));
    
    return denomX && denomY ? numerator / (denomX * denomY) : 0;
  }

  private getPreviousPeriodRange(timeRange: { start: number; end: number }): { start: number; end: number } {
    const duration = timeRange.end - timeRange.start;
    return {
      start: timeRange.start - duration,
      end: timeRange.start
    };
  }

  private createComparisonAnalysis(baseline: number, current: number, description: string): ComparisonAnalysis {
    const change = current - baseline;
    const changePercent = baseline !== 0 ? (change / baseline) * 100 : 0;
    
    return {
      baselineValue: baseline,
      currentValue: current,
      change,
      changePercent,
      significance: Math.abs(changePercent) / 100,
      trend: {
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        strength: Math.abs(change),
        confidence: 0.8,
        slope: change,
        correlation: 0.5
      },
      insights: [`${description}: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`]
    };
  }

  // 这些方法需要根据具体业务逻辑实现
  private async getHandHistoryData(timeRange: { start: number; end: number }): Promise<HandHistory[]> {
    // 实现获取手牌历史数据
    return [];
  }

  private async getBehaviorData(timeRange: { start: number; end: number }): Promise<UserBehaviorEvent[]> {
    // 实现获取行为数据
    return [];
  }

  private async getPerformanceData(timeRange: { start: number; end: number }): Promise<PerformanceMetrics[]> {
    // 实现获取性能数据
    return [];
  }

  private async getBenchmarkData(): Promise<any> {
    // 实现获取基准数据
    return { averageWinRate: 0.55 };
  }

  private async analyzeDimension(data: HandHistory[], dimension: string): Promise<MultiDimensionalStats> {
    // 实现维度分析
    return {
      dimension,
      breakdown: [],
      topPerformers: [],
      correlations: []
    };
  }

  private calculateWinRate(data: HandHistory[]): number {
    if (data.length === 0) return 0;
    const wins = data.filter(h => (h.winAmount || 0) > 0).length;
    return wins / data.length;
  }

  private calculateVPIP(data: HandHistory[]): number { return 0; }
  private calculatePFR(data: HandHistory[]): number { return 0; }
  private calculateAggressionFactor(data: HandHistory[]): number { return 0; }
  private calculateHandsPerHour(data: HandHistory[]): number { return 0; }
  private calculateAverageSessionTime(data: UserBehaviorEvent[]): number { return 0; }
  private calculateAverageLoadTime(data: PerformanceMetrics[]): number { return 0; }

  private identifyImprovements(metrics: Record<string, number>): any[] { return []; }
  private identifyAchievements(metrics: Record<string, number>): any[] { return []; }

  private cacheResult(id: string, result: AdvancedStatsResult): void {
    this.cachedStats.set(id, { result, timestamp: Date.now() });
  }

  private async saveReport(report: AdvancedStatsResult): Promise<void> {
    await this.cloudAdapter.set(`stats_report_${report.id}`, report);
  }

  /**
   * 获取缓存的统计结果
   */
  getCachedResult(id: string): AdvancedStatsResult | null {
    const cached = this.cachedStats.get(id);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    return null;
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [id, cached] of this.cachedStats) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.cachedStats.delete(id);
      }
    }
  }
}

export default AdvancedStatisticsSystem;