/**
 * 生产环境安全管理系统 - Week 16核心功能
 * 
 * 功能特性：
 * 1. API密钥和敏感信息管理
 * 2. CSRF和XSS攻击防护
 * 3. 输入验证和数据清理
 * 4. 会话安全管理
 * 5. 安全审计日志
 * 6. 安全配置合规检查
 */

import { CloudAdapter } from '../storage/cloud-adapter';
import CryptoJS from 'crypto-js';

export interface SecurityConfig {
  // API安全配置
  apiSecurity: {
    enableRateLimiting: boolean;
    maxRequestsPerMinute: number;
    enableAPIKeyRotation: boolean;
    keyRotationIntervalDays: number;
  };
  
  // 会话安全配置
  sessionSecurity: {
    enableSecureCookies: boolean;
    sessionTimeoutMinutes: number;
    enableSessionFingerprinting: boolean;
    maxConcurrentSessions: number;
  };
  
  // 内容安全配置
  contentSecurity: {
    enableCSP: boolean;
    enableXSSProtection: boolean;
    enableClickjackingProtection: boolean;
    allowedOrigins: string[];
  };
  
  // 数据安全配置
  dataSecurity: {
    enableEncryption: boolean;
    encryptionAlgorithm: string;
    enableDataMasking: boolean;
    sensitiveFields: string[];
  };
  
  // 合规配置
  compliance: {
    enableGDPR: boolean;
    enableCCPA: boolean;
    dataRetentionDays: number;
    enableAuditLogging: boolean;
  };
}

export interface SecurityViolation {
  id: string;
  timestamp: number;
  type: 'xss_attempt' | 'csrf_attempt' | 'rate_limit_exceeded' | 'suspicious_activity' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: {
    ip: string;
    userAgent: string;
    userId?: string;
    sessionId?: string;
  };
  details: {
    endpoint?: string;
    payload?: any;
    headers?: Record<string, string>;
    description: string;
  };
  action: 'blocked' | 'logged' | 'alerted';
}

export interface SecurityAuditLog {
  id: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'blocked';
  metadata: Record<string, any>;
  ip: string;
  userAgent: string;
}

export interface SecurityReport {
  id: string;
  generatedAt: number;
  timeRange: { start: number; end: number };
  summary: {
    totalViolations: number;
    criticalViolations: number;
    blockedAttempts: number;
    securityScore: number; // 0-100
  };
  violations: SecurityViolation[];
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    issue: string;
    solution: string;
    impact: string;
  }>;
  complianceStatus: {
    gdpr: 'compliant' | 'non_compliant' | 'partial';
    ccpa: 'compliant' | 'non_compliant' | 'partial';
    securityBestPractices: 'compliant' | 'non_compliant' | 'partial';
  };
}

export class ProductionSecurityManager {
  private cloudAdapter: CloudAdapter;
  private config: SecurityConfig;
  private violations: SecurityViolation[] = [];
  private auditLogs: SecurityAuditLog[] = [];
  private encryptionKey: string;
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor(cloudAdapter: CloudAdapter, config: SecurityConfig) {
    this.cloudAdapter = cloudAdapter;
    this.config = config;
    this.encryptionKey = this.generateEncryptionKey();
    
    this.setupSecurityMiddleware();
    this.startSecurityMonitoring();
  }

