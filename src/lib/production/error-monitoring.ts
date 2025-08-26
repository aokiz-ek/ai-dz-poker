/**
 * 生产环境错误监控和日志系统 - Week 16核心功能
 * 
 * 功能特性：
 * 1. 全局错误捕获和处理
 * 2. 详细的错误日志记录
 * 3. 错误分类和优先级管理
 * 4. 自动错误报告生成
 * 5. 错误趋势分析和预警
 * 6. 用户友好的错误提示
 */

import { CloudAdapter } from '../storage/cloud-adapter';

export interface ErrorLog {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: 'javascript' | 'network' | 'api' | 'ui' | 'performance' | 'security' | 'data';
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  context: {
    url: string;
    userAgent: string;
    userId?: string;
    sessionId: string;
    component?: string;
    action?: string;
  };
  metadata: Record<string, any>;
  resolved: boolean;
  tags: string[];
}

export interface ErrorPattern {
  id: string;
  pattern: RegExp | string;
  category: ErrorLog['category'];
  severity: ErrorLog['level'];
  description: string;
  suggestedFix?: string;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
}

export interface ErrorReport {
  id: string;
  generatedAt: number;
  timeRange: { start: number; end: number };
  summary: {
    totalErrors: number;
    criticalErrors: number;
    newErrors: number;
    resolvedErrors: number;
    errorRate: number;
    topCategories: Array<{ category: string; count: number }>;
  };
  patterns: ErrorPattern[];
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
    prediction: string;
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    issue: string;
    solution: string;
    impact: string;
  }>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: {
    category?: ErrorLog['category'];
    level?: ErrorLog['level'];
    pattern?: string;
    count?: number;
    timeWindow?: number; // 分钟
  };
  action: 'log' | 'notify' | 'email' | 'webhook';
  enabled: boolean;
  cooldown: number; // 分钟，防止重复报警
  lastTriggered?: number;
}

