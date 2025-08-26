/**
 * CDN和缓存优化系统 - Week 16核心功能
 * 
 * 功能特性：
 * 1. 智能CDN配置和管理
 * 2. 多级缓存策略实现
 * 3. 资源预加载和预取
 * 4. 缓存失效和更新机制
 * 5. 网络优化和压缩策略
 * 6. 性能监控和优化建议
 */

import { CloudAdapter } from '../storage/cloud-adapter';

export interface CDNConfig {
  // CDN配置
  cdn: {
    enabled: boolean;
    provider: 'cloudflare' | 'aws' | 'azure' | 'custom';
    baseUrl: string;
    regions: string[];
    enableGeoOptimization: boolean;
  };
  
  // 缓存配置
  cache: {
    // 浏览器缓存
    browser: {
      staticAssets: number; // 秒
      dynamicContent: number;
      apiResponses: number;
    };
    
    // ServiceWorker缓存
    serviceWorker: {
      enabled: boolean;
      strategy: 'cache_first' | 'network_first' | 'cache_only' | 'network_only' | 'stale_while_revalidate';
      maxAge: number;
      maxEntries: number;
    };
    
    // 内存缓存
    memory: {
      enabled: boolean;
      maxSize: number; // MB
      ttl: number; // 秒
    };
  };
  
  // 压缩配置
  compression: {
    gzip: boolean;
    brotli: boolean;
    minifyCSS: boolean;
    minifyJS: boolean;
    optimizeImages: boolean;
  };
  
  // 预加载配置
  preload: {
    criticalResources: string[];
    prefetchResources: string[];
    preconnectDomains: string[];
  };
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
}

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  totalSize: number;
  entryCount: number;
  averageResponseTime: number;
  topMisses: Array<{
    key: string;
    count: number;
  }>;
}

export interface CDNStats {
  totalRequests: number;
  cacheHitRatio: number;
  bandwidth: number;
  averageLatency: number;
  errorRate: number;
  topAssets: Array<{
    url: string;
    requests: number;
    bandwidth: number;
  }>;
  geographicDistribution: Record<string, number>;
}

export interface OptimizationReport {
  id: string;
  generatedAt: number;
  cacheStats: CacheStats;
  cdnStats: CDNStats;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'performance' | 'cost' | 'reliability';
    issue: string;
    solution: string;
    expectedImprovement: string;
  }>;
  performanceMetrics: {
    loadTime: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
  };
}

export class CDNCacheOptimizer {
  private cloudAdapter: CloudAdapter;
  private config: CDNConfig;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private cacheStats: CacheStats;
  private serviceWorkerRegistration?: ServiceWorkerRegistration;
  private isOptimizing: boolean = false;

  constructor(cloudAdapter: CloudAdapter, config: CDNConfig) {
    this.cloudAdapter = cloudAdapter;
    this.config = config;
    this.cacheStats = this.initializeCacheStats();
  }

  /**
   * 启动CDN和缓存优化
   */
  async initialize(): Promise<void> {
    console.log('🚀 启动CDN和缓存优化系统...');
    
    try {
      this.isOptimizing = true;
      
      // 初始化内存缓存
      if (this.config.cache.memory.enabled) {
        this.initializeMemoryCache();
      }
      
      // 初始化ServiceWorker缓存
      if (this.config.cache.serviceWorker.enabled) {
        await this.initializeServiceWorkerCache();
      }
      
      // 配置浏览器缓存头
      this.configureBrowserCache();
      
      // 设置资源预加载
      this.setupResourcePreloading();
      
      // 启用压缩优化
      this.enableCompressionOptimization();
      
      // 启动性能监控
      this.startPerformanceMonitoring();
      
      console.log('✅ CDN和缓存优化系统初始化完成');
    } catch (error) {
      console.error('❌ CDN和缓存优化初始化失败:', error);
      this.isOptimizing = false;
      throw error;
    }
  }

  /**
   * 获取缓存数据
   */
  async get(key: string): Promise<any> {
    const startTime = Date.now();
    
    // 1. 检查内存缓存
    if (this.config.cache.memory.enabled) {
      const memoryResult = this.getFromMemoryCache(key);
      if (memoryResult) {
        this.recordCacheHit(key, Date.now() - startTime);
        return memoryResult;
      }
    }
    
    // 2. 检查ServiceWorker缓存
    if (this.config.cache.serviceWorker.enabled && 'serviceWorker' in navigator) {
      const swResult = await this.getFromServiceWorkerCache(key);
      if (swResult) {
        // 回填内存缓存
        if (this.config.cache.memory.enabled) {
          this.setInMemoryCache(key, swResult);
        }
        this.recordCacheHit(key, Date.now() - startTime);
        return swResult;
      }
    }
    
    // 3. 检查云端缓存
    try {
      const cloudResult = await this.cloudAdapter.get(key);
      if (cloudResult) {
        // 回填各级缓存
        if (this.config.cache.memory.enabled) {
          this.setInMemoryCache(key, cloudResult);
        }
        if (this.config.cache.serviceWorker.enabled) {
          await this.setInServiceWorkerCache(key, cloudResult);
        }
        this.recordCacheHit(key, Date.now() - startTime);
        return cloudResult;
      }
    } catch (error) {
      console.warn('云端缓存获取失败:', error);
    }
    
    // 缓存未命中
    this.recordCacheMiss(key);
    return null;
  }

