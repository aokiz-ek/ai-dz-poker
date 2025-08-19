import { GameState, Player, HandRange, PostflopContext } from '@/types/poker';

/**
 * 统一数据访问接口 - 支持多种存储方式的适配器模式
 * 
 * 设计原则：
 * 1. 存储方式无关 - 同一接口支持 LocalStorage/IndexedDB/Cloud
 * 2. 异步设计 - 所有操作返回Promise，支持未来云端扩展
 * 3. 类型安全 - 完整的TypeScript类型支持
 * 4. 性能优化 - 内置缓存和批量操作支持
 */

// =================== 核心数据类型 ===================

export interface HandHistory {
  id: string;
  timestamp: number;
  gameState: GameState;
  playerActions: PlayerAction[];
  result: HandResult;
  analysis?: HandAnalysis;
}

export interface PlayerAction {
  playerId: string;
  action: string;
  amount?: number;
  timestamp: number;
  street: 'preflop' | 'flop' | 'turn' | 'river';
}

export interface HandResult {
  winners: string[];
  potSize: number;
  showdown: boolean;
  winningHand?: {
    playerId: string;
    cards: [string, string]; // Card representations
    handRank: string;
  };
}

export interface HandAnalysis {
  gtoDeviations: GtoDeviation[];
  missedValue: number;
  bluffEfficiency: number;
  overallScore: number;
}

export interface GtoDeviation {
  street: string;
  expectedAction: string;
  actualAction: string;
  equityLoss: number;
}

export interface PlayerStats {
  playerId: string;
  handsPlayed: number;
  vpip: number; // Voluntarily Put money In Pot
  pfr: number;  // Pre-Flop Raise
  aggFactor: number;
  winRate: number;
  lastUpdated: number;
}

export interface TrainingScenario {
  id: string;
  name: string;
  description: string;
  boardTexture: string[];
  playerRange: HandRange;
  opponentRange: HandRange;
  potSize: number;
  stackSizes: number[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'preflop' | 'postflop' | 'river';
}

export interface UserProgress {
  userId: string;
  level: number;
  experience: number;
  completedScenarios: string[];
  achievements: Achievement[];
  weakAreas: string[];
  lastTrainingDate: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: number;
  type: 'training' | 'performance' | 'streak' | 'milestone';
}

// =================== 查询和过滤接口 ===================

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// =================== 统一数据访问接口 ===================

export interface IDataProvider {
  // =================== 连接和初始化 ===================
  
  /**
   * 初始化存储提供者
   * @param config 配置选项
   */
  initialize(config?: Record<string, any>): Promise<void>;

  /**
   * 检查存储是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取存储使用情况
   */
  getStorageUsage(): Promise<StorageUsage>;

  // =================== 手牌历史管理 ===================

  /**
   * 保存手牌历史
   * @param handHistory 手牌历史数据
   */
  saveHandHistory(handHistory: HandHistory): Promise<void>;

  /**
   * 获取手牌历史
   * @param id 手牌ID
   */
  getHandHistory(id: string): Promise<HandHistory | null>;

  /**
   * 查询手牌历史
   * @param options 查询选项
   */
  queryHandHistory(options?: QueryOptions): Promise<QueryResult<HandHistory>>;

  /**
   * 删除手牌历史
   * @param id 手牌ID
   */
  deleteHandHistory(id: string): Promise<void>;

  /**
   * 批量保存手牌历史
   * @param handHistories 手牌历史数组
   */
  batchSaveHandHistory(handHistories: HandHistory[]): Promise<void>;

  // =================== 玩家统计管理 ===================

  /**
   * 更新玩家统计
   * @param stats 玩家统计数据
   */
  updatePlayerStats(stats: PlayerStats): Promise<void>;

  /**
   * 获取玩家统计
   * @param playerId 玩家ID
   */
  getPlayerStats(playerId: string): Promise<PlayerStats | null>;

