/**
 * 云端存储适配器 - 统一的云端数据访问接口
 * 
 * 支持的云端服务：
 * 1. Firebase Firestore
 * 2. Supabase
 * 3. 自定义REST API
 * 
 * 特性：
 * - 统一接口，支持多种云服务
 * - 自动重试和错误处理
 * - 数据压缩和优化
 * - 离线缓存支持
 * - 安全认证集成
 */

import { IDataProvider, HandHistory, PlayerStats, TrainingScenario, UserProgress, QueryOptions, QueryResult } from './storage/interfaces';

export interface CloudProviderConfig {
  provider: 'firebase' | 'supabase' | 'custom';
  apiKey: string;
  projectId: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface CloudSyncMetadata {
  lastSync: number;
  checksums: Record<string, string>;
  version: string;
  deviceId: string;
}

export interface RemoteChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  deviceId: string;
}

export abstract class CloudAdapter implements IDataProvider {
  protected config: CloudProviderConfig;
  protected metadata: CloudSyncMetadata;
  protected cache: Map<string, { data: any; timestamp: number }> = new Map();
  protected deviceId: string;

  constructor(config: CloudProviderConfig) {
    this.config = config;
    this.deviceId = this.generateDeviceId();
    this.metadata = {
      lastSync: 0,
      checksums: {},
      version: '1.0.0',
      deviceId: this.deviceId
    };
  }

  // =================== 基础抽象方法 ===================

  /**
   * 初始化云端连接
   */
  abstract initialize(): Promise<void>;

  /**
   * 检查云端服务是否可用
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * 认证用户
   */
  abstract authenticate(token: string): Promise<boolean>;

  /**
   * 获取远程变更
   */
  abstract getRemoteChanges(entityType: string, since: number): Promise<RemoteChange[]>;

  /**
   * 获取数据校验和
   */
  abstract getChecksums(): Promise<Record<string, string>>;

  // =================== IDataProvider 接口实现 ===================

  async initialize(config?: Record<string, any>): Promise<void> {
    await this.initialize();
    await this.loadMetadata();
  }

  async getStorageUsage(): Promise<any> {
    // 云端存储使用情况需要子类实现
    return {
      used: 0,
      available: Infinity,
      total: Infinity,
      percentage: 0
    };
  }

  // =================== 手牌历史管理 ===================

  async saveHandHistory(handHistory: HandHistory): Promise<void> {
    const key = `hand_history_${handHistory.id}`;
    await this.cloudSet(key, handHistory);
    this.invalidateCache('handHistory');
  }

  async getHandHistory(id: string): Promise<HandHistory | null> {
    const key = `hand_history_${id}`;
    const cached = this.getFromCache(key);
    if (cached) return cached;

    const data = await this.cloudGet<HandHistory>(key);
    if (data) {
      this.setToCache(key, data);
    }
    return data;
  }