  /**
   * 设置缓存数据
   */
  async set(key: string, data: any, options?: { ttl?: number; tags?: string[] }): Promise<void> {
    const ttl = options?.ttl || this.config.cache.memory.ttl;
    const tags = options?.tags || [];
    
    // 1. 设置内存缓存
    if (this.config.cache.memory.enabled) {
      this.setInMemoryCache(key, data, ttl, tags);
    }
    
    // 2. 设置ServiceWorker缓存
    if (this.config.cache.serviceWorker.enabled) {
      await this.setInServiceWorkerCache(key, data, ttl);
    }
    
    // 3. 设置云端缓存
    try {
      await this.cloudAdapter.set(key, data);
    } catch (error) {
      console.warn('云端缓存设置失败:', error);
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    // 删除内存缓存
    this.memoryCache.delete(key);
    
    // 删除ServiceWorker缓存
    if (this.config.cache.serviceWorker.enabled && this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.active?.postMessage({
        type: 'DELETE_CACHE',
        key
      });
    }
    
    // 删除云端缓存
    try {
      await this.cloudAdapter.delete(key);
    } catch (error) {
      console.warn('云端缓存删除失败:', error);
    }
  }

  /**
   * 按标签删除缓存
   */
  async deleteByTag(tag: string): Promise<void> {
    // 删除内存缓存中的标签数据
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags.includes(tag)) {
        this.memoryCache.delete(key);
      }
    }
    
