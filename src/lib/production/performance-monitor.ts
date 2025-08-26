/**
 * 生产环境性能监控系统 - Week 16核心功能
 * 
 * 功能特性：
 * 1. 实时性能指标监控
 * 2. 内存泄漏检测
 * 3. 网络性能监控
 * 4. 用户交互延迟分析
 * 5. 自动性能报告生成
 * 6. 性能警报和通知
 */

import { CloudAdapter } from '../storage/cloud-adapter';

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'navigation' | 'paint' | 'layout' | 'memory' | 'network' | 'interaction';
  name: string;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  level: 'warning' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  description: string;
  suggestions: string[];
}

export interface PerformanceReport {
  id: string;
  generatedAt: number;
  timeRange: { start: number; end: number };
  summary: {
    avgLoadTime: number;
    avgFCP: number;
    avgLCP: number;
    avgFID: number;
    avgCLS: number;
    memoryUsage: number;
    networkEfficiency: number;
  };
  trends: {
    performance: 'improving' | 'degrading' | 'stable';
    memory: 'growing' | 'stable' | 'optimized';
    network: 'fast' | 'slow' | 'variable';
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    issue: string;
    solution: string;
    impact: string;
  }>;
  alerts: PerformanceAlert[];
}

export class ProductionPerformanceMonitor {
  private cloudAdapter: CloudAdapter;
  private isMonitoring: boolean = false;
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private intervals: NodeJS.Timeout[] = [];
  
  // 性能阈值配置
  private thresholds: PerformanceThreshold[] = [
    { metric: 'FCP', warning: 2000, critical: 4000, unit: 'ms' },
    { metric: 'LCP', warning: 2500, critical: 4000, unit: 'ms' },
    { metric: 'FID', warning: 100, critical: 300, unit: 'ms' },
    { metric: 'CLS', warning: 0.1, critical: 0.25, unit: 'score' },
    { metric: 'TTFB', warning: 600, critical: 1000, unit: 'ms' },
    { metric: 'Memory', warning: 50, critical: 80, unit: 'MB' },
    { metric: 'JSHeapSize', warning: 20, critical: 50, unit: 'MB' }
  ];

  constructor(cloudAdapter: CloudAdapter) {
    this.cloudAdapter = cloudAdapter;
  }