  /**
   * 初始化安全系统
   */
  async initialize(): Promise<void> {
    console.log('🔒 初始化生产环境安全系统...');
    
    try {
      // 设置内容安全策略
      if (this.config.contentSecurity.enableCSP) {
        this.setupContentSecurityPolicy();
      }
      
      // 设置XSS保护
      if (this.config.contentSecurity.enableXSSProtection) {
        this.setupXSSProtection();
      }
      
      // 设置点击劫持保护
      if (this.config.contentSecurity.enableClickjackingProtection) {
        this.setupClickjackingProtection();
      }
      
      // 启动会话安全监控
      this.setupSessionSecurity();
      
      // 启动数据加密
      if (this.config.dataSecurity.enableEncryption) {
        await this.setupDataEncryption();
      }
      
      console.log('✅ 安全系统初始化完成');
    } catch (error) {
      console.error('❌ 安全系统初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证和清理用户输入
   */
  sanitizeInput(input: any, type: 'string' | 'number' | 'email' | 'url' | 'json' = 'string'): any {
    if (input === null || input === undefined) {
      return null;
    }

    switch (type) {
      case 'string':
        return this.sanitizeString(String(input));
      case 'number':
        return this.sanitizeNumber(input);
      case 'email':
        return this.sanitizeEmail(String(input));
      case 'url':
        return this.sanitizeURL(String(input));
      case 'json':
        return this.sanitizeJSON(input);
      default:
        return this.sanitizeString(String(input));
    }
  }

  /**
   * 检测XSS攻击
   */
  detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 检测SQL注入
   */
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(UNION\s+ALL\s+SELECT)/gi,
      /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
      /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
      /(--|#|\/\*|\*\/)/g
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * API访问频率限制
   */
  checkRateLimit(identifier: string, maxRequests: number = this.config.apiSecurity.maxRequestsPerMinute): boolean {
    if (!this.config.apiSecurity.enableRateLimiting) {
      return true;
    }

    const now = Date.now();
    const windowStart = now - 60000; // 1分钟窗口
    
    if (!this.rateLimitTracker.has(identifier)) {
      this.rateLimitTracker.set(identifier, []);
    }
    
    const requests = this.rateLimitTracker.get(identifier)!;
    
    // 清理过期的请求记录
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= maxRequests) {
      this.recordSecurityViolation({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        source: {
          ip: this.getCurrentIP(),
          userAgent: navigator.userAgent
        },
        details: {
          description: `Rate limit exceeded: ${validRequests.length} requests in 1 minute`,
          endpoint: window.location.pathname
        }
      });
      return false;
    }
    
    validRequests.push(now);
    this.rateLimitTracker.set(identifier, validRequests);
    return true;
  }

  /**
   * 数据加密
   */
  encryptData(data: any): string {
    if (!this.config.dataSecurity.enableEncryption) {
      return JSON.stringify(data);
    }

    try {
      const jsonString = JSON.stringify(data);
      return CryptoJS.AES.encrypt(jsonString, this.encryptionKey).toString();
    } catch (error) {
      console.error('数据加密失败:', error);
      return JSON.stringify(data);
    }
  }

  /**
   * 数据解密
   */
  decryptData(encryptedData: string): any {
    if (!this.config.dataSecurity.enableEncryption) {
      try {
        return JSON.parse(encryptedData);
      } catch {
        return encryptedData;
      }
    }

    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('数据解密失败:', error);
      try {
        return JSON.parse(encryptedData);
      } catch {
        return encryptedData;
      }
    }
  }

  /**
   * 敏感数据脱敏
   */
  maskSensitiveData(data: any): any {
    if (!this.config.dataSecurity.enableDataMasking) {
      return data;
    }

    const masked = { ...data };
    
    this.config.dataSecurity.sensitiveFields.forEach(field => {
      if (masked[field]) {
        masked[field] = this.maskValue(String(masked[field]));
      }
    });

    return masked;
  }

  /**
   * 会话安全验证
   */
  validateSession(sessionId: string): boolean {
    // 这里应该实现会话验证逻辑
    // 检查会话是否有效、是否过期、是否被劫持等
    
    if (!sessionId) {
      return false;
    }

    // 简化的会话验证
    const sessionData = this.getSessionData(sessionId);
    if (!sessionData) {
      return false;
    }

    // 检查会话是否过期
    const now = Date.now();
    const sessionTimeout = this.config.sessionSecurity.sessionTimeoutMinutes * 60 * 1000;
    if (now - sessionData.lastActivity > sessionTimeout) {
      this.invalidateSession(sessionId);
      return false;
    }

    // 更新最后活动时间
    this.updateSessionActivity(sessionId);
    return true;
  }

  /**
   * 记录安全违规
   */
  recordSecurityViolation(violation: Omit<SecurityViolation, 'id' | 'timestamp' | 'action'>): void {
    const fullViolation: SecurityViolation = {
      id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action: this.determineAction(violation.severity),
      ...violation
    };

    this.violations.push(fullViolation);
    
    // 保存到云端
    this.saveViolation(fullViolation);
    
    // 如果是严重违规，立即发出警报
    if (violation.severity === 'critical' || violation.severity === 'high') {
      this.sendSecurityAlert(fullViolation);
    }
  }

  /**
   * 记录审计日志
   */
  recordAuditLog(log: Omit<SecurityAuditLog, 'id' | 'timestamp' | 'ip' | 'userAgent'>): void {
    if (!this.config.compliance.enableAuditLogging) {
      return;
    }

    const fullLog: SecurityAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ip: this.getCurrentIP(),
      userAgent: navigator.userAgent,
      ...log
    };

    this.auditLogs.push(fullLog);
    
    // 保存到云端
    this.saveAuditLog(fullLog);
  }

  /**
   * 生成安全报告
   */
  async generateSecurityReport(timeRange?: { start: number; end: number }): Promise<SecurityReport> {
    const end = timeRange?.end || Date.now();
    const start = timeRange?.start || (end - 24 * 60 * 60 * 1000);

    const relevantViolations = this.violations.filter(v => 
      v.timestamp >= start && v.timestamp <= end
    );

    const summary = {
      totalViolations: relevantViolations.length,
      criticalViolations: relevantViolations.filter(v => v.severity === 'critical').length,
      blockedAttempts: relevantViolations.filter(v => v.action === 'blocked').length,
      securityScore: this.calculateSecurityScore(relevantViolations)
    };

    const recommendations = this.generateSecurityRecommendations(relevantViolations);
    const complianceStatus = this.checkComplianceStatus();

    const report: SecurityReport = {
      id: `security_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: Date.now(),
      timeRange: { start, end },
      summary,
      violations: relevantViolations.slice(0, 100), // 限制报告大小
      recommendations,
      complianceStatus
    };

    // 保存报告
    await this.saveSecurityReport(report);

    return report;
  }

  // =================== 私有方法 ===================

  private setupSecurityMiddleware(): void {
    // 设置全局错误处理
    window.addEventListener('error', (event) => {
      this.recordAuditLog({
        sessionId: this.getCurrentSessionId(),
        action: 'javascript_error',
        resource: event.filename || 'unknown',
        outcome: 'failure',
        metadata: {
          message: event.message,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // 监听未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.recordAuditLog({
        sessionId: this.getCurrentSessionId(),
        action: 'unhandled_promise_rejection',
        resource: 'promise',
        outcome: 'failure',
        metadata: {
          reason: event.reason
        }
      });
    });
  }

  private setupContentSecurityPolicy(): void {
    // 注意：CSP通常在服务器端设置，这里只是客户端检查
    const allowedOrigins = this.config.contentSecurity.allowedOrigins;
    
    // 检查当前页面的加载源
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
      const src = (script as HTMLScriptElement).src;
      if (src && !this.isAllowedOrigin(src, allowedOrigins)) {
        console.warn('潜在的CSP违规: 未授权的脚本源', src);
        this.recordSecurityViolation({
          type: 'suspicious_activity',
          severity: 'medium',
          source: {
            ip: this.getCurrentIP(),
            userAgent: navigator.userAgent
          },
          details: {
            description: `Unauthorized script source: ${src}`,
            endpoint: window.location.pathname
          }
        });
      }
    });
  }

  private setupXSSProtection(): void {
    // 监控DOM变化，检测可能的XSS注入
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'SCRIPT' && !element.hasAttribute('data-trusted')) {
                console.warn('检测到未授权的脚本元素');
                this.recordSecurityViolation({
                  type: 'xss_attempt',
                  severity: 'high',
                  source: {
                    ip: this.getCurrentIP(),
                    userAgent: navigator.userAgent
                  },
                  details: {
                    description: 'Unauthorized script element detected',
                    payload: element.outerHTML
                  }
                });
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private setupClickjackingProtection(): void {
    // 检查是否在iframe中运行
    if (window.top !== window.self) {
      console.warn('检测到页面在iframe中运行，可能存在点击劫持风险');
      this.recordSecurityViolation({
        type: 'suspicious_activity',
        severity: 'medium',
        source: {
          ip: this.getCurrentIP(),
          userAgent: navigator.userAgent
        },
        details: {
          description: 'Page running in iframe - potential clickjacking',
          endpoint: window.location.pathname
        }
      });
    }
  }

  private setupSessionSecurity(): void {
    // 监控会话活动
    setInterval(() => {
      const sessionId = this.getCurrentSessionId();
      if (sessionId && !this.validateSession(sessionId)) {
        window.location.href = '/login';
      }
    }, 60000); // 每分钟检查一次
  }

  private async setupDataEncryption(): Promise<void> {
    // 初始化加密系统
    if (!this.encryptionKey) {
      this.encryptionKey = this.generateEncryptionKey();
    }
  }

  private startSecurityMonitoring(): void {
    // 定期清理旧的违规记录
    setInterval(() => {
      this.cleanupOldViolations();
    }, 60 * 60 * 1000); // 每小时清理一次

    // 定期生成安全报告
    setInterval(async () => {
      try {
        await this.generateSecurityReport();
      } catch (error) {
        console.error('安全报告生成失败:', error);
      }
    }, 6 * 60 * 60 * 1000); // 每6小时生成一次
  }

  private sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // 移除HTML标签
      .replace(/['"]/g, '') // 移除引号
      .replace(/javascript:/gi, '') // 移除JavaScript协议
      .trim();
  }

  private sanitizeNumber(input: any): number | null {
    const num = Number(input);
    return isNaN(num) ? null : num;
  }

  private sanitizeEmail(input: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input) ? input : null;
  }

  private sanitizeURL(input: string): string | null {
    try {
      const url = new URL(input);
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  }

  private sanitizeJSON(input: any): any {
    try {
      const jsonString = typeof input === 'string' ? input : JSON.stringify(input);
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }

  private maskValue(value: string): string {
    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }

  private generateEncryptionKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  private getCurrentIP(): string {
    // 在生产环境中，这应该通过服务器端获取
    return 'client_ip';
  }

  private getCurrentSessionId(): string {
    // 从localStorage、sessionStorage或cookie中获取会话ID
    return sessionStorage.getItem('sessionId') || 'anonymous';
  }

  private getSessionData(sessionId: string): any {
    // 这里应该从安全存储中获取会话数据
    return {
      lastActivity: Date.now() - 30000 // 30秒前
    };
  }

  private updateSessionActivity(sessionId: string): void {
    // 更新会话最后活动时间
    sessionStorage.setItem('lastActivity', Date.now().toString());
  }

  private invalidateSession(sessionId: string): void {
    // 失效会话
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('lastActivity');
  }

  private isAllowedOrigin(url: string, allowedOrigins: string[]): boolean {
    try {
      const urlObj = new URL(url);
      return allowedOrigins.some(origin => urlObj.origin === origin);
    } catch {
      return false;
    }
  }

  private determineAction(severity: SecurityViolation['severity']): SecurityViolation['action'] {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'blocked';
      case 'medium':
        return 'alerted';
      default:
        return 'logged';
    }
  }

  private calculateSecurityScore(violations: SecurityViolation[]): number {
    let score = 100;
    
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 1;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  private generateSecurityRecommendations(violations: SecurityViolation[]): SecurityReport['recommendations'] {
    const recommendations: SecurityReport['recommendations'] = [];
    
    const xssAttempts = violations.filter(v => v.type === 'xss_attempt').length;
    if (xssAttempts > 0) {
      recommendations.push({
        priority: 'high',
        category: 'XSS防护',
        issue: `检测到${xssAttempts}次XSS攻击尝试`,
        solution: '加强输入验证和输出编码',
        impact: '防止恶意脚本执行'
      });
    }

    const rateLimitViolations = violations.filter(v => v.type === 'rate_limit_exceeded').length;
    if (rateLimitViolations > 5) {
      recommendations.push({
        priority: 'medium',
        category: '访问控制',
        issue: '频繁的速率限制违规',
        solution: '调整速率限制策略或添加验证码',
        impact: '防止暴力攻击和滥用'
      });
    }

    return recommendations;
  }

  private checkComplianceStatus(): SecurityReport['complianceStatus'] {
    return {
      gdpr: this.config.compliance.enableGDPR ? 'compliant' : 'non_compliant',
      ccpa: this.config.compliance.enableCCPA ? 'compliant' : 'non_compliant',
      securityBestPractices: this.violations.filter(v => v.severity === 'critical').length === 0 ? 'compliant' : 'partial'
    };
  }

  private async saveViolation(violation: SecurityViolation): Promise<void> {
    try {
      await this.cloudAdapter.set(`security_violation_${violation.id}`, violation);
    } catch (error) {
      console.error('保存安全违规记录失败:', error);
    }
  }

  private async saveAuditLog(log: SecurityAuditLog): Promise<void> {
    try {
      await this.cloudAdapter.set(`audit_log_${log.id}`, log);
    } catch (error) {
      console.error('保存审计日志失败:', error);
    }
  }

  private async saveSecurityReport(report: SecurityReport): Promise<void> {
    try {
      await this.cloudAdapter.set(`security_report_${report.id}`, report);
    } catch (error) {
      console.error('保存安全报告失败:', error);
    }
  }

  private sendSecurityAlert(violation: SecurityViolation): void {
    console.warn('🚨 安全警报:', violation);
    // 这里可以集成邮件、短信或其他通知服务
  }

  private cleanupOldViolations(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.violations = this.violations.filter(v => v.timestamp > oneWeekAgo);
    this.auditLogs = this.auditLogs.filter(l => l.timestamp > oneWeekAgo);
  }

  /**
   * 获取安全状态概览
   */
  getSecurityStatus(): {
    isEnabled: boolean;
    violationsCount: number;
    lastViolation?: SecurityViolation;
    configuredFeatures: string[];
  } {
    return {
      isEnabled: true,
      violationsCount: this.violations.length,
      lastViolation: this.violations[this.violations.length - 1],
      configuredFeatures: Object.entries(this.config)
        .filter(([_, value]) => typeof value === 'object' && Object.values(value).some(Boolean))
        .map(([key]) => key)
    };
  }
}

export default ProductionSecurityManager;