    // 通知ServiceWorker删除标签数据
    if (this.config.cache.serviceWorker.enabled && this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.active?.postMessage({
        type: 'DELETE_BY_TAG',
        tag
      });
    }
  }

  /**
   * 预加载资源
   */
  async preloadResources(): Promise<void> {
    console.log('📦 开始预加载关键资源...');
    
    const { criticalResources, prefetchResources, preconnectDomains } = this.config.preload;
    
    // 预连接域名
    preconnectDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      document.head.appendChild(link);
    });
    
    // 预加载关键资源
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = this.getResourceType(resource);
      document.head.appendChild(link);
    });
    
    // 在空闲时预取资源
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        prefetchResources.forEach(resource => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = resource;
          document.head.appendChild(link);
        });
      });
    }
  }

  /**
   * 优化图片加载
   */
  optimizeImages(): void {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      // 添加懒加载
      if ('loading' in HTMLImageElement.prototype) {
        img.loading = 'lazy';
      }
      
      // 响应式图片
      if (!img.srcset && img.src) {
        const src = img.src;
        const basename = src.substring(0, src.lastIndexOf('.'));
        const extension = src.substring(src.lastIndexOf('.'));
        
        img.srcset = [
          `${basename}_320w${extension} 320w`,
          `${basename}_640w${extension} 640w`,
          `${basename}_1024w${extension} 1024w`
        ].join(', ');
      }
      
      // WebP支持检测
      if (this.supportsWebP()) {
        this.convertImageToWebP(img);
      }
    });
  }

  /**
   * 生成优化报告
   */
  async generateOptimizationReport(): Promise<OptimizationReport> {
    console.log('📊 生成CDN和缓存优化报告...');
    
    const cacheStats = this.getCacheStats();
    const cdnStats = await this.getCDNStats();
    const performanceMetrics = this.getPerformanceMetrics();
    const recommendations = this.generateRecommendations(cacheStats, cdnStats, performanceMetrics);
    
    const report: OptimizationReport = {
      id: `optimization_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: Date.now(),
      cacheStats,
      cdnStats,
      recommendations,
      performanceMetrics
    };
    
    // 保存报告
    await this.saveOptimizationReport(report);
    
    return report;
  }

  // =================== 私有方法 ===================

  /**
   * 初始化内存缓存
   */
  private initializeMemoryCache(): void {
    // 定期清理过期缓存
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // 每分钟清理一次
    
    // 定期检查内存使用
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // 每30秒检查一次
  }

  /**
   * 初始化ServiceWorker缓存
   */
  private async initializeServiceWorkerCache(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.serviceWorkerRegistration = registration;
        
        // 配置缓存策略
        registration.active?.postMessage({
          type: 'CONFIGURE_CACHE',
          config: this.config.cache.serviceWorker
        });
        
        console.log('✅ ServiceWorker缓存初始化成功');
      } catch (error) {
        console.error('❌ ServiceWorker缓存初始化失败:', error);
      }
    }
  }

  /**
   * 配置浏览器缓存
   */
  private configureBrowserCache(): void {
    // 这通常在服务器端配置，这里只是客户端建议
    const cacheHeaders = {
      'Cache-Control': `public, max-age=${this.config.cache.browser.staticAssets}`,
      'ETag': true,
      'Last-Modified': true
    };
    
    console.log('建议服务器配置缓存头:', cacheHeaders);
  }

  /**
   * 设置资源预加载
   */
  private setupResourcePreloading(): void {
    // 在DOM加载完成后预加载资源
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.preloadResources();
      });
    } else {
      this.preloadResources();
    }
  }

  /**
   * 启用压缩优化
   */
  private enableCompressionOptimization(): void {
    if (this.config.compression.optimizeImages) {
      this.optimizeImages();
    }
    
    // 其他压缩配置通常在构建时或服务器端处理
    console.log('建议构建工具启用:', {
      gzip: this.config.compression.gzip,
      brotli: this.config.compression.brotli,
      minifyCSS: this.config.compression.minifyCSS,
      minifyJS: this.config.compression.minifyJS
    });
  }

  /**
   * 启动性能监控
   */
  private startPerformanceMonitoring(): void {
    // 监控缓存性能
    setInterval(() => {
      this.updateCacheStats();
    }, 30000); // 每30秒更新统计
    
    // 监控网络性能
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            this.processNavigationEntry(entry as PerformanceNavigationTiming);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('性能监控设置失败:', error);
      }
    }
  }

  /**
   * 内存缓存操作
   */
  private getFromMemoryCache(key: string): any {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  private setInMemoryCache(key: string, data: any, ttl?: number, tags: string[] = []): void {
    const currentTTL = ttl || this.config.cache.memory.ttl;
    const size = this.estimateSize(data);
    
    // 检查内存限制
    if (this.getTotalCacheSize() + size > this.config.cache.memory.maxSize * 1024 * 1024) {
      this.evictLeastRecentlyUsed();
    }
    
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + currentTTL * 1000,
      size,
      accessCount: 1,
      lastAccessed: Date.now(),
      tags
    };
    
    this.memoryCache.set(key, entry);
  }

  /**
   * ServiceWorker缓存操作
   */
  private async getFromServiceWorkerCache(key: string): Promise<any> {
    return new Promise((resolve) => {
      if (!this.serviceWorkerRegistration) {
        resolve(null);
        return;
      }
      
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.result);
      };
      
      this.serviceWorkerRegistration.active?.postMessage({
        type: 'GET_CACHE',
        key
      }, [messageChannel.port2]);
    });
  }

  private async setInServiceWorkerCache(key: string, data: any, ttl?: number): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      return;
    }
    
    this.serviceWorkerRegistration.active?.postMessage({
      type: 'SET_CACHE',
      key,
      data,
      ttl
    });
  }

  /**
   * 缓存统计
   */
  private recordCacheHit(key: string, responseTime: number): void {
    this.cacheStats.totalHits++;
    this.cacheStats.hitRate = this.cacheStats.totalHits / (this.cacheStats.totalHits + this.cacheStats.totalMisses);
    this.cacheStats.averageResponseTime = (this.cacheStats.averageResponseTime + responseTime) / 2;
  }

  private recordCacheMiss(key: string): void {
    this.cacheStats.totalMisses++;
    this.cacheStats.missRate = this.cacheStats.totalMisses / (this.cacheStats.totalHits + this.cacheStats.totalMisses);
    
    // 记录热门未命中
    const existingMiss = this.cacheStats.topMisses.find(miss => miss.key === key);
    if (existingMiss) {
      existingMiss.count++;
    } else {
      this.cacheStats.topMisses.push({ key, count: 1 });
    }
    
    // 保持前10个
    this.cacheStats.topMisses.sort((a, b) => b.count - a.count);
    if (this.cacheStats.topMisses.length > 10) {
      this.cacheStats.topMisses = this.cacheStats.topMisses.slice(0, 10);
    }
  }

  /**
   * 缓存清理
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }

  private evictLeastRecentlyUsed(): void {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // 删除最少使用的25%
    const toDelete = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toDelete; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  private checkMemoryUsage(): void {
    const totalSize = this.getTotalCacheSize();
    const maxSize = this.config.cache.memory.maxSize * 1024 * 1024;
    
    if (totalSize > maxSize * 0.8) { // 80%阈值
      console.warn('内存缓存使用率过高，开始清理...');
      this.evictLeastRecentlyUsed();
    }
  }

  /**
   * 工具方法
   */
  private initializeCacheStats(): CacheStats {
    return {
      hitRate: 0,
      missRate: 0,
      totalHits: 0,
      totalMisses: 0,
      totalSize: 0,
      entryCount: 0,
      averageResponseTime: 0,
      topMisses: []
    };
  }

  private updateCacheStats(): void {
    this.cacheStats.entryCount = this.memoryCache.size;
    this.cacheStats.totalSize = this.getTotalCacheSize();
  }

  private getTotalCacheSize(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  private estimateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'css': 'style',
      'js': 'script',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'webp': 'image',
      'svg': 'image',
      'mp4': 'video',
      'webm': 'video',
      'mp3': 'audio',
      'wav': 'audio'
    };
    
    return typeMap[extension || ''] || 'document';
  }

  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  private convertImageToWebP(img: HTMLImageElement): void {
    // 这里应该实现WebP转换逻辑
    console.log('建议使用WebP格式:', img.src);
  }

  private processNavigationEntry(entry: PerformanceNavigationTiming): void {
    // 处理导航性能数据
    const loadTime = entry.loadEventEnd - entry.navigationStart;
    console.log('页面加载时间:', loadTime);
  }

  private getCacheStats(): CacheStats {
    this.updateCacheStats();
    return { ...this.cacheStats };
  }

  private async getCDNStats(): Promise<CDNStats> {
    // 模拟CDN统计数据
    return {
      totalRequests: 1000,
      cacheHitRatio: 0.85,
      bandwidth: 1024 * 1024 * 100, // 100MB
      averageLatency: 50,
      errorRate: 0.01,
      topAssets: [],
      geographicDistribution: {}
    };
  }

  private getPerformanceMetrics(): OptimizationReport['performanceMetrics'] {
    return {
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      firstContentfulPaint: 0, // 需要通过PerformanceObserver获取
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0
    };
  }

  private generateRecommendations(
    cacheStats: CacheStats,
    cdnStats: CDNStats,
    performanceMetrics: OptimizationReport['performanceMetrics']
  ): OptimizationReport['recommendations'] {
    const recommendations: OptimizationReport['recommendations'] = [];
    
    // 缓存命中率建议
    if (cacheStats.hitRate < 0.8) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        issue: `缓存命中率较低 (${(cacheStats.hitRate * 100).toFixed(1)}%)`,
        solution: '增加缓存时间，优化缓存策略',
        expectedImprovement: '提升20-40%的响应速度'
      });
    }
    
    // CDN命中率建议
    if (cdnStats.cacheHitRatio < 0.9) {
      recommendations.push({
        priority: 'medium',
        category: 'cost',
        issue: `CDN缓存命中率有提升空间 (${(cdnStats.cacheHitRatio * 100).toFixed(1)}%)`,
        solution: '优化缓存头设置，增加预热策略',
        expectedImprovement: '减少10-20%的带宽成本'
      });
    }
    
    // 加载时间建议
    if (performanceMetrics.loadTime > 3000) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        issue: '页面加载时间过长',
        solution: '启用资源预加载，优化关键渲染路径',
        expectedImprovement: '减少30-50%的加载时间'
      });
    }
    
    return recommendations;
  }

  private async saveOptimizationReport(report: OptimizationReport): Promise<void> {
    try {
      await this.cloudAdapter.set(`optimization_report_${report.id}`, report);
    } catch (error) {
      console.error('保存优化报告失败:', error);
    }
  }

  /**
   * 获取优化器状态
   */
  getOptimizerStatus(): {
    isOptimizing: boolean;
    cacheStats: CacheStats;
    memoryUsage: number;
    serviceWorkerEnabled: boolean;
  } {
    return {
      isOptimizing: this.isOptimizing,
      cacheStats: this.getCacheStats(),
      memoryUsage: this.getTotalCacheSize(),
      serviceWorkerEnabled: !!this.serviceWorkerRegistration
    };
  }

  /**
   * 清除所有缓存
   */
  async clearAllCache(): Promise<void> {
    // 清除内存缓存
    this.memoryCache.clear();
    
    // 清除ServiceWorker缓存
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.active?.postMessage({
        type: 'CLEAR_ALL_CACHE'
      });
    }
    
    console.log('✅ 所有缓存已清除');
  }

  /**
   * 停止优化器
   */
  stop(): void {
    this.isOptimizing = false;
    console.log('🛑 CDN和缓存优化器已停止');
  }
}

export default CDNCacheOptimizer;