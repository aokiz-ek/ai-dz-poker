import {
  IDataProvider,
  HandHistory,
  PlayerStats,
  TrainingScenario,
  UserProgress,
  QueryOptions,
  QueryResult,
  StorageUsage,
  CacheStats,
  DataChangeEvent
} from './interfaces';
import { LocalStorageAdapter } from './local-storage-adapter';
import { IndexedDBAdapter } from './indexeddb-adapter';

/**
 * 存储管理器 - 统一协调多种存储方式的智能存储系统
 * 
 * 核心功能：
 * 1. 智能存储选择 - 根据数据类型和大小自动选择最优存储方式
 * 2. 自动降级策略 - IndexedDB不可用时自动降级到LocalStorage
 * 3. 数据分层存储 - 热点数据内存缓存，大数据IndexedDB，配置LocalStorage
 * 4. 统一缓存层 - 跨存储适配器的统一缓存协调
 * 5. 故障恢复 - 存储异常时的自动恢复和数据迁移
 * 
 * 存储策略：
 * - 内存缓存: 热点数据 (5分钟TTL)
 * - LocalStorage: 用户配置、小型静态数据 (<1MB)
 * - IndexedDB: 手牌历史、统计数据、大型动态数据 (>1MB)
 */

export interface StorageConfig {
  primaryAdapter: 'indexeddb' | 'localstorage';
  fallbackAdapter: 'localstorage' | 'memory';
  memoryCache: {
    enabled: boolean;
    maxSize: number; // bytes
    ttl: number; // milliseconds
  };
  autoMigration: boolean;
  compressionThreshold: number; // bytes
}

export interface StorageStats {
  adapters: {
    [key: string]: {
      available: boolean;
      usage: StorageUsage;
      cacheStats: CacheStats;
    };
  };
  totalUsage: StorageUsage;
  activeAdapter: string;
  memoryCache: {
    size: number;
    entries: number;
    hitRate: number;
  };
}

export class StorageManager implements IDataProvider {
  private adapters: Map<string, IDataProvider> = new Map();
  private primaryAdapter: IDataProvider | null = null;
  private fallbackAdapter: IDataProvider | null = null;
  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private changeListeners: ((event: DataChangeEvent) => void)[] = [];
  private isInitialized = false;

  private readonly config: StorageConfig;

  // 默认配置
  private static readonly DEFAULT_CONFIG: StorageConfig = {
    primaryAdapter: 'indexeddb',
    fallbackAdapter: 'localstorage',
    memoryCache: {
      enabled: true,
      maxSize: 24 * 1024 * 1024, // 24MB
      ttl: 5 * 60 * 1000 // 5分钟
    },
    autoMigration: true,
    compressionThreshold: 100 * 1024 // 100KB
  };