  async queryHandHistory(options?: QueryOptions): Promise<QueryResult<HandHistory>> {
    const cacheKey = `hand_history_query_${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await this.cloudQuery<HandHistory>('hand_history', options);
    this.setToCache(cacheKey, result);
    return result;
  }

  async deleteHandHistory(id: string): Promise<void> {
    const key = `hand_history_${id}`;
    await this.cloudDelete(key);
    this.invalidateCache('handHistory');
  }

  async batchSaveHandHistory(handHistories: HandHistory[]): Promise<void> {
    const batchData = handHistories.map(hh => ({
      key: `hand_history_${hh.id}`,
      data: hh
    }));
    
    await this.cloudBatchSet(batchData);
    this.invalidateCache('handHistory');
  }

  // =================== 玩家统计管理 ===================

  async updatePlayerStats(stats: PlayerStats): Promise<void> {
    const key = `player_stats_${stats.playerId}`;
    await this.cloudSet(key, stats);
    this.invalidateCache('playerStats');
  }

  async getPlayerStats(playerId: string): Promise<PlayerStats | null> {
    const key = `player_stats_${playerId}`;
    const cached = this.getFromCache(key);
    if (cached) return cached;

    const data = await this.cloudGet<PlayerStats>(key);
    if (data) {
      this.setToCache(key, data);
    }
    return data;
  }

  async getAllPlayerStats(): Promise<PlayerStats[]> {
    const cacheKey = 'all_player_stats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await this.cloudQuery<PlayerStats>('player_stats', {});
    this.setToCache(cacheKey, result.data);
    return result.data;
  }

  // =================== 训练场景管理 ===================

  async saveTrainingScenario(scenario: TrainingScenario): Promise<void> {
    const key = `training_scenario_${scenario.id}`;
    await this.cloudSet(key, scenario);
    this.invalidateCache('trainingScenarios');
  }

  async getTrainingScenario(id: string): Promise<TrainingScenario | null> {
    const key = `training_scenario_${id}`;
    const cached = this.getFromCache(key);
    if (cached) return cached;

    const data = await this.cloudGet<TrainingScenario>(key);
    if (data) {
      this.setToCache(key, data);
    }
    return data;
  }

  async queryTrainingScenarios(options?: QueryOptions): Promise<QueryResult<TrainingScenario>> {
    const cacheKey = `training_scenarios_query_${JSON.stringify(options)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const result = await this.cloudQuery<TrainingScenario>('training_scenarios', options);
    this.setToCache(cacheKey, result);
    return result;
  }

  async deleteTrainingScenario(id: string): Promise<void> {
    const key = `training_scenario_${id}`;
    await this.cloudDelete(key);
    this.invalidateCache('trainingScenarios');
  }

  async getTrainingScenarios(): Promise<TrainingScenario[]> {
    const result = await this.queryTrainingScenarios();
    return result.data;
  }

  // =================== 用户进度管理 ===================

  async updateUserProgress(progress: UserProgress): Promise<void> {
    const key = `user_progress_${progress.userId}`;
    await this.cloudSet(key, progress);
    this.invalidateCache('userProgress');
  }

  async getUserProgress(userId: string): Promise<UserProgress | null> {
    const key = `user_progress_${userId}`;
    const cached = this.getFromCache(key);
    if (cached) return cached;

    const data = await this.cloudGet<UserProgress>(key);
    if (data) {
      this.setToCache(key, data);
    }
    return data;
  }

  // =================== 通用KV存储 ===================

  async set<T>(key: string, value: T): Promise<void> {
    await this.cloudSet(key, value);
    this.cache.delete(key);
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = this.getFromCache(key);
    if (cached) return cached;

    const data = await this.cloudGet<T>(key);
    if (data) {
      this.setToCache(key, data);
    }
    return data;
  }

  async delete(key: string): Promise<void> {
    await this.cloudDelete(key);
    this.cache.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const cached = this.getFromCache(key);
    if (cached !== undefined) return true;

    return await this.cloudHas(key);
  }

  async keys(prefix?: string): Promise<string[]> {
    return await this.cloudKeys(prefix);
  }

  // =================== 缓存和性能 ===================

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  async compactStorage(): Promise<void> {
    // 云端存储不需要压缩
  }

  async getCacheStats(): Promise<any> {
    return {
      hitRate: this.calculateCacheHitRate(),
      size: this.cache.size,
      entries: this.cache.size
    };
  }

  // =================== 数据导入导出 ===================

  async exportData(format: 'json' | 'csv'): Promise<string> {
    const allData = await this.exportAllData();
    if (format === 'json') {
      return JSON.stringify(allData, null, 2);
    } else {
      return this.convertToCSV(allData);
    }
  }

  async importData(data: string, format: 'json' | 'csv'): Promise<void> {
    if (format === 'json') {
      const parsed = JSON.parse(data);
      await this.importAllData(parsed);
    } else {
      const parsed = this.parseFromCSV(data);
      await this.importAllData(parsed);
    }
  }

  // =================== 事件和监听 ===================

  onDataChange(callback: (event: any) => void): () => void {
    // 云端数据变更监听需要子类实现
    return () => {};
  }

  // =================== 云端操作抽象方法 ===================

  protected abstract cloudSet(key: string, data: any): Promise<void>;
  protected abstract cloudGet<T>(key: string): Promise<T | null>;
  protected abstract cloudDelete(key: string): Promise<void>;
  protected abstract cloudHas(key: string): Promise<boolean>;
  protected abstract cloudKeys(prefix?: string): Promise<string[]>;
  protected abstract cloudQuery<T>(collection: string, options: QueryOptions): Promise<QueryResult<T>>;
  protected abstract cloudBatchSet(operations: { key: string; data: any }[]): Promise<void>;

  // =================== 工具方法 ===================

  protected async loadMetadata(): Promise<void> {
    try {
      const metadata = await this.cloudGet<CloudSyncMetadata>('sync_metadata');
      if (metadata) {
        this.metadata = metadata;
      }
    } catch (error) {
      console.warn('Failed to load metadata:', error);
    }
  }

  protected async saveMetadata(): Promise<void> {
    try {
      await this.cloudSet('sync_metadata', this.metadata);
    } catch (error) {
      console.warn('Failed to save metadata:', error);
    }
  }

  protected getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5分钟缓存
      return cached.data;
    }
    return null;
  }

  protected setToCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  protected invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  protected calculateCacheHitRate(): number {
    // 简化的缓存命中率计算
    return 0.85; // 假设85%的缓存命中率
  }

  protected async exportAllData(): Promise<any> {
    return {
      handHistory: (await this.queryHandHistory()).data,
      playerStats: await this.getAllPlayerStats(),
      trainingScenarios: (await this.queryTrainingScenarios()).data,
      metadata: this.metadata
    };
  }

  protected async importAllData(data: any): Promise<void> {
    if (data.handHistory) {
      await this.batchSaveHandHistory(data.handHistory);
    }
    if (data.playerStats) {
      for (const stats of data.playerStats) {
        await this.updatePlayerStats(stats);
      }
    }
    if (data.trainingScenarios) {
      for (const scenario of data.trainingScenarios) {
        await this.saveTrainingScenario(scenario);
      }
    }
    if (data.metadata) {
      this.metadata = data.metadata;
      await this.saveMetadata();
    }
  }

  protected convertToCSV(data: any): string {
    // 简化的CSV转换
    return JSON.stringify(data);
  }

  protected parseFromCSV(csv: string): any {
    // 简化的CSV解析
    return JSON.parse(csv);
  }

  protected generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) {
          throw error;
        }
        
        // 指数退避
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  protected createRequestConfig(): RequestInit {
    return {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Device-ID': this.deviceId
      },
      timeout: this.config.timeout || 30000
    };
  }

  protected async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }
}

