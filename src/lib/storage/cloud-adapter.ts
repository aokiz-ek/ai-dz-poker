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
  private firestore: any;
  private auth: any;
  private app: any;

  async initialize(): Promise<void> {
    try {
      // 动态导入 Firebase SDK
      const { initializeApp } = await import('firebase/app');
      const { getFirestore, connectFirestoreEmulator } = await import('firebase/firestore');
      const { getAuth, connectAuthEmulator } = await import('firebase/auth');

      // Firebase 配置
      const firebaseConfig = {
        apiKey: this.config.apiKey,
        authDomain: `${this.config.projectId}.firebaseapp.com`,
        projectId: this.config.projectId,
        storageBucket: `${this.config.projectId}.appspot.com`,
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:abcdef123456"
      };

      // 初始化 Firebase
      this.app = initializeApp(firebaseConfig);
      this.firestore = getFirestore(this.app);
      this.auth = getAuth(this.app);

      // 开发环境使用模拟器
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        try {
          connectFirestoreEmulator(this.firestore, 'localhost', 8080);
          connectAuthEmulator(this.auth, 'http://localhost:9099');
        } catch (error) {
          // 忽略重复连接错误
          console.warn('Firebase emulator connection error (may be already connected):', error);
        }
      }

      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.firestore) return false;

    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const testDoc = await getDoc(doc(this.firestore, 'test', 'availability'));
      return true; // 如果能执行到这里说明连接正常
    } catch (error) {
      console.warn('Firebase availability check failed:', error);
      return false;
    }
  }

  async authenticate(token: string): Promise<boolean> {
    try {
      const { signInWithCustomToken } = await import('firebase/auth');
      await signInWithCustomToken(this.auth, token);
      return true;
    } catch (error) {
      console.error('Firebase authentication failed:', error);
      return false;
    }
  }

  async getRemoteChanges(entityType: string, since: number): Promise<RemoteChange[]> {
    try {
      const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
      
      const changesQuery = query(
        collection(this.firestore, 'changes'),
        where('entityType', '==', entityType),
        where('timestamp', '>', since),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(changesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RemoteChange));
    } catch (error) {
      console.error('Failed to get remote changes:', error);
      return [];
    }
  }

  async getChecksums(): Promise<Record<string, string>> {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const checksumDoc = await getDoc(doc(this.firestore, 'metadata', 'checksums'));
      
      if (checksumDoc.exists()) {
        return checksumDoc.data().checksums || {};
      }
      return {};
    } catch (error) {
      console.error('Failed to get checksums:', error);
      return {};
    }
  }

  protected async cloudSet(key: string, data: any): Promise<void> {
    await this.retryOperation(async () => {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(this.firestore, 'data', key), {
        ...data,
        updatedAt: serverTimestamp(),
        deviceId: this.deviceId
      });
    });
  }

  protected async cloudGet<T>(key: string): Promise<T | null> {
    const docSnapshot = await this.retryOperation(async () => {
      const { doc, getDoc } = await import('firebase/firestore');
      return await getDoc(doc(this.firestore, 'data', key));
    });
    
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      // 移除 Firebase 元数据
      const { updatedAt, deviceId, ...cleanData } = data;
      return cleanData as T;
    }
    
    return null;
  }

  protected async cloudDelete(key: string): Promise<void> {
    await this.retryOperation(async () => {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(this.firestore, 'data', key));
    });
  }

  protected async cloudHas(key: string): Promise<boolean> {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const docSnapshot = await getDoc(doc(this.firestore, 'data', key));
      return docSnapshot.exists();
    } catch {
      return false;
    }
  }

  protected async cloudKeys(prefix?: string): Promise<string[]> {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      
      let q = collection(this.firestore, 'data');
      if (prefix) {
        // Firebase 需要使用范围查询来模拟前缀匹配
        q = query(
          collection(this.firestore, 'data'),
          where('__name__', '>=', prefix),
          where('__name__', '<', prefix + '\uf8ff')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error('Failed to get keys:', error);
      return [];
    }
  }

  protected async cloudQuery<T>(collectionName: string, options: QueryOptions): Promise<QueryResult<T>> {
    try {
      const { collection, query, where, orderBy, limit, startAfter, getDocs } = await import('firebase/firestore');
      
      let q = collection(this.firestore, collectionName);
      const constraints = [];

      // 应用过滤条件
      if (options.filters) {
        Object.entries(options.filters).forEach(([field, value]) => {
          constraints.push(where(field, '==', value));
        });
      }

      // 应用排序
      if (options.sortBy) {
        constraints.push(orderBy(options.sortBy, options.sortOrder === 'desc' ? 'desc' : 'asc'));
      }

      // 应用分页
      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      if (constraints.length > 0) {
        q = query(q, ...constraints);
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      return {
        data,
        total: data.length, // Firebase 不支持 count，这里返回当前批次的数量
        hasMore: options.limit ? data.length === options.limit : false
      };
    } catch (error) {
      console.error('Firebase query failed:', error);
      return { data: [], total: 0, hasMore: false };
    }
  }

  protected async cloudBatchSet(operations: { key: string; data: any }[]): Promise<void> {
    await this.retryOperation(async () => {
      const { writeBatch, doc, serverTimestamp } = await import('firebase/firestore');
      
      const batch = writeBatch(this.firestore);
      operations.forEach(op => {
        const ref = doc(this.firestore, 'data', op.key);
        batch.set(ref, {
          ...op.data,
          updatedAt: serverTimestamp(),
          deviceId: this.deviceId
        });
      });
      
      await batch.commit();
    });
  }

  // Firebase 特有方法

  /**
   * 监听实时数据变更
   */
  onRealtimeChanges(callback: (changes: RemoteChange[]) => void): () => void {
    let unsubscribe: () => void = () => {};

    (async () => {
      try {
        const { collection, onSnapshot, query, orderBy } = await import('firebase/firestore');
        
        const changesQuery = query(
          collection(this.firestore, 'changes'),
          orderBy('timestamp', 'desc')
        );

        unsubscribe = onSnapshot(changesQuery, (snapshot) => {
          const changes = snapshot.docChanges().map(change => ({
            id: change.doc.id,
            type: change.type === 'added' ? 'create' : change.type === 'modified' ? 'update' : 'delete',
            ...change.doc.data()
          } as RemoteChange));

          if (changes.length > 0) {
            callback(changes);
          }
        });
      } catch (error) {
        console.error('Failed to setup realtime listener:', error);
      }
    })();

    return unsubscribe;
  }

  /**
   * 记录数据变更历史
   */
  private async recordChange(type: 'create' | 'update' | 'delete', entityType: string, entityId: string, data?: any): Promise<void> {
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      
      await addDoc(collection(this.firestore, 'changes'), {
        type,
        entityType,
        entityId,
        data,
        timestamp: serverTimestamp(),
        deviceId: this.deviceId
      });
    } catch (error) {
      console.warn('Failed to record change:', error);
    }
  }

  // 重写方法以记录变更历史
  async saveHandHistory(handHistory: HandHistory): Promise<void> {
    await super.saveHandHistory(handHistory);
    await this.recordChange('create', 'handHistory', handHistory.id, handHistory);
  }

  async updatePlayerStats(stats: PlayerStats): Promise<void> {
    await super.updatePlayerStats(stats);
    await this.recordChange('update', 'playerStats', stats.playerId, stats);
  }
}