export class ErrorMonitoringSystem {
  private cloudAdapter: CloudAdapter;
  private errorLogs: ErrorLog[] = [];
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private alertRules: AlertRule[] = [];
  private isMonitoring: boolean = false;
  private maxLogsInMemory = 1000;
  private logQueue: ErrorLog[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor(cloudAdapter: CloudAdapter) {
    this.cloudAdapter = cloudAdapter;
    
    // 预设错误模式
    this.initializeErrorPatterns();
    
    // 预设报警规则
    this.initializeAlertRules();
  }

  /**
   * 启动错误监控
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.warn('错误监控已在运行');
      return;
    }

    console.log('🔍 启动生产环境错误监控...');
    
    try {
      this.isMonitoring = true;
      
      // 设置全局错误处理
      this.setupGlobalErrorHandlers();
      
      // 设置网络错误监控
      this.setupNetworkErrorMonitoring();
      
      // 设置性能监控
      this.setupPerformanceMonitoring();
      
      // 设置批量日志处理
      this.setupBatchLogging();
      
      // 加载历史错误模式
      await this.loadHistoricalPatterns();
      
      console.log('✅ 错误监控启动成功');
    } catch (error) {
      console.error('❌ 错误监控启动失败:', error);
      this.isMonitoring = false;
      throw error;
    }
  }

  /**
   * 停止错误监控
   */
  stopMonitoring(): void {
    console.log('🛑 停止错误监控...');
    
    this.isMonitoring = false;
    
    // 清除定时器
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // 最后一次刷新日志队列
    this.flushLogQueue().catch(console.error);
    
    console.log('✅ 错误监控已停止');
  }

  /**
   * 记录错误日志
   */
  logError(
    level: ErrorLog['level'],
    category: ErrorLog['category'],
    message: string,
    error?: Error,
    metadata: Record<string, any> = {}
  ): void {
    const errorLog: ErrorLog = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      } : undefined,
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        sessionId: this.getCurrentSessionId(),
        ...metadata.context
      },
      metadata: { ...metadata },
      resolved: false,
      tags: this.generateTags(category, level, error)
    };

    // 添加到队列
    this.logQueue.push(errorLog);
    this.errorLogs.push(errorLog);
    
    // 限制内存中的日志数量
    if (this.errorLogs.length > this.maxLogsInMemory) {
      this.errorLogs = this.errorLogs.slice(-this.maxLogsInMemory / 2);
    }
    
    // 更新错误模式
    this.updateErrorPatterns(errorLog);
    
    // 检查报警规则
    this.checkAlertRules(errorLog);
    
    // 对于严重错误，立即处理
    if (level === 'critical' || level === 'error') {
      this.handleCriticalError(errorLog);
    }
  }

  /**
   * 生成错误报告
   */
  async generateErrorReport(timeRange?: { start: number; end: number }): Promise<ErrorReport> {
    const end = timeRange?.end || Date.now();
    const start = timeRange?.start || (end - 24 * 60 * 60 * 1000); // 默认24小时

    console.log('📋 生成错误报告...');
    
    const relevantLogs = this.errorLogs.filter(log => 
      log.timestamp >= start && log.timestamp <= end
    );

    const summary = this.generateSummary(relevantLogs);
    const patterns = Array.from(this.errorPatterns.values())
      .filter(pattern => pattern.lastSeen >= start)
      .sort((a, b) => b.occurrences - a.occurrences);
    
    const trends = this.analyzeTrends(relevantLogs, start, end);
    const recommendations = this.generateRecommendations(relevantLogs, patterns);

    const report: ErrorReport = {
      id: `error_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: Date.now(),
      timeRange: { start, end },
      summary,
      patterns,
      trends,
      recommendations
    };

    // 保存报告到云端
    await this.saveErrorReport(report);

    console.log('✅ 错误报告生成完成');
    return report;
  }

  /**
   * 标记错误为已解决
   */
  resolveError(errorId: string, resolution?: string): void {
    const errorLog = this.errorLogs.find(log => log.id === errorId);
    if (errorLog) {
      errorLog.resolved = true;
      if (resolution) {
        errorLog.metadata.resolution = resolution;
        errorLog.metadata.resolvedAt = Date.now();
      }
      
      // 更新云端记录
      this.updateErrorLog(errorLog);
    }
  }

  /**
   * 添加或更新报警规则
   */
  setAlertRule(rule: AlertRule): void {
    const index = this.alertRules.findIndex(r => r.id === rule.id);
    if (index >= 0) {
      this.alertRules[index] = rule;
    } else {
      this.alertRules.push(rule);
    }
    
    // 保存规则到云端
    this.saveAlertRule(rule);
  }

  // =================== 私有方法 ===================

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // JavaScript错误
    window.addEventListener('error', (event) => {
      this.logError('error', 'javascript', event.message, event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        context: { component: 'global' }
      });
    });

    // Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('error', 'javascript', 'Unhandled Promise Rejection', 
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
        context: { component: 'promise' }
      });
    });

    // 资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement;
        this.logError('warn', 'network', `Resource failed to load: ${target.tagName}`, undefined, {
          resource: (target as any).src || (target as any).href,
          tagName: target.tagName,
          context: { component: 'resource_loader' }
        });
      }
    }, true);
  }

  /**
   * 设置网络错误监控
   */
  private setupNetworkErrorMonitoring(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startTime = Date.now();
      
      try {
        const response = await originalFetch(input, init);
        
        if (!response.ok) {
          this.logError('warn', 'api', `HTTP ${response.status}: ${response.statusText}`, undefined, {
            url: typeof input === 'string' ? input : input.toString(),
            method: init?.method || 'GET',
            status: response.status,
            duration: Date.now() - startTime,
            context: { component: 'fetch' }
          });
        }
        
        return response;
      } catch (error) {
        this.logError('error', 'network', 'Network request failed', error instanceof Error ? error : new Error(String(error)), {
          url: typeof input === 'string' ? input : input.toString(),
          method: init?.method || 'GET',
          duration: Date.now() - startTime,
          context: { component: 'fetch' }
        });
        throw error;
      }
    };
  }

  /**
   * 设置性能监控
   */
  private setupPerformanceMonitoring(): void {
    // 监控长任务
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'longtask') {
              this.logError('warn', 'performance', 'Long task detected', undefined, {
                duration: entry.duration,
                startTime: entry.startTime,
                context: { component: 'performance_observer' }
              });
            }
          });
        });

        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('长任务监控设置失败:', error);
      }
    }

    // 监控内存使用
    setInterval(() => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        
        if (usedMB > 100) { // 100MB阈值
          this.logError('warn', 'performance', 'High memory usage detected', undefined, {
            usedJSHeapSize: usedMB,
            totalJSHeapSize: memory.totalJSHeapSize / 1024 / 1024,
            jsHeapSizeLimit: memory.jsHeapSizeLimit / 1024 / 1024,
            context: { component: 'memory_monitor' }
          });
        }
      }
    }, 60000); // 每分钟检查一次
  }

  /**
   * 设置批量日志处理
   */
  private setupBatchLogging(): void {
    this.batchTimer = setInterval(async () => {
      if (this.logQueue.length > 0) {
        await this.flushLogQueue();
      }
    }, 10000); // 每10秒批量发送一次
  }

  /**
   * 刷新日志队列
   */
  private async flushLogQueue(): Promise<void> {
    if (this.logQueue.length === 0) return;
    
    try {
      const logs = [...this.logQueue];
      this.logQueue = [];
      
      await this.cloudAdapter.cloudBatchSet(
        logs.map(log => ({
          key: `error_log_${log.id}`,
          data: log
        }))
      );
    } catch (error) {
      console.error('错误日志批量发送失败:', error);
      // 重新加入队列
      // this.logQueue.unshift(...logs);
    }
  }

  /**
   * 初始化错误模式
   */
  private initializeErrorPatterns(): void {
    const patterns: Omit<ErrorPattern, 'occurrences' | 'firstSeen' | 'lastSeen'>[] = [
      {
        id: 'network_timeout',
        pattern: /timeout|TIMEOUT/i,
        category: 'network',
        severity: 'error',
        description: '网络请求超时',
        suggestedFix: '检查网络连接，增加超时时间或实现重试机制'
      },
      {
        id: 'memory_leak',
        pattern: /memory|Memory|heap/i,
        category: 'performance',
        severity: 'warn',
        description: '内存使用异常',
        suggestedFix: '检查内存泄漏，优化对象生命周期管理'
      },
      {
        id: 'api_error',
        pattern: /HTTP [45]\d\d|API|api/i,
        category: 'api',
        severity: 'error',
        description: 'API调用错误',
        suggestedFix: '检查API端点状态，验证请求参数'
      },
      {
        id: 'security_violation',
        pattern: /security|Security|XSS|CSRF|unauthorized/i,
        category: 'security',
        severity: 'critical',
        description: '安全违规检测',
        suggestedFix: '立即检查安全策略，可能需要阻止恶意请求'
      }
    ];

    patterns.forEach(pattern => {
      this.errorPatterns.set(pattern.id, {
        ...pattern,
        occurrences: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      });
    });
  }

  /**
   * 初始化报警规则
   */
  private initializeAlertRules(): void {
    this.alertRules = [
      {
        id: 'critical_errors',
        name: '严重错误报警',
        condition: {
          level: 'critical'
        },
        action: 'notify',
        enabled: true,
        cooldown: 5
      },
      {
        id: 'high_error_rate',
        name: '错误率过高',
        condition: {
          level: 'error',
          count: 10,
          timeWindow: 5
        },
        action: 'email',
        enabled: true,
        cooldown: 15
      },
      {
        id: 'security_alerts',
        name: '安全事件报警',
        condition: {
          category: 'security'
        },
        action: 'webhook',
        enabled: true,
        cooldown: 1
      }
    ];
  }

  /**
   * 更新错误模式
   */
  private updateErrorPatterns(errorLog: ErrorLog): void {
    this.errorPatterns.forEach((pattern, id) => {
      const isMatch = pattern.pattern instanceof RegExp 
        ? pattern.pattern.test(errorLog.message)
        : errorLog.message.includes(pattern.pattern);
      
      if (isMatch || errorLog.category === pattern.category) {
        pattern.occurrences++;
        pattern.lastSeen = errorLog.timestamp;
        
        if (pattern.occurrences === 1) {
          pattern.firstSeen = errorLog.timestamp;
        }
      }
    });
  }

  /**
   * 检查报警规则
   */
  private checkAlertRules(errorLog: ErrorLog): void {
    this.alertRules.forEach(rule => {
      if (!rule.enabled) return;
      
      // 检查冷却期
      if (rule.lastTriggered && 
          Date.now() - rule.lastTriggered < rule.cooldown * 60 * 1000) {
        return;
      }
      
      let shouldTrigger = false;
      
      // 检查条件
      if (rule.condition.level && errorLog.level === rule.condition.level) {
        shouldTrigger = true;
      }
      
      if (rule.condition.category && errorLog.category === rule.condition.category) {
        shouldTrigger = true;
      }
      
      if (rule.condition.pattern && 
          new RegExp(rule.condition.pattern, 'i').test(errorLog.message)) {
        shouldTrigger = true;
      }
      
      if (rule.condition.count && rule.condition.timeWindow) {
        const recentErrors = this.errorLogs.filter(log => 
          Date.now() - log.timestamp < rule.condition.timeWindow! * 60 * 1000 &&
          log.level === rule.condition.level
        );
        
        shouldTrigger = recentErrors.length >= rule.condition.count;
      }
      
      if (shouldTrigger) {
        this.triggerAlert(rule, errorLog);
      }
    });
  }

  /**
   * 触发报警
   */
  private triggerAlert(rule: AlertRule, errorLog: ErrorLog): void {
    console.warn(`🚨 报警触发: ${rule.name}`, errorLog);
    
    rule.lastTriggered = Date.now();
    
    switch (rule.action) {
      case 'notify':
        this.sendNotification(rule, errorLog);
        break;
      case 'email':
        this.sendEmail(rule, errorLog);
        break;
      case 'webhook':
        this.sendWebhook(rule, errorLog);
        break;
      case 'log':
        this.logError('info', 'ui', `Alert triggered: ${rule.name}`, undefined, {
          rule: rule.name,
          triggeringError: errorLog.id
        });
        break;
    }
  }

  /**
   * 处理严重错误
   */
  private handleCriticalError(errorLog: ErrorLog): void {
    // 立即发送到云端
    this.cloudAdapter.set(`critical_error_${errorLog.id}`, errorLog);
    
    // 显示用户友好的错误提示
    if (errorLog.level === 'critical') {
      this.showUserErrorMessage(errorLog);
    }
  }

  /**
   * 生成摘要
   */
  private generateSummary(logs: ErrorLog[]): ErrorReport['summary'] {
    const totalErrors = logs.length;
    const criticalErrors = logs.filter(log => log.level === 'critical').length;
    const newErrors = logs.filter(log => !log.resolved).length;
    const resolvedErrors = logs.filter(log => log.resolved).length;
    
    // 计算错误率（每小时错误数）
    const timeSpan = Math.max(1, (Date.now() - logs[0]?.timestamp) / (60 * 60 * 1000));
    const errorRate = totalErrors / timeSpan;
    
    // 统计类别
    const categoryCount: Record<string, number> = {};
    logs.forEach(log => {
      categoryCount[log.category] = (categoryCount[log.category] || 0) + 1;
    });
    
    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalErrors,
      criticalErrors,
      newErrors,
      resolvedErrors,
      errorRate,
      topCategories
    };
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(logs: ErrorLog[], start: number, end: number): ErrorReport['trends'] {
    const duration = end - start;
    const midPoint = start + duration / 2;
    
    const firstHalf = logs.filter(log => log.timestamp < midPoint).length;
    const secondHalf = logs.filter(log => log.timestamp >= midPoint).length;
    
    let direction: ErrorReport['trends']['direction'] = 'stable';
    let changePercent = 0;
    
    if (firstHalf > 0) {
      changePercent = ((secondHalf - firstHalf) / firstHalf) * 100;
      
      if (changePercent > 10) {
        direction = 'increasing';
      } else if (changePercent < -10) {
        direction = 'decreasing';
      }
    }
    
    const prediction = this.generateTrendPrediction(direction, changePercent);
    
    return {
      direction,
      changePercent,
      prediction
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(logs: ErrorLog[], patterns: ErrorPattern[]): ErrorReport['recommendations'] {
    const recommendations: ErrorReport['recommendations'] = [];
    
    // 基于错误模式的建议
    patterns.slice(0, 5).forEach(pattern => {
      if (pattern.suggestedFix && pattern.occurrences > 5) {
        recommendations.push({
          priority: pattern.severity === 'critical' ? 'high' : pattern.severity === 'error' ? 'medium' : 'low',
          category: pattern.category,
          issue: pattern.description,
          solution: pattern.suggestedFix,
          impact: `已发生${pattern.occurrences}次，需要及时处理`
        });
      }
    });
    
    // 基于错误频率的建议
    const criticalCount = logs.filter(log => log.level === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push({
        priority: 'high',
        category: 'stability',
        issue: `检测到${criticalCount}个严重错误`,
        solution: '立即检查系统稳定性，考虑回滚最近的更改',
        impact: '严重影响用户体验，需要紧急处理'
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // =================== 工具方法 ===================

  private generateLogId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'anonymous';
  }

  private generateTags(category: string, level: string, error?: Error): string[] {
    const tags = [category, level];
    
    if (error) {
      tags.push(error.name);
      
      if (error.stack?.includes('node_modules')) {
        tags.push('third_party');
      }
    }
    
    return tags;
  }

  private generateTrendPrediction(direction: string, changePercent: number): string {
    switch (direction) {
      case 'increasing':
        return `错误数量呈上升趋势（+${changePercent.toFixed(1)}%），建议关注系统稳定性`;
      case 'decreasing':
        return `错误数量呈下降趋势（${changePercent.toFixed(1)}%），系统稳定性正在改善`;
      default:
        return '错误数量相对稳定，继续保持监控';
    }
  }

  private showUserErrorMessage(errorLog: ErrorLog): void {
    // 这里应该集成用户通知系统
    console.error('系统遇到严重错误，请刷新页面或联系技术支持');
  }

  private sendNotification(rule: AlertRule, errorLog: ErrorLog): void {
    console.warn('发送通知:', rule.name, errorLog.message);
  }

  private sendEmail(rule: AlertRule, errorLog: ErrorLog): void {
    console.warn('发送邮件报警:', rule.name, errorLog.message);
  }

  private sendWebhook(rule: AlertRule, errorLog: ErrorLog): void {
    console.warn('发送webhook:', rule.name, errorLog.message);
  }

  private async loadHistoricalPatterns(): Promise<void> {
    // 从云端加载历史错误模式
  }

  private async saveErrorReport(report: ErrorReport): Promise<void> {
    try {
      await this.cloudAdapter.set(`error_report_${report.id}`, report);
    } catch (error) {
      console.error('保存错误报告失败:', error);
    }
  }

  private async updateErrorLog(errorLog: ErrorLog): Promise<void> {
    try {
      await this.cloudAdapter.set(`error_log_${errorLog.id}`, errorLog);
    } catch (error) {
      console.error('更新错误日志失败:', error);
    }
  }

  private async saveAlertRule(rule: AlertRule): Promise<void> {
    try {
      await this.cloudAdapter.set(`alert_rule_${rule.id}`, rule);
    } catch (error) {
      console.error('保存报警规则失败:', error);
    }
  }

  /**
   * 获取错误监控状态
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    totalLogs: number;
    recentErrors: number;
    patterns: number;
    alertRules: number;
  } {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentErrors = this.errorLogs.filter(log => log.timestamp > oneHourAgo).length;
    
    return {
      isMonitoring: this.isMonitoring,
      totalLogs: this.errorLogs.length,
      recentErrors,
      patterns: this.errorPatterns.size,
      alertRules: this.alertRules.length
    };
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    topPatterns: ErrorPattern[];
    recentTrends: any;
  } {
    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    this.errorLogs.forEach(log => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });
    
    const topPatterns = Array.from(this.errorPatterns.values())
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);
    
    return {
      byLevel,
      byCategory,
      topPatterns,
      recentTrends: this.analyzeTrends(
        this.errorLogs.slice(-100), 
        Date.now() - 24 * 60 * 60 * 1000, 
        Date.now()
      )
    };
  }
}

export default ErrorMonitoringSystem;