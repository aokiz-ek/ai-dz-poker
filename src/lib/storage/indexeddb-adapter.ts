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
  DataChangeEvent,
  IndexedDBConfig
} from './interfaces';

/**
 * IndexedDB适配器 - 基于浏览器IndexedDB的大容量数据存储实现
 * 
 * 特性：
 * 1. 大容量存储 - 支持50MB+数据存储
 * 2. 快速查询 - 基于索引的高效查询
 * 3. 事务安全 - 原子操作保证数据一致性
 * 4. 版本管理 - 支持数据库架构升级
 * 5. 异步操作 - 非阻塞的数据库操作
 * 
 * 存储容量：~50MB (取决于浏览器和可用磁盘空间)
 */
export class IndexedDBAdapter implements IDataProvider {
  private db: IDBDatabase | null = null;
  private readonly config: IndexedDBConfig;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private changeListeners: ((event: DataChangeEvent) => void)[] = [];

  // 默认配置
  private static readonly DEFAULT_CONFIG: IndexedDBConfig = {
    dbName: 'ai-poker-db',
    version: 1,
    stores: ['handHistories', 'playerStats', 'trainingScenarios', 'userProgress', 'keyValue'],
    maxSize: 50 * 1024 * 1024 // 50MB
  };

  // 存储表结构定义
  private static readonly STORE_CONFIGS = {
    handHistories: {
      keyPath: 'id',
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp', options: {} },
        { name: 'playersCount', keyPath: 'gameState.players.length', options: {} }
      ]
    },
    playerStats: {
      keyPath: 'playerId',
      indexes: [
        { name: 'lastUpdated', keyPath: 'lastUpdated', options: {} },
        { name: 'handsPlayed', keyPath: 'handsPlayed', options: {} }
      ]
    },
    trainingScenarios: {
      keyPath: 'id',
      indexes: [
        { name: 'difficulty', keyPath: 'difficulty', options: {} },
        { name: 'category', keyPath: 'category', options: {} }
      ]
    },
    userProgress: {
      keyPath: 'userId',
      indexes: [
        { name: 'level', keyPath: 'level', options: {} },
        { name: 'lastTrainingDate', keyPath: 'lastTrainingDate', options: {} }
      ]
    },
    keyValue: {
      keyPath: 'key',
      indexes: []
    }
  };

  constructor(config: Partial<IndexedDBConfig> = {}) {
    this.config = { ...IndexedDBAdapter.DEFAULT_CONFIG, ...config };
  }

  // =================== 连接和初始化 ===================

  async initialize(): Promise<void> {
    if (!this.isIndexedDBAvailable()) {
      throw new Error('IndexedDB is not available');
    }

    this.db = await this.openDatabase();
    console.log('IndexedDBAdapter initialized successfully');
  }

  async isAvailable(): Promise<boolean> {
    return this.isIndexedDBAvailable();
  }

  async getStorageUsage(): Promise<StorageUsage> {
    if (!this.db) throw new Error('Database not initialized');

    let used = 0;
    const stores = this.config.stores;

    // 估算每个存储表的大小
    for (const storeName of stores) {
      const count = await this.getStoreCount(storeName);
      used += count * 1024; // 假设每条记录约1KB
    }

    return {
      used,
      available: this.config.maxSize - used,
      total: this.config.maxSize,
      percentage: Math.round((used / this.config.maxSize) * 100)
    };
  }

  // =================== 手牌历史管理 ===================

  async saveHandHistory(handHistory: HandHistory): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['handHistories'], 'readwrite');
    const store = transaction.objectStore('handHistories');
    
    await this.promisifyRequest(store.put(handHistory));
    
    // 更新缓存
    this.updateCache(`handHistory:${handHistory.id}`, handHistory);
    
    this.emitChangeEvent('create', 'handHistories', handHistory.id, handHistory);
  }

  async getHandHistory(id: string): Promise<HandHistory | null> {
    if (!this.db) throw new Error('Database not initialized');

    // 先检查缓存
    const cached = this.getFromCache<HandHistory>(`handHistory:${id}`);
    if (cached) return cached;

    const transaction = this.db.transaction(['handHistories'], 'readonly');
    const store = transaction.objectStore('handHistories');
    const result = await this.promisifyRequest<HandHistory>(store.get(id));
    
    if (result) {
      this.updateCache(`handHistory:${id}`, result);
    }
    
    return result || null;
  }

  async queryHandHistory(options: QueryOptions = {}): Promise<QueryResult<HandHistory>> {
    if (!this.db) throw new Error('Database not initialized');

    const { limit = 50, offset = 0, sortBy = 'timestamp', sortOrder = 'desc', filters } = options;
    
    const transaction = this.db.transaction(['handHistories'], 'readonly');
    const store = transaction.objectStore('handHistories');
    
    let source: IDBObjectStore | IDBIndex = store;
    
    // 如果有排序字段，使用对应的索引
    if (sortBy && store.indexNames.contains(sortBy)) {
      source = store.index(sortBy);
    }
    
    const direction = sortOrder === 'desc' ? 'prev' : 'next';
    const cursor = await this.promisifyRequest(source.openCursor(null, direction));
    
    const results: HandHistory[] = [];
    let currentOffset = 0;
    
    await this.iterateCursor(cursor, (value) => {
      // 应用过滤器
      if (filters && !this.matchesFilters(value, filters)) {
        return true; // 继续迭代
      }
      
      // 应用偏移
      if (currentOffset < offset) {
        currentOffset++;
        return true;
      }
      
      // 应用限制
      if (results.length >= limit) {
        return false; // 停止迭代
      }
      
      results.push(value);
      return true;
    });

    // 获取总数（简化实现）
    const total = await this.getStoreCount('handHistories');

    return {
      data: results,
      total,
      hasMore: offset + results.length < total
    };
  }

  async deleteHandHistory(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['handHistories'], 'readwrite');
    const store = transaction.objectStore('handHistories');
    
    await this.promisifyRequest(store.delete(id));
    
    // 清除缓存
    this.removeFromCache(`handHistory:${id}`);
    
    this.emitChangeEvent('delete', 'handHistories', id);
  }

  async batchSaveHandHistory(handHistories: HandHistory[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['handHistories'], 'readwrite');
    const store = transaction.objectStore('handHistories');
    
    const promises = handHistories.map(handHistory => 
      this.promisifyRequest(store.put(handHistory))
    );
    
    await Promise.all(promises);
    
    // 批量更新缓存
    handHistories.forEach(handHistory => {
      this.updateCache(`handHistory:${handHistory.id}`, handHistory);
    });
  }

  // =================== 玩家统计管理 ===================

  async updatePlayerStats(stats: PlayerStats): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['playerStats'], 'readwrite');
    const store = transaction.objectStore('playerStats');
    
    await this.promisifyRequest(store.put(stats));
    
    this.updateCache(`playerStats:${stats.playerId}`, stats);
    this.emitChangeEvent('update', 'playerStats', stats.playerId, stats);
  }

  async getPlayerStats(playerId: string): Promise<PlayerStats | null> {
    if (!this.db) throw new Error('Database not initialized');

    const cached = this.getFromCache<PlayerStats>(`playerStats:${playerId}`);
    if (cached) return cached;

    const transaction = this.db.transaction(['playerStats'], 'readonly');
    const store = transaction.objectStore('playerStats');
    const result = await this.promisifyRequest<PlayerStats>(store.get(playerId));
    
    if (result) {
      this.updateCache(`playerStats:${playerId}`, result);
    }
    
    return result || null;
  }

  async getAllPlayerStats(): Promise<PlayerStats[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['playerStats'], 'readonly');
    const store = transaction.objectStore('playerStats');
    const results = await this.promisifyRequest<PlayerStats[]>(store.getAll());
    
    return results || [];
  }

  // =================== 训练场景管理 ===================

  async saveTrainingScenario(scenario: TrainingScenario): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['trainingScenarios'], 'readwrite');
    const store = transaction.objectStore('trainingScenarios');
    
    await this.promisifyRequest(store.put(scenario));
    
    this.updateCache(`trainingScenario:${scenario.id}`, scenario);
    this.emitChangeEvent('create', 'trainingScenarios', scenario.id, scenario);
  }

  async getTrainingScenario(id: string): Promise<TrainingScenario | null> {
    if (!this.db) throw new Error('Database not initialized');

    const cached = this.getFromCache<TrainingScenario>(`trainingScenario:${id}`);
    if (cached) return cached;

    const transaction = this.db.transaction(['trainingScenarios'], 'readonly');
    const store = transaction.objectStore('trainingScenarios');
    const result = await this.promisifyRequest<TrainingScenario>(store.get(id));
    
    if (result) {
      this.updateCache(`trainingScenario:${id}`, result);
    }
    
    return result || null;
  }

  async queryTrainingScenarios(options: QueryOptions = {}): Promise<QueryResult<TrainingScenario>> {
    if (!this.db) throw new Error('Database not initialized');

    const { limit = 50, offset = 0, filters } = options;
    
    const transaction = this.db.transaction(['trainingScenarios'], 'readonly');
    const store = transaction.objectStore('trainingScenarios');
    
    let results: TrainingScenario[] = [];
    
    // 如果有过滤器，需要遍历所有记录
    if (filters) {
      const cursor = await this.promisifyRequest(store.openCursor());
      const allResults: TrainingScenario[] = [];
      
      await this.iterateCursor(cursor, (value) => {
        if (this.matchesFilters(value, filters)) {
          allResults.push(value);
        }
        return true;
      });
      
      results = allResults.slice(offset, offset + limit);
    } else {
      // 无过滤器，直接获取
      const allResults = await this.promisifyRequest<TrainingScenario[]>(store.getAll());
      results = (allResults || []).slice(offset, offset + limit);
    }

    const total = await this.getStoreCount('trainingScenarios');

    return {
      data: results,
      total,
      hasMore: offset + results.length < total
    };
  }

  async deleteTrainingScenario(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['trainingScenarios'], 'readwrite');
    const store = transaction.objectStore('trainingScenarios');
    
    await this.promisifyRequest(store.delete(id));
    
    this.removeFromCache(`trainingScenario:${id}`);
    this.emitChangeEvent('delete', 'trainingScenarios', id);
  }

  // =================== 用户进度管理 ===================

  async updateUserProgress(progress: UserProgress): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['userProgress'], 'readwrite');
    const store = transaction.objectStore('userProgress');
    
    await this.promisifyRequest(store.put(progress));
    
    this.updateCache(`userProgress:${progress.userId}`, progress);
    this.emitChangeEvent('update', 'userProgress', progress.userId, progress);
  }

  async getUserProgress(userId: string): Promise<UserProgress | null> {
    if (!this.db) throw new Error('Database not initialized');

    const cached = this.getFromCache<UserProgress>(`userProgress:${userId}`);
    if (cached) return cached;

    const transaction = this.db.transaction(['userProgress'], 'readonly');
    const store = transaction.objectStore('userProgress');
    const result = await this.promisifyRequest<UserProgress>(store.get(userId));
    
    if (result) {
      this.updateCache(`userProgress:${userId}`, result);
    }
    
    return result || null;
  }

  // =================== 通用KV存储 ===================

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['keyValue'], 'readwrite');
    const store = transaction.objectStore('keyValue');
    
    await this.promisifyRequest(store.put({ key, value, timestamp: Date.now() }));
    this.updateCache(`kv:${key}`, value);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');

    const cached = this.getFromCache<T>(`kv:${key}`);
    if (cached) return cached;

    const transaction = this.db.transaction(['keyValue'], 'readonly');
    const store = transaction.objectStore('keyValue');
    const result = await this.promisifyRequest<{ key: string; value: T; timestamp: number }>(store.get(key));
    
    if (result) {
      this.updateCache(`kv:${key}`, result.value);
      return result.value;
    }
    
    return null;
  }

  async delete(key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['keyValue'], 'readwrite');
    const store = transaction.objectStore('keyValue');
    
    await this.promisifyRequest(store.delete(key));
    this.removeFromCache(`kv:${key}`);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async keys(prefix?: string): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['keyValue'], 'readonly');
    const store = transaction.objectStore('keyValue');
    const cursor = await this.promisifyRequest(store.openCursor());
    
    const keys: string[] = [];
    
    await this.iterateCursor(cursor, (value) => {
      if (!prefix || value.key.startsWith(prefix)) {
        keys.push(value.key);
      }
      return true;
    });

    return keys;
  }

  // =================== 缓存和性能 ===================

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  async compactStorage(): Promise<void> {
    // IndexedDB自动管理存储压缩
    // 这里可以实现数据清理逻辑
    await this.cleanupExpiredData();
  }

  async getCacheStats(): Promise<CacheStats> {
    const entries = this.cache.size;
    const estimatedHitRate = 0.75; // 75%命中率估算
    
    return {
      hitRate: estimatedHitRate,
      size: this.calculateCacheSize(),
      entries
    };
  }

  // =================== 数据导入导出 ===================

  async exportData(format: 'json' | 'csv'): Promise<string> {
    const data = {
      handHistories: await this.getAllData('handHistories'),
      playerStats: await this.getAllPlayerStats(),
      trainingScenarios: await this.getAllData('trainingScenarios'),
      userProgress: await this.getAllData('userProgress')
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      return this.convertToCSV(data);
    }
  }

  async importData(data: string, format: 'json' | 'csv'): Promise<void> {
    let importData: any;
    
    if (format === 'json') {
      importData = JSON.parse(data);
    } else {
      importData = this.convertFromCSV(data);
    }
    
    // 批量导入各类型数据
    const importPromises = [];
    
    if (importData.handHistories) {
      importPromises.push(this.batchSaveHandHistory(importData.handHistories));
    }
    
    if (importData.playerStats) {
      importPromises.push(
        Promise.all(importData.playerStats.map((stats: PlayerStats) => 
          this.updatePlayerStats(stats)
        ))
      );
    }
    
    await Promise.all(importPromises);
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

  // =================== 私有辅助方法 ===================

  private isIndexedDBAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.upgradeDatabase(db, event.oldVersion);
      };
    });
  }

  private upgradeDatabase(db: IDBDatabase, oldVersion: number): void {
    // 创建存储表
    Object.entries(IndexedDBAdapter.STORE_CONFIGS).forEach(([storeName, config]) => {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
        
        // 创建索引
        config.indexes.forEach(indexConfig => {
          store.createIndex(indexConfig.name, indexConfig.keyPath, indexConfig.options);
        });
      }
    });
  }

  private promisifyRequest<T = any>(request: IDBRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async iterateCursor(
    cursor: IDBCursorWithValue | null, 
    callback: (value: any) => boolean
  ): Promise<void> {
    return new Promise((resolve) => {
      const iterate = (cursor: IDBCursorWithValue | null) => {
        if (!cursor) {
          resolve();
          return;
        }
        
        const shouldContinue = callback(cursor.value);
        if (shouldContinue) {
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      iterate(cursor);
    });
  }

  private async getStoreCount(storeName: string): Promise<number> {
    if (!this.db) return 0;

    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    return await this.promisifyRequest<number>(store.count());
  }

  private matchesFilters(item: any, filters: Record<string, any>): boolean {
    return Object.entries(filters).every(([key, value]) => {
      return this.getNestedValue(item, key) === value;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // 缓存管理
  private updateCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: 10 * 60 * 1000 // 10分钟TTL
    });
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }

  private removeFromCache(key: string): void {
    this.cache.delete(key);
  }

  private calculateCacheSize(): number {
    return Array.from(this.cache.values())
      .reduce((total, item) => total + JSON.stringify(item.data).length, 0);
  }

  private emitChangeEvent(
    type: 'create' | 'update' | 'delete',
    table: string,
    id: string,
    data?: any
  ): void {
    const event: DataChangeEvent = {
      type,
      table,
      id,
      data,
      timestamp: Date.now()
    };
    
    this.changeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in data change listener:', error);
      }
    });
  }

  private async getAllData(storeName: string): Promise<any[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    return await this.promisifyRequest<any[]>(store.getAll()) || [];
  }

  private async cleanupExpiredData(): Promise<void> {
    // 实现数据清理逻辑
    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30天前
    
    if (!this.db) return;

    // 清理过期的手牌历史
    const transaction = this.db.transaction(['handHistories'], 'readwrite');
    const store = transaction.objectStore('handHistories');
    const index = store.index('timestamp');
    
    const range = IDBKeyRange.upperBound(cutoffDate);
    const cursor = await this.promisifyRequest(index.openCursor(range));
    
    await this.iterateCursor(cursor, (value) => {
      store.delete(value.id);
      return true;
    });
  }

  private convertToCSV(data: any): string {
    // 简化的CSV转换实现
    return JSON.stringify(data);
  }

  private convertFromCSV(data: string): any {
    // 简化的CSV解析实现
    return JSON.parse(data);
  }
}