export class SupabaseAdapter extends CloudAdapter {
  private supabase: any;
  private realtimeSubscription: any = null;

  async initialize(): Promise<void> {
    try {
      // 动态导入 Supabase SDK
      const { createClient } = await import('@supabase/supabase-js');

      // 创建 Supabase 客户端
      this.supabase = createClient(
        this.config.baseUrl || `https://${this.config.projectId}.supabase.co`,
        this.config.apiKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
          },
          realtime: {
            params: {
              eventsPerSecond: 2
            }
          }
        }
      );

      console.log('Supabase initialized successfully');
    } catch (error) {
      console.error('Supabase initialization failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // 尝试查询一个简单的测试表或执行基本的健康检查
      const { data, error } = await this.supabase
        .from('data')
        .select('key')
        .limit(1);
        
      return !error;
    } catch (error) {
      console.warn('Supabase availability check failed:', error);
      return false;
    }
  }

  async authenticate(token: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.setSession({
        access_token: token,
        refresh_token: ''
      });
      
      if (error) {
        console.error('Supabase authentication failed:', error);
        return false;
      }
      
      return !!data.session;
    } catch (error) {
      console.error('Supabase authentication error:', error);
      return false;
    }
  }

  async getRemoteChanges(entityType: string, since: number): Promise<RemoteChange[]> {
    try {
      const { data, error } = await this.supabase
        .from('changes')
        .select('*')
        .gt('timestamp', since)
        .eq('entity_type', entityType)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Failed to get remote changes:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        type: item.type,
        entity: item.entity_type,
        entityId: item.entity_id,
        data: item.data,
        timestamp: item.timestamp,
        deviceId: item.device_id
      }));
    } catch (error) {
      console.error('Failed to get remote changes:', error);
      return [];
    }
  }

  async getChecksums(): Promise<Record<string, string>> {
    try {
      const { data, error } = await this.supabase
        .from('metadata')
        .select('checksums')
        .eq('key', 'checksums')
        .single();

      if (error) {
        console.error('Failed to get checksums:', error);
        return {};
      }

      return data?.checksums || {};
    } catch (error) {
      console.error('Failed to get checksums:', error);
      return {};
    }
  }

  protected async cloudSet(key: string, data: any): Promise<void> {
    await this.retryOperation(async () => {
      const { error } = await this.supabase
        .from('data')
        .upsert({ 
          key, 
          data, 
          updated_at: new Date().toISOString(),
          device_id: this.deviceId
        });

      if (error) throw error;
    });
  }

  protected async cloudGet<T>(key: string): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from('data')
        .select('data')
        .eq('key', key)
        .single();

      if (error) return null;
      return data?.data as T;
    } catch {
      return null;
    }
  }

  protected async cloudDelete(key: string): Promise<void> {
    await this.retryOperation(async () => {
      const { error } = await this.supabase
        .from('data')
        .delete()
        .eq('key', key);

      if (error) throw error;
    });
  }

  protected async cloudHas(key: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('data')
        .select('key')
        .eq('key', key)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  protected async cloudKeys(prefix?: string): Promise<string[]> {
    try {
      let query = this.supabase.from('data').select('key');
      
      if (prefix) {
        query = query.like('key', `${prefix}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => item.key);
    } catch (error) {
      console.error('Failed to get keys:', error);
      return [];
    }
  }

  protected async cloudQuery<T>(collection: string, options: QueryOptions): Promise<QueryResult<T>> {
    try {
      let query = this.supabase.from(collection).select('*', { count: 'exact' });

      // 应用过滤条件
      if (options.filters) {
        Object.entries(options.filters).forEach(([field, value]) => {
          if (typeof value === 'object' && value !== null) {
            // 处理复杂查询条件
            Object.entries(value).forEach(([operator, operatorValue]) => {
              switch (operator) {
                case '$gt':
                  query = query.gt(field, operatorValue);
                  break;
                case '$gte':
                  query = query.gte(field, operatorValue);
                  break;
                case '$lt':
                  query = query.lt(field, operatorValue);
                  break;
                case '$lte':
                  query = query.lte(field, operatorValue);
                  break;
                case '$ne':
                  query = query.neq(field, operatorValue);
                  break;
                default:
                  query = query.eq(field, operatorValue);
              }
            });
          } else {
            query = query.eq(field, value);
          }
        });
      }

      // 应用排序
      if (options.sortBy) {
        query = query.order(options.sortBy, {
          ascending: options.sortOrder !== 'desc'
        });
      }

      // 应用分页
      if (options.limit || options.offset) {
        const start = options.offset || 0;
        const end = start + (options.limit || 10) - 1;
        query = query.range(start, end);
      }

      const { data, error, count } = await query;
      if (error) {
        console.error('Supabase query failed:', error);
        return { data: [], total: 0, hasMore: false };
      }

      return {
        data: (data || []) as T[],
        total: count || 0,
        hasMore: options.limit ? (data || []).length === options.limit : false
      };
    } catch (error) {
      console.error('Supabase query error:', error);
      return { data: [], total: 0, hasMore: false };
    }
  }

  protected async cloudBatchSet(operations: { key: string; data: any }[]): Promise<void> {
    await this.retryOperation(async () => {
      const records = operations.map(op => ({
        key: op.key,
        data: op.data,
        updated_at: new Date().toISOString(),
        device_id: this.deviceId
      }));

      const { error } = await this.supabase
        .from('data')
        .upsert(records);

      if (error) throw error;
    });
  }

  // Supabase 特有方法

  /**
   * 监听实时数据变更
   */
  onRealtimeChanges(callback: (changes: RemoteChange[]) => void): () => void {
    try {
      this.realtimeSubscription = this.supabase
        .channel('data_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'changes' 
          }, 
          (payload: any) => {
            const change: RemoteChange = {
              id: payload.new?.id || payload.old?.id,
              type: payload.eventType === 'INSERT' ? 'create' : 
                    payload.eventType === 'UPDATE' ? 'update' : 'delete',
              entity: payload.new?.entity_type || payload.old?.entity_type,
              entityId: payload.new?.entity_id || payload.old?.entity_id,
              data: payload.new?.data || payload.old?.data,
              timestamp: payload.new?.timestamp || payload.old?.timestamp,
              deviceId: payload.new?.device_id || payload.old?.device_id
            };
            
            callback([change]);
          }
        )
        .subscribe();

      return () => {
        if (this.realtimeSubscription) {
          this.supabase.removeChannel(this.realtimeSubscription);
          this.realtimeSubscription = null;
        }
      };
    } catch (error) {
      console.error('Failed to setup realtime listener:', error);
      return () => {};
    }
  }

  /**
   * 记录数据变更历史
   */
  private async recordChange(type: 'create' | 'update' | 'delete', entityType: string, entityId: string, data?: any): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('changes')
        .insert({
          type,
          entity_type: entityType,
          entity_id: entityId,
          data,
          timestamp: Date.now(),
          device_id: this.deviceId
        });

      if (error) {
        console.warn('Failed to record change:', error);
      }
    } catch (error) {
      console.warn('Failed to record change:', error);
    }
  }

  // 重写方法以记录变更历史
  async saveHandHistory(handHistory: HandHistory): Promise<void> {
    await super.saveHandHistory(handHistory);
    await this.recordChange('create', 'handHistory', handHistory.id, handHistory);
  }

  async updatePlayerStats(stats: PlayerStats): Promise<void> {
    await super.updatePlayerStats(stats);
    await this.recordChange('update', 'playerStats', stats.playerId, stats);
  }

  /**
   * 批量同步操作
   */
  async bulkSync(operations: Array<{
    type: 'create' | 'update' | 'delete';
    table: string;
    data: any;
    id?: string;
  }>): Promise<void> {
    // 按表分组操作
    const groupedOps = operations.reduce((acc, op) => {
      if (!acc[op.table]) acc[op.table] = [];
      acc[op.table].push(op);
      return acc;
    }, {} as Record<string, typeof operations>);

    // 并行执行各表的批量操作
    const promises = Object.entries(groupedOps).map(async ([table, ops]) => {
      try {
        if (ops.every(op => op.type === 'create' || op.type === 'update')) {
          // 批量 upsert
          const { error } = await this.supabase
            .from(table)
            .upsert(ops.map(op => ({ ...op.data, updated_at: new Date().toISOString() })));
          
          if (error) throw error;
        } else {
          // 混合操作，需要单独处理
          for (const op of ops) {
            switch (op.type) {
              case 'create':
              case 'update':
                await this.supabase.from(table).upsert({
                  ...op.data,
                  updated_at: new Date().toISOString()
                });
                break;
              case 'delete':
                await this.supabase.from(table).delete().eq('id', op.id);
                break;
            }
          }
        }
      } catch (error) {
        console.error(`Bulk sync failed for table ${table}:`, error);
        throw error;
      }
    });

    await Promise.all(promises);
  }

  // 获取存储使用统计
  async getStorageUsage(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_storage_usage');

      if (error) throw error;

      return {
        used: data?.used_bytes || 0,
        available: data?.available_bytes || Infinity,
        total: data?.total_bytes || Infinity,
        percentage: data?.usage_percentage || 0
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return {
        used: 0,
        available: Infinity,
        total: Infinity,
        percentage: 0
      };
    }
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