  /**
   * 获取所有玩家统计
   */
  getAllPlayerStats(): Promise<PlayerStats[]>;

  // =================== 训练场景管理 ===================

  /**
   * 保存训练场景
   * @param scenario 训练场景数据
   */
  saveTrainingScenario(scenario: TrainingScenario): Promise<void>;

  /**
   * 获取训练场景
   * @param id 场景ID
   */
  getTrainingScenario(id: string): Promise<TrainingScenario | null>;

  /**
   * 查询训练场景
   * @param options 查询选项
   */
  queryTrainingScenarios(options?: QueryOptions): Promise<QueryResult<TrainingScenario>>;

  /**
   * 删除训练场景
   * @param id 场景ID
   */
  deleteTrainingScenario(id: string): Promise<void>;

  // =================== 用户进度管理 ===================

  /**
   * 更新用户进度
   * @param progress 用户进度数据
   */
  updateUserProgress(progress: UserProgress): Promise<void>;

  /**
   * 获取用户进度
   * @param userId 用户ID
   */
  getUserProgress(userId: string): Promise<UserProgress | null>;

  // =================== 通用KV存储 ===================

  /**
   * 设置键值对
   * @param key 键
   * @param value 值
   */
  set<T>(key: string, value: T): Promise<void>;

  /**
   * 获取键值对
   * @param key 键
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * 删除键值对
   * @param key 键
   */
  delete(key: string): Promise<void>;

  /**
   * 检查键是否存在
   * @param key 键
   */
  has(key: string): Promise<boolean>;

  /**
   * 获取所有键
   * @param prefix 键前缀过滤
   */
  keys(prefix?: string): Promise<string[]>;

  // =================== 缓存和性能 ===================

  /**
   * 清除缓存
   */
  clearCache(): Promise<void>;

  /**
   * 压缩存储
   */
  compactStorage(): Promise<void>;

  /**
   * 获取缓存统计
   */
  getCacheStats(): Promise<CacheStats>;

  // =================== 数据导入导出 ===================

  /**
   * 导出所有数据
   * @param format 导出格式
   */
  exportData(format: 'json' | 'csv'): Promise<string>;

  /**
   * 导入数据
   * @param data 数据内容
   * @param format 数据格式
   */
  importData(data: string, format: 'json' | 'csv'): Promise<void>;

  // =================== 事件和监听 ===================

  /**
   * 监听数据变更
   * @param callback 回调函数
   */
  onDataChange(callback: (event: DataChangeEvent) => void): () => void;
}

// =================== 辅助类型定义 ===================

export interface StorageUsage {
  used: number;      // 已使用空间 (bytes)
  available: number; // 可用空间 (bytes) 
  total: number;     // 总空间 (bytes)
  percentage: number; // 使用百分比
}

export interface CacheStats {
  hitRate: number;   // 缓存命中率
  size: number;      // 缓存大小
  entries: number;   // 缓存条目数
}

export interface DataChangeEvent {
  type: 'create' | 'update' | 'delete';
  table: string;
  id: string;
  data?: any;
  timestamp: number;
}

// =================== 存储配置类型 ===================

export interface LocalStorageConfig {
  maxSize: number;           // 最大存储空间 (bytes)
  compression: boolean;      // 是否启用压缩
  autoCleanup: boolean;      // 是否自动清理
  cleanupThreshold: number;  // 清理阈值 (days)
}

export interface IndexedDBConfig {
  dbName: string;           // 数据库名称
  version: number;          // 数据库版本
  stores: string[];         // 存储表名
  maxSize: number;          // 最大存储空间
}

export interface MemoryCacheConfig {
  maxSize: number;          // 最大缓存大小 (bytes)
  ttl: number;              // 缓存生存时间 (ms)
  maxEntries: number;       // 最大缓存条目数
}

export interface CloudStorageConfig {
  apiKey: string;           // API密钥
  endpoint: string;         // 服务端点
  timeout: number;          // 请求超时时间
  retryAttempts: number;    // 重试次数
}