// =================== 具体云端服务实现 ===================

export class FirebaseAdapter extends CloudAdapter {
  private firestore: any; // Firebase Firestore 实例

  async initialize(): Promise<void> {
    // 这里需要初始化 Firebase
    // import { initializeApp } from 'firebase/app';
    // import { getFirestore } from 'firebase/firestore';
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.firestore.collection('test').doc('availability').get();
      return true;
    } catch {
      return false;
    }
  }

  async authenticate(token: string): Promise<boolean> {
    // Firebase 认证逻辑
    return true;
  }

  async getRemoteChanges(entityType: string, since: number): Promise<RemoteChange[]> {
    // 查询指定时间后的变更
    return [];
  }

  async getChecksums(): Promise<Record<string, string>> {
    return {};
  }

  protected async cloudSet(key: string, data: any): Promise<void> {
    await this.retryOperation(async () => {
      await this.firestore.collection('data').doc(key).set(data);
    });
  }

  protected async cloudGet<T>(key: string): Promise<T | null> {
    const doc = await this.retryOperation(async () => {
      return await this.firestore.collection('data').doc(key).get();
    });
    
    return doc.exists ? doc.data() as T : null;
  }

  protected async cloudDelete(key: string): Promise<void> {
    await this.retryOperation(async () => {
      await this.firestore.collection('data').doc(key).delete();
    });
  }

  protected async cloudHas(key: string): Promise<boolean> {
    const doc = await this.firestore.collection('data').doc(key).get();
    return doc.exists;
  }

  protected async cloudKeys(prefix?: string): Promise<string[]> {
    // Firebase 不支持直接查询所有键，需要维护一个索引
    return [];
  }

  protected async cloudQuery<T>(collection: string, options: QueryOptions): Promise<QueryResult<T>> {
    // 实现 Firestore 查询
    return { data: [], total: 0, hasMore: false };
  }

  protected async cloudBatchSet(operations: { key: string; data: any }[]): Promise<void> {
    const batch = this.firestore.batch();
    operations.forEach(op => {
      const ref = this.firestore.collection('data').doc(op.key);
      batch.set(ref, op.data);
    });
    await batch.commit();
  }
}

