/**
 * AIDZ扑克GTO训练系统 - 统一存储架构
 * 
 * 本地存储优先的多层存储架构，支持：
 * - LocalStorage: 配置和小型数据 (5MB)
 * - IndexedDB: 手牌历史和大型数据 (50MB+)  
 * - Memory Cache: 热点数据缓存 (24MB)
 * - 智能路由和自动降级
 * - 数据压缩和性能优化
 * 
 * 使用示例：
 * ```typescript
 * import { StorageManager } from '@/lib/storage';
 * 
 * const storage = new StorageManager();
 * await storage.initialize();
 * 
 * // 保存手牌历史
 * await storage.saveHandHistory(handHistory);
 * 
 * // 查询数据
 * const results = await storage.queryHandHistory({ limit: 10 });
 * ```
 */

// =================== 核心接口和类型 ===================

export type {
  // 主要接口
  IDataProvider,
  
  // 数据类型
  HandHistory,
  PlayerStats,
  TrainingScenario,
  UserProgress,
  PlayerAction,
  HandResult,
  HandAnalysis,
  GtoDeviation,
  Achievement,
  
  // 查询相关
  QueryOptions,
  QueryResult,
  
  // 存储统计
  StorageUsage,
  CacheStats,
  DataChangeEvent,
  
  // 配置类型
  LocalStorageConfig,
  IndexedDBConfig,
  MemoryCacheConfig,
  CloudStorageConfig
} from './interfaces';

// =================== 存储适配器 ===================

export { LocalStorageAdapter } from './local-storage-adapter';
export { IndexedDBAdapter } from './indexeddb-adapter';

// =================== 统一存储管理器 ===================

export { StorageManager } from './storage-manager';
export type { StorageConfig, StorageStats } from './storage-manager';

// =================== 便捷导出 ===================

// 默认存储实例工厂
export const createDefaultStorage = async (config?: Partial<any>) => {
  const storage = new StorageManager(config);
  await storage.initialize();
  return storage;
};

// 存储能力检测
export const detectStorageCapabilities = async () => {
  const capabilities = {
    localStorage: false,
    indexedDB: false,
    memoryCache: true // Memory cache always available
  };

  // 检测 LocalStorage
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, 'test');
    localStorage.removeItem(test);
    capabilities.localStorage = true;
  } catch {
    capabilities.localStorage = false;
  }

  // 检测 IndexedDB
  try {
    capabilities.indexedDB = 'indexedDB' in window;
  } catch {
    capabilities.indexedDB = false;
  }

  return capabilities;
};

// =================== 存储常量 ===================

export const STORAGE_CONSTANTS = {
  // 存储限制
  LOCAL_STORAGE_LIMIT: 5 * 1024 * 1024, // 5MB
  INDEXEDDB_LIMIT: 50 * 1024 * 1024,    // 50MB
  MEMORY_CACHE_LIMIT: 24 * 1024 * 1024, // 24MB
  
  // 缓存TTL
  DEFAULT_CACHE_TTL: 5 * 60 * 1000,     // 5分钟
  LONG_CACHE_TTL: 30 * 60 * 1000,       // 30分钟
  SHORT_CACHE_TTL: 1 * 60 * 1000,       // 1分钟
  
  // 数据保留期
  HAND_HISTORY_RETENTION: 90,           // 90天
  STATS_RETENTION: 365,                 // 365天
  
  // 压缩阈值
  COMPRESSION_THRESHOLD: 100 * 1024,    // 100KB
  
  // 存储键前缀
  KEY_PREFIX: 'ai-poker-',
  
  // 数据库配置
  DB_NAME: 'ai-poker-db',
  DB_VERSION: 1
};

// =================== 工具函数 ===================

/**
 * 计算数据大小（字节）
 */
export const calculateDataSize = (data: any): number => {
  try {
    return JSON.stringify(data).length * 2; // UTF-16 encoding
  } catch {
    return 0;
  }
};

/**
 * 格式化存储大小显示
 */
export const formatStorageSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * 生成唯一存储键
 */
export const generateStorageKey = (type: string, id: string): string => {
  return `${STORAGE_CONSTANTS.KEY_PREFIX}${type}:${id}`;
};

/**
 * 解析存储键
 */
export const parseStorageKey = (key: string): { type: string; id: string } | null => {
  if (!key.startsWith(STORAGE_CONSTANTS.KEY_PREFIX)) {
    return null;
  }
  
  const withoutPrefix = key.substring(STORAGE_CONSTANTS.KEY_PREFIX.length);
  const [type, ...idParts] = withoutPrefix.split(':');
  
  return {
    type,
    id: idParts.join(':')
  };
};

// =================== 错误类型 ===================

export class StorageError extends Error {
  constructor(message: string, public code?: string, public cause?: Error) {
    super(message);
    this.name = 'StorageError';
  }
}

export class StorageQuotaError extends StorageError {
  constructor(message: string, public used: number, public limit: number) {
    super(message);
    this.name = 'StorageQuotaError';
    this.code = 'QUOTA_EXCEEDED';
  }
}

export class StorageUnavailableError extends StorageError {
  constructor(adapterName: string) {
    super(`Storage adapter '${adapterName}' is not available`);
    this.name = 'StorageUnavailableError';
    this.code = 'ADAPTER_UNAVAILABLE';
  }
}

// =================== 默认导出 ===================

export default StorageManager;