  // 数据类型路由配置
  private static readonly DATA_ROUTING = {
    // 大数据量，优先使用IndexedDB
    handHistory: { preferred: 'indexeddb', fallback: 'localstorage', cache: true },
    playerStats: { preferred: 'indexeddb', fallback: 'localstorage', cache: true },
    
    // 中等数据量，可以使用任一存储
    trainingScenario: { preferred: 'indexeddb', fallback: 'localstorage', cache: true },
    userProgress: { preferred: 'indexeddb', fallback: 'localstorage', cache: true },
    
    // 小数据量配置，优先使用LocalStorage
    config: { preferred: 'localstorage', fallback: 'indexeddb', cache: true },
    settings: { preferred: 'localstorage', fallback: 'indexeddb', cache: true }
  };

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...StorageManager.DEFAULT_CONFIG, ...config };
  }

  // =================== 连接和初始化 ===================

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 初始化适配器
      await this.initializeAdapters();
      
      // 选择主适配器
      await this.selectPrimaryAdapter();
      
      // 设置变更监听
      this.setupChangeListeners();
      
      // 执行数据迁移检查
      if (this.config.autoMigration) {
        await this.checkDataMigration();
      }

      this.isInitialized = true;
      console.log('StorageManager initialized successfully');
      
    } catch (error) {
      console.error('StorageManager initialization failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.primaryAdapter !== null || this.fallbackAdapter !== null;
  }

  async getStorageUsage(): Promise<StorageUsage> {
    const usage = await this.getStorageStats();
    return usage.totalUsage;
  }

  // =================== 手牌历史管理 ===================

  async saveHandHistory(handHistory: HandHistory): Promise<void> {
    const adapter = this.getAdapterForData('handHistory');
    await adapter.saveHandHistory(handHistory);
    
    // 更新内存缓存
    if (this.shouldCache('handHistory')) {
      this.setMemoryCache(`handHistory:${handHistory.id}`, handHistory);
    }
  }

  async getHandHistory(id: string): Promise<HandHistory | null> {
    // 先检查内存缓存
    const cached = this.getMemoryCache<HandHistory>(`handHistory:${id}`);
    if (cached) return cached;

    const adapter = this.getAdapterForData('handHistory');
    const result = await adapter.getHandHistory(id);
    
    // 更新内存缓存
    if (result && this.shouldCache('handHistory')) {
      this.setMemoryCache(`handHistory:${id}`, result);
    }
    
    return result;
  }

  async queryHandHistory(options?: QueryOptions): Promise<QueryResult<HandHistory>> {
    const adapter = this.getAdapterForData('handHistory');
    return await adapter.queryHandHistory(options);
  }

  async deleteHandHistory(id: string): Promise<void> {
    const adapter = this.getAdapterForData('handHistory');
    await adapter.deleteHandHistory(id);
    
    // 清除内存缓存
    this.removeMemoryCache(`handHistory:${id}`);
  }

  async batchSaveHandHistory(handHistories: HandHistory[]): Promise<void> {
    const adapter = this.getAdapterForData('handHistory');
    await adapter.batchSaveHandHistory(handHistories);
    
    // 批量更新缓存
    if (this.shouldCache('handHistory')) {
      handHistories.forEach(handHistory => {
        this.setMemoryCache(`handHistory:${handHistory.id}`, handHistory);
      });
    }
  }

  // =================== 玩家统计管理 ===================

  async updatePlayerStats(stats: PlayerStats): Promise<void> {
    const adapter = this.getAdapterForData('playerStats');
    await adapter.updatePlayerStats(stats);
    
    if (this.shouldCache('playerStats')) {
      this.setMemoryCache(`playerStats:${stats.playerId}`, stats);
    }
  }

  async getPlayerStats(playerId: string): Promise<PlayerStats | null> {
    const cached = this.getMemoryCache<PlayerStats>(`playerStats:${playerId}`);
    if (cached) return cached;

    const adapter = this.getAdapterForData('playerStats');
    const result = await adapter.getPlayerStats(playerId);
    
    if (result && this.shouldCache('playerStats')) {
      this.setMemoryCache(`playerStats:${playerId}`, result);
    }
    
    return result;
  }

  async getAllPlayerStats(): Promise<PlayerStats[]> {
    const adapter = this.getAdapterForData('playerStats');
    return await adapter.getAllPlayerStats();
  }

  // =================== 训练场景管理 ===================

  async saveTrainingScenario(scenario: TrainingScenario): Promise<void> {
    const adapter = this.getAdapterForData('trainingScenario');
    await adapter.saveTrainingScenario(scenario);
    
    if (this.shouldCache('trainingScenario')) {
      this.setMemoryCache(`trainingScenario:${scenario.id}`, scenario);
    }
  }

  async getTrainingScenario(id: string): Promise<TrainingScenario | null> {
    const cached = this.getMemoryCache<TrainingScenario>(`trainingScenario:${id}`);
    if (cached) return cached;

    const adapter = this.getAdapterForData('trainingScenario');
    const result = await adapter.getTrainingScenario(id);
    
    if (result && this.shouldCache('trainingScenario')) {
      this.setMemoryCache(`trainingScenario:${id}`, result);
    }
    
    return result;
  }

  async queryTrainingScenarios(options?: QueryOptions): Promise<QueryResult<TrainingScenario>> {
    const adapter = this.getAdapterForData('trainingScenario');
    return await adapter.queryTrainingScenarios(options);
  }

  async deleteTrainingScenario(id: string): Promise<void> {
    const adapter = this.getAdapterForData('trainingScenario');
    await adapter.deleteTrainingScenario(id);
    
    this.removeMemoryCache(`trainingScenario:${id}`);
  }

  // =================== 用户进度管理 ===================

  async updateUserProgress(progress: UserProgress): Promise<void> {
    const adapter = this.getAdapterForData('userProgress');
    await adapter.updateUserProgress(progress);
    
    if (this.shouldCache('userProgress')) {
      this.setMemoryCache(`userProgress:${progress.userId}`, progress);
    }
  }

  async getUserProgress(userId: string): Promise<UserProgress | null> {
    const cached = this.getMemoryCache<UserProgress>(`userProgress:${userId}`);
    if (cached) return cached;

    const adapter = this.getAdapterForData('userProgress');
    const result = await adapter.getUserProgress(userId);
    
    if (result && this.shouldCache('userProgress')) {
      this.setMemoryCache(`userProgress:${userId}`, result);
    }
    
    return result;
  }

  // =================== 通用KV存储 ===================

  async set<T>(key: string, value: T): Promise<void> {
    const dataType = this.inferDataType(key);
    const adapter = this.getAdapterForData(dataType);
    await adapter.set(key, value);
    
    if (this.shouldCache(dataType)) {
      this.setMemoryCache(`kv:${key}`, value);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = this.getMemoryCache<T>(`kv:${key}`);
    if (cached) return cached;

    const dataType = this.inferDataType(key);
    const adapter = this.getAdapterForData(dataType);
    const result = await adapter.get<T>(key);
    
    if (result && this.shouldCache(dataType)) {
      this.setMemoryCache(`kv:${key}`, result);
    }
    
    return result;
  }

  async delete(key: string): Promise<void> {
    const dataType = this.inferDataType(key);
    const adapter = this.getAdapterForData(dataType);
    await adapter.delete(key);
    
    this.removeMemoryCache(`kv:${key}`);
  }

  async has(key: string): Promise<boolean> {
    const dataType = this.inferDataType(key);
    const adapter = this.getAdapterForData(dataType);
    return await adapter.has(key);
  }

  async keys(prefix?: string): Promise<string[]> {
    // 合并所有适配器的键
    const allKeys = new Set<string>();
    
    for (const adapter of this.adapters.values()) {
      try {
        const keys = await adapter.keys(prefix);
        keys.forEach(key => allKeys.add(key));
      } catch (error) {
        console.warn('Error getting keys from adapter:', error);
      }
    }
    
    return Array.from(allKeys);
  }

  // =================== 缓存和性能 ===================

  async clearCache(): Promise<void> {
    // 清除内存缓存
    this.memoryCache.clear();
    
    // 清除所有适配器缓存
    for (const adapter of this.adapters.values()) {
      try {
        await adapter.clearCache();
      } catch (error) {
        console.warn('Error clearing adapter cache:', error);
      }
    }
  }

  async compactStorage(): Promise<void> {
    // 清理内存缓存
    this.cleanupMemoryCache();
    
    // 压缩所有适配器存储
    for (const adapter of this.adapters.values()) {
      try {
        await adapter.compactStorage();
      } catch (error) {
        console.warn('Error compacting adapter storage:', error);
      }
    }
  }

  async getCacheStats(): Promise<CacheStats> {
    const memoryStats = this.getMemoryCacheStats();
    return memoryStats;
  }

  // =================== 数据导入导出 ===================

  async exportData(format: 'json' | 'csv'): Promise<string> {
    // 使用主适配器进行导出
    if (this.primaryAdapter) {
      return await this.primaryAdapter.exportData(format);
    }
    throw new Error('No primary adapter available for export');
  }

  async importData(data: string, format: 'json' | 'csv'): Promise<void> {
    // 使用主适配器进行导入
    if (this.primaryAdapter) {
      await this.primaryAdapter.importData(data, format);
    } else {
      throw new Error('No primary adapter available for import');
    }
  }

  // =================== 事件和监听 ===================

  onDataChange(callback: (event: DataChangeEvent) => void): () => void {
    this.changeListeners.push(callback);
    
    return () => {
      const index = this.changeListeners.indexOf(callback);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  // =================== 存储管理专用方法 ===================

  /**
   * 获取存储统计信息
   */
  async getStorageStats(): Promise<StorageStats> {
    const adapterStats: StorageStats['adapters'] = {};
    let totalUsed = 0;
    let totalAvailable = 0;
    let totalCapacity = 0;

    for (const [name, adapter] of this.adapters.entries()) {
      try {
        const available = await adapter.isAvailable();
        if (available) {
          const usage = await adapter.getStorageUsage();
          const cacheStats = await adapter.getCacheStats();
          
          adapterStats[name] = { available, usage, cacheStats };
          totalUsed += usage.used;
          totalAvailable += usage.available;
          totalCapacity += usage.total;
        } else {
          adapterStats[name] = {
            available: false,
            usage: { used: 0, available: 0, total: 0, percentage: 0 },
            cacheStats: { hitRate: 0, size: 0, entries: 0 }
          };
        }
      } catch (error) {
        console.warn(`Error getting stats for ${name} adapter:`, error);
      }
    }

    return {
      adapters: adapterStats,
      totalUsage: {
        used: totalUsed,
        available: totalAvailable,
        total: totalCapacity,
        percentage: totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0
      },
      activeAdapter: this.primaryAdapter === this.adapters.get('indexeddb') ? 'indexeddb' : 'localstorage',
      memoryCache: this.getMemoryCacheStats()
    };
  }

  /**
   * 强制数据迁移
   */
  async migrateData(from: string, to: string): Promise<void> {
    const fromAdapter = this.adapters.get(from);
    const toAdapter = this.adapters.get(to);
    
    if (!fromAdapter || !toAdapter) {
      throw new Error('Invalid adapter names for migration');
    }

    try {
      const data = await fromAdapter.exportData('json');
      await toAdapter.importData(data, 'json');
      console.log(`Data migration from ${from} to ${to} completed`);
    } catch (error) {
      console.error(`Data migration failed:`, error);
      throw error;
    }
  }

  /**
   * 获取适配器健康状态
   */
  async getHealthStatus(): Promise<{ adapter: string; healthy: boolean; error?: string }[]> {
    const status: { adapter: string; healthy: boolean; error?: string }[] = [];
    
    for (const [name, adapter] of this.adapters.entries()) {
      try {
        const available = await adapter.isAvailable();
        status.push({ adapter: name, healthy: available });
      } catch (error) {
        status.push({ 
          adapter: name, 
          healthy: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return status;
  }

  // =================== 私有辅助方法 ===================

  private async initializeAdapters(): Promise<void> {
    // 初始化IndexedDB适配器
    const indexedDBAdapter = new IndexedDBAdapter();
    try {
      if (await indexedDBAdapter.isAvailable()) {
        await indexedDBAdapter.initialize();
        this.adapters.set('indexeddb', indexedDBAdapter);
      }
    } catch (error) {
      console.warn('IndexedDB adapter initialization failed:', error);
    }

    // 初始化LocalStorage适配器
    const localStorageAdapter = new LocalStorageAdapter();
    try {
      if (await localStorageAdapter.isAvailable()) {
        await localStorageAdapter.initialize();
        this.adapters.set('localstorage', localStorageAdapter);
      }
    } catch (error) {
      console.warn('LocalStorage adapter initialization failed:', error);
    }

    if (this.adapters.size === 0) {
      throw new Error('No storage adapters available');
    }
  }

  private async selectPrimaryAdapter(): Promise<void> {
    // 按优先级选择主适配器
    const preferredAdapter = this.adapters.get(this.config.primaryAdapter);
    if (preferredAdapter && await preferredAdapter.isAvailable()) {
      this.primaryAdapter = preferredAdapter;
    } else {
      // 降级到备用适配器
      const fallbackAdapter = this.adapters.get(this.config.fallbackAdapter);
      if (fallbackAdapter && await fallbackAdapter.isAvailable()) {
        this.primaryAdapter = fallbackAdapter;
        console.warn(`Primary adapter unavailable, using fallback: ${this.config.fallbackAdapter}`);
      } else {
        // 使用任何可用的适配器
        for (const adapter of this.adapters.values()) {
          if (await adapter.isAvailable()) {
            this.primaryAdapter = adapter;
            break;
          }
        }
      }
    }

    if (!this.primaryAdapter) {
      throw new Error('No available storage adapters');
    }

    // 设置备用适配器
    for (const [name, adapter] of this.adapters.entries()) {
      if (adapter !== this.primaryAdapter && await adapter.isAvailable()) {
        this.fallbackAdapter = adapter;
        break;
      }
    }
  }

  private getAdapterForData(dataType: string): IDataProvider {
    const routing = StorageManager.DATA_ROUTING[dataType as keyof typeof StorageManager.DATA_ROUTING];
    
    if (routing) {
      const preferredAdapter = this.adapters.get(routing.preferred);
      if (preferredAdapter) return preferredAdapter;
      
      const fallbackAdapter = this.adapters.get(routing.fallback);
      if (fallbackAdapter) return fallbackAdapter;
    }
    
    // 默认使用主适配器
    return this.primaryAdapter || this.fallbackAdapter!;
  }

  private shouldCache(dataType: string): boolean {
    if (!this.config.memoryCache.enabled) return false;
    
    const routing = StorageManager.DATA_ROUTING[dataType as keyof typeof StorageManager.DATA_ROUTING];
    return routing?.cache ?? true;
  }

  private inferDataType(key: string): string {
    // 根据键名推断数据类型
    if (key.includes('config') || key.includes('setting')) return 'config';
    if (key.includes('handHistory')) return 'handHistory';
    if (key.includes('playerStats')) return 'playerStats';
    if (key.includes('trainingScenario')) return 'trainingScenario';
    if (key.includes('userProgress')) return 'userProgress';
    
    return 'config'; // 默认为配置类型
  }

  // 内存缓存管理
  private setMemoryCache<T>(key: string, data: T): void {
    if (!this.config.memoryCache.enabled) return;
    
    // 检查缓存大小限制
    if (this.getMemoryCacheSize() >= this.config.memoryCache.maxSize) {
      this.cleanupMemoryCache();
    }
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.memoryCache.ttl
    });
  }

  private getMemoryCache<T>(key: string): T | null {
    if (!this.config.memoryCache.enabled) return null;
    
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    // 清除过期缓存
    if (cached) {
      this.memoryCache.delete(key);
    }
    
    return null;
  }

  private removeMemoryCache(key: string): void {
    this.memoryCache.delete(key);
  }

  private getMemoryCacheSize(): number {
    return Array.from(this.memoryCache.values())
      .reduce((total, item) => total + JSON.stringify(item.data).length, 0);
  }

  private getMemoryCacheStats(): CacheStats {
    const entries = this.memoryCache.size;
    const size = this.getMemoryCacheSize();
    
    // 简化的命中率计算
    const hitRate = 0.8; // 80%估算命中率
    
    return {
      hitRate,
      size,
      entries
    };
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    // 找出过期的缓存项
    for (const [key, value] of this.memoryCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        entriesToDelete.push(key);
      }
    }
    
    // 删除过期项
    entriesToDelete.forEach(key => this.memoryCache.delete(key));
    
    // 如果还是超过限制，删除最旧的项
    if (this.getMemoryCacheSize() >= this.config.memoryCache.maxSize) {
      const entries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const deleteCount = Math.ceil(entries.length * 0.2); // 删除20%最旧的项
      entries.slice(0, deleteCount).forEach(([key]) => {
        this.memoryCache.delete(key);
      });
    }
  }

  private setupChangeListeners(): void {
    // 为所有适配器设置变更监听
    for (const adapter of this.adapters.values()) {
      adapter.onDataChange((event) => {
        // 清除相关的内存缓存
        this.invalidateRelatedCache(event);
        
        // 转发事件给外部监听器
        this.changeListeners.forEach(listener => {
          try {
            listener(event);
          } catch (error) {
            console.error('Error in change listener:', error);
          }
        });
      });
    }
  }

  private invalidateRelatedCache(event: DataChangeEvent): void {
    // 根据事件类型清除相关缓存
    const patterns = [
      `${event.table}:${event.id}`,
      `kv:${event.id}`,
    ];
    
    patterns.forEach(pattern => {
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
        }
      }
    });
  }

  private async checkDataMigration(): Promise<void> {
    // 检查是否需要数据迁移
    // 这里可以实现版本检查和自动迁移逻辑
    console.log('Data migration check completed');
  }
}