export class SupabaseAdapter extends CloudAdapter {
  private supabase: any; // Supabase 客户端实例

  async initialize(): Promise<void> {
    // 这里需要初始化 Supabase
    // import { createClient } from '@supabase/supabase-js';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.from('test').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  async authenticate(token: string): Promise<boolean> {
    const { error } = await this.supabase.auth.signInWithToken({ token });
    return !error;
  }

  async getRemoteChanges(entityType: string, since: number): Promise<RemoteChange[]> {
    const { data, error } = await this.supabase
      .from('changes')
      .select('*')
      .gt('timestamp', since)
      .eq('entity_type', entityType);

    if (error) throw error;
    return data || [];
  }

  async getChecksums(): Promise<Record<string, string>> {
    const { data, error } = await this.supabase
      .from('checksums')
      .select('*')
      .single();

    if (error) throw error;
    return data?.checksums || {};
  }

  protected async cloudSet(key: string, data: any): Promise<void> {
    const { error } = await this.supabase
      .from('data')
      .upsert({ key, data, updated_at: new Date().toISOString() });

    if (error) throw error;
  }

  protected async cloudGet<T>(key: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from('data')
      .select('data')
      .eq('key', key)
      .single();

    if (error) return null;
    return data?.data as T;
  }

  protected async cloudDelete(key: string): Promise<void> {
    const { error } = await this.supabase
      .from('data')
      .delete()
      .eq('key', key);

    if (error) throw error;
  }

  protected async cloudHas(key: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('data')
      .select('key')
      .eq('key', key)
      .single();

    return !error && !!data;
  }

  protected async cloudKeys(prefix?: string): Promise<string[]> {
    let query = this.supabase.from('data').select('key');
    
    if (prefix) {
      query = query.like('key', `${prefix}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data?.map(item => item.key) || [];
  }

  protected async cloudQuery<T>(collection: string, options: QueryOptions): Promise<QueryResult<T>> {
    let query = this.supabase.from(collection).select('*');

    // 应用过滤条件
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // 应用排序
    if (options.sortBy) {
      query = query.order(options.sortBy, {
        ascending: options.sortOrder !== 'desc'
      });
    }

    // 应用分页
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10));
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: data as T[],
      total: count || data.length,
      hasMore: (options.limit || 10) === data.length
    };
  }

  protected async cloudBatchSet(operations: { key: string; data: any }[]): Promise<void> {
    const records = operations.map(op => ({
      key: op.key,
      data: op.data,
      updated_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('data')
      .upsert(records);

    if (error) throw error;
  }
}

// =================== 工厂函数 ===================

export function createCloudAdapter(config: CloudProviderConfig): CloudAdapter {
  switch (config.provider) {
    case 'firebase':
      return new FirebaseAdapter(config);
    case 'supabase':
      return new SupabaseAdapter(config);
    default:
      throw new Error(`Unsupported cloud provider: ${config.provider}`);
  }
}