  /**
   * 启动性能监控
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('性能监控已在运行');
      return;
    }

    console.log('🚀 启动生产环境性能监控...');
    
    try {
      this.isMonitoring = true;
      
      // 设置各种性能观察器
      this.setupNavigationObserver();
      this.setupPaintObserver();
      this.setupLayoutShiftObserver();
      this.setupMemoryMonitoring();
      this.setupNetworkMonitoring();
      this.setupInteractionMonitoring();
      
      // 定期生成报告
      this.scheduleReports();
      
      console.log('✅ 性能监控启动成功');
    } catch (error) {
      console.error('❌ 性能监控启动失败:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    console.log('🛑 停止性能监控...');
    
    this.isMonitoring = false;
    
    // 断开所有观察器
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // 清除所有定时器
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    
    console.log('✅ 性能监控已停止');
  }

  /**
   * 设置导航性能观察器
   */
  private setupNavigationObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            
            // 记录各种导航时间
            this.recordMetric('TTFB', navEntry.responseStart - navEntry.requestStart, 'ms');
            this.recordMetric('DOMLoad', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart, 'ms');
            this.recordMetric('WindowLoad', navEntry.loadEventEnd - navEntry.loadEventStart, 'ms');
            this.recordMetric('DNSLookup', navEntry.domainLookupEnd - navEntry.domainLookupStart, 'ms');
            this.recordMetric('TCPConnect', navEntry.connectEnd - navEntry.connectStart, 'ms');
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', observer);
      } catch (error) {
        console.warn('导航性能监控设置失败:', error);
      }
    }
  }

  /**
   * 设置绘制性能观察器
   */
  private setupPaintObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'paint') {
            this.recordMetric(entry.name, entry.startTime, 'ms', {
              entryType: entry.entryType
            });
          } else if (entry.entryType === 'largest-contentful-paint') {
            this.recordMetric('LCP', entry.startTime, 'ms', {
              element: (entry as any).element?.tagName
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        this.observers.set('paint', observer);
      } catch (error) {
        console.warn('绘制性能监控设置失败:', error);
      }
    }
  }

  /**
   * 设置布局偏移观察器
   */
  private setupLayoutShiftObserver(): void {
    if ('PerformanceObserver' in window) {
      let clsScore = 0;
      
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            clsScore += (entry as any).value;
            this.recordMetric('CLS', clsScore, 'score', {
              sources: (entry as any).sources?.map((source: any) => source.node?.tagName)
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('layout-shift', observer);
      } catch (error) {
        console.warn('布局偏移监控设置失败:', error);
      }
    }
  }

  /**
   * 设置内存监控
   */
  private setupMemoryMonitoring(): void {
    const interval = setInterval(() => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        
        this.recordMetric('JSHeapSize', memory.usedJSHeapSize / 1024 / 1024, 'MB');
        this.recordMetric('JSHeapTotal', memory.totalJSHeapSize / 1024 / 1024, 'MB');
        this.recordMetric('JSHeapLimit', memory.jsHeapSizeLimit / 1024 / 1024, 'MB');
        
        // 检测内存泄漏
        this.detectMemoryLeaks(memory);
      }
    }, 30000); // 每30秒检查一次

    this.intervals.push(interval);
  }

  /**
   * 设置网络监控
   */
  private setupNetworkMonitoring(): void {
    if ((navigator as any).connection) {
      const connection = (navigator as any).connection;
      
      const recordNetworkInfo = () => {
        this.recordMetric('NetworkDownlink', connection.downlink, 'Mbps');
        this.recordMetric('NetworkRTT', connection.rtt, 'ms');
        this.recordMetric('NetworkEffectiveType', this.getEffectiveTypeScore(connection.effectiveType), 'score');
      };

      // 初始记录
      recordNetworkInfo();
      
      // 监听网络变化
      connection.addEventListener('change', recordNetworkInfo);
      
      const interval = setInterval(recordNetworkInfo, 60000); // 每分钟检查一次
      this.intervals.push(interval);
    }
  }

  /**
   * 设置交互监控
   */
  private setupInteractionMonitoring(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'first-input') {
            this.recordMetric('FID', (entry as any).processingStart - entry.startTime, 'ms', {
              inputType: (entry as any).name
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['first-input'] });
        this.observers.set('first-input', observer);
      } catch (error) {
        console.warn('交互性能监控设置失败:', error);
      }
    }
  }

  /**
   * 记录性能指标
   */
  private recordMetric(name: string, value: number, unit: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: this.getMetricType(name),
      name,
      value,
      unit,
      metadata
    };

    this.metrics.push(metric);
    
    // 检查阈值
    this.checkThreshold(metric);
    
    // 限制内存中的指标数量
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  /**
   * 检查性能阈值
   */
  private checkThreshold(metric: PerformanceMetric): void {
    const threshold = this.thresholds.find(t => t.metric === metric.name);
    if (!threshold) return;

    if (metric.value >= threshold.critical) {
      this.createAlert('critical', metric, threshold);
    } else if (metric.value >= threshold.warning) {
      this.createAlert('warning', metric, threshold);
    }
  }

  /**
   * 创建性能警报
   */
  private createAlert(level: 'warning' | 'critical', metric: PerformanceMetric, threshold: PerformanceThreshold): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      metric: metric.name,
      currentValue: metric.value,
      threshold: level === 'critical' ? threshold.critical : threshold.warning,
      description: `${metric.name} 性能指标 ${level === 'critical' ? '严重' : ''}超出阈值`,
      suggestions: this.getOptimizationSuggestions(metric.name, level)
    };

    // 发送到云端
    this.sendAlert(alert);
  }

  /**
   * 获取优化建议
   */
  private getOptimizationSuggestions(metricName: string, level: 'warning' | 'critical'): string[] {
    const suggestions: Record<string, string[]> = {
      'FCP': ['优化关键渲染路径', '减少阻塞CSS', '使用资源预加载'],
      'LCP': ['优化图片加载', '使用CDN', '减少服务器响应时间'],
      'FID': ['减少JavaScript执行时间', '使用Web Workers', '优化第三方脚本'],
      'CLS': ['为媒体元素设置尺寸', '避免在已有内容上方插入内容', '使用transform动画'],
      'TTFB': ['优化服务器配置', '使用CDN', '启用HTTP/2'],
      'Memory': ['检查内存泄漏', '优化DOM操作', '清理未使用的事件监听器'],
      'JSHeapSize': ['减少JavaScript包大小', '实现代码分割', '清理闭包引用']
    };

    return suggestions[metricName] || ['联系技术支持进行诊断'];
  }

  /**
   * 检测内存泄漏
   */
  private detectMemoryLeaks(memory: any): void {
    const currentHeapSize = memory.usedJSHeapSize / 1024 / 1024;
    const recentMetrics = this.metrics
      .filter(m => m.name === 'JSHeapSize' && Date.now() - m.timestamp < 5 * 60 * 1000)
      .slice(-10);

    if (recentMetrics.length >= 5) {
      const trend = this.calculateTrend(recentMetrics.map(m => m.value));
      if (trend > 0.1) { // 如果内存持续增长
        this.createAlert('warning', {
          id: 'memory_leak_detection',
          timestamp: Date.now(),
          type: 'memory',
          name: 'MemoryLeak',
          value: trend,
          unit: 'trend'
        }, { metric: 'MemoryLeak', warning: 0.1, critical: 0.2, unit: 'trend' });
      }
    }
  }

  /**
   * 计算趋势
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  /**
   * 生成性能报告
   */
  async generateReport(timeRange?: { start: number; end: number }): Promise<PerformanceReport> {
    const end = timeRange?.end || Date.now();
    const start = timeRange?.start || (end - 24 * 60 * 60 * 1000); // 默认24小时

    const relevantMetrics = this.metrics.filter(m => 
      m.timestamp >= start && m.timestamp <= end
    );

    const summary = this.calculateSummary(relevantMetrics);
    const trends = this.analyzeTrends(relevantMetrics);
    const recommendations = this.generateRecommendations(summary, trends);
    const alerts = await this.getAlertsInRange(start, end);

    const report: PerformanceReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: Date.now(),
      timeRange: { start, end },
      summary,
      trends,
      recommendations,
      alerts
    };

    // 保存报告到云端
    await this.saveReport(report);

    return report;
  }

  /**
   * 计算性能摘要
   */
  private calculateSummary(metrics: PerformanceMetric[]): PerformanceReport['summary'] {
    const getAverage = (name: string) => {
      const values = metrics.filter(m => m.name === name).map(m => m.value);
      return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    };

    return {
      avgLoadTime: getAverage('WindowLoad'),
      avgFCP: getAverage('first-contentful-paint'),
      avgLCP: getAverage('LCP'),
      avgFID: getAverage('FID'),
      avgCLS: getAverage('CLS'),
      memoryUsage: getAverage('JSHeapSize'),
      networkEfficiency: getAverage('NetworkDownlink')
    };
  }

  /**
   * 分析性能趋势
   */
  private analyzeTrends(metrics: PerformanceMetric[]): PerformanceReport['trends'] {
    const loadTimeTrend = this.getTrendDirection(metrics.filter(m => m.name === 'WindowLoad'));
    const memoryTrend = this.getTrendDirection(metrics.filter(m => m.name === 'JSHeapSize'));
    const networkTrend = this.getTrendDirection(metrics.filter(m => m.name === 'NetworkDownlink'));

    return {
      performance: loadTimeTrend > 0.1 ? 'degrading' : loadTimeTrend < -0.1 ? 'improving' : 'stable',
      memory: memoryTrend > 0.1 ? 'growing' : memoryTrend < -0.1 ? 'optimized' : 'stable',
      network: networkTrend > 0.1 ? 'fast' : networkTrend < -0.1 ? 'slow' : 'variable'
    };
  }

  /**
   * 定期生成报告
   */
  private scheduleReports(): void {
    // 每小时生成性能报告
    const interval = setInterval(async () => {
      try {
        await this.generateReport();
      } catch (error) {
        console.error('定期报告生成失败:', error);
      }
    }, 60 * 60 * 1000); // 1小时

    this.intervals.push(interval);
  }

  // =================== 工具方法 ===================

  private getMetricType(name: string): PerformanceMetric['type'] {
    if (name.includes('paint') || name.includes('FCP') || name.includes('LCP')) return 'paint';
    if (name.includes('Memory') || name.includes('Heap')) return 'memory';
    if (name.includes('Network') || name.includes('RTT')) return 'network';
    if (name.includes('FID') || name.includes('Input')) return 'interaction';
    if (name.includes('CLS') || name.includes('Layout')) return 'layout';
    return 'navigation';
  }

  private getEffectiveTypeScore(effectiveType: string): number {
    const scores: Record<string, number> = {
      'slow-2g': 1,
      '2g': 2,
      '3g': 3,
      '4g': 4
    };
    return scores[effectiveType] || 2;
  }

  private getTrendDirection(metrics: PerformanceMetric[]): number {
    if (metrics.length < 5) return 0;
    return this.calculateTrend(metrics.slice(-10).map(m => m.value));
  }

  private generateRecommendations(summary: any, trends: any): PerformanceReport['recommendations'] {
    const recommendations: PerformanceReport['recommendations'] = [];

    if (summary.avgLoadTime > 3000) {
      recommendations.push({
        priority: 'high',
        category: '页面加载',
        issue: '页面加载时间过长',
        solution: '优化关键资源加载路径，使用代码分割',
        impact: '提升用户体验，减少跳出率'
      });
    }

    if (summary.avgLCP > 2500) {
      recommendations.push({
        priority: 'high',
        category: '内容绘制',
        issue: 'LCP指标超出推荐值',
        solution: '优化图片加载，使用现代图片格式',
        impact: '改善感知性能'
      });
    }

    if (trends.memory === 'growing') {
      recommendations.push({
        priority: 'medium',
        category: '内存管理',
        issue: '内存使用持续增长',
        solution: '检查内存泄漏，优化组件清理',
        impact: '防止应用崩溃，提升稳定性'
      });
    }

    return recommendations;
  }

  private async sendAlert(alert: PerformanceAlert): Promise<void> {
    try {
      await this.cloudAdapter.set(`performance_alert_${alert.id}`, alert);
    } catch (error) {
      console.error('发送性能警报失败:', error);
    }
  }

  private async saveReport(report: PerformanceReport): Promise<void> {
    try {
      await this.cloudAdapter.set(`performance_report_${report.id}`, report);
    } catch (error) {
      console.error('保存性能报告失败:', error);
    }
  }

  private async getAlertsInRange(start: number, end: number): Promise<PerformanceAlert[]> {
    // 这里应该从云端获取警报数据，简化实现
    return [];
  }

  /**
   * 获取实时性能状态
   */
  getRealtimeStatus(): {
    isMonitoring: boolean;
    metricsCount: number;
    lastMetric?: PerformanceMetric;
  } {
    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metrics.length,
      lastMetric: this.metrics[this.metrics.length - 1]
    };
  }

  /**
   * 清理旧数据
   */
  cleanup(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp > oneWeekAgo);
  }
}

export default ProductionPerformanceMonitor;