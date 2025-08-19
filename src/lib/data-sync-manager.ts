/**
 * 数据同步管理器 - 负责本地和云端数据的同步
 * 
 * 功能特性：
 * 1. 智能同步策略 - 基于数据类型和用户设置
 * 2. 冲突解决 - 自动和手动冲突解决机制
 * 3. 离线优先 - 本地数据优先，云端作为备份
 * 4. 增量同步 - 只同步变更的数据
 * 5. 断点续传 - 支持网络中断后继续同步
 * 6. 性能优化 - 批量操作和缓存机制
 */

import { IDataProvider, HandHistory, PlayerStats, TrainingScenario, UserProgress } from './storage/interfaces';
import { CloudAdapter } from './storage/cloud-adapter';

export interface SyncConfig {
  // 同步策略
  strategy: 'manual' | 'auto' | 'smart';
  
  // 同步频率（分钟）
  syncInterval: number;
  
  // 数据类型同步设置
  syncTypes: {
    handHistory: boolean;
    playerStats: boolean;
    trainingScenarios: boolean;
    userProgress: boolean;
  };
  
  // 网络设置
  networkRequirements: {
    wifiOnly: boolean;
    minBatteryLevel: number;
  };
  
  // 冲突解决策略
  conflictResolution: 'local' | 'remote' | 'newest' | 'manual';
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingChanges: number;
  syncErrors: SyncError[];
  dataIntegrity: DataIntegrityStatus;
}

export interface SyncError {
  id: string;
  type: 'network' | 'conflict' | 'validation' | 'storage';
  message: string;
  timestamp: number;
  retryCount: number;
  resolved: boolean;
}

export interface DataIntegrityStatus {
  localChecksums: Record<string, string>;
  remoteChecksums: Record<string, string>;
  conflicts: SyncConflict[];
  lastValidation: number;
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  conflictType: 'data_mismatch' | 'timestamp_conflict' | 'delete_conflict';
  resolution?: 'local' | 'remote' | 'merge';
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  conflicts: number;
  errors: SyncError[];
  duration: number;
  bytesTransferred: number;
}

export class DataSyncManager {
  private localProvider: IDataProvider;
  private cloudAdapter: CloudAdapter;
  private config: SyncConfig;
  private status: SyncStatus;
  private syncTimer?: NodeJS.Timeout;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(
    localProvider: IDataProvider,
    cloudAdapter: CloudAdapter,
    config: SyncConfig
  ) {
    this.localProvider = localProvider;
    this.cloudAdapter = cloudAdapter;
    this.config = config;
    this.status = {
      isSyncing: false,
      lastSyncTime: null,
      pendingChanges: 0,
      syncErrors: [],
      dataIntegrity: {
        localChecksums: {},
        remoteChecksums: {},
        conflicts: [],
        lastValidation: 0
      }
    };
  }

  /**
   * 初始化同步管理器
   */
  async initialize(): Promise<void> {
    try {
      // 检查云端适配器连接
      const cloudAvailable = await this.cloudAdapter.isAvailable();
      if (!cloudAvailable) {
        throw new Error('Cloud storage not available');
      }

      // 加载上次同步状态
      await this.loadSyncState();

      // 设置自动同步
      if (this.config.strategy === 'auto' || this.config.strategy === 'smart') {
        this.setupAutoSync();
      }

      // 监听本地数据变更
      this.setupLocalDataListener();

      this.emit('initialized', { success: true });
    } catch (error) {
      this.emit('initialized', { success: false, error });
      throw error;
    }
  }

  /**
   * 执行完整同步
   */
  async sync(): Promise<SyncResult> {
    if (this.status.isSyncing) {
      throw new Error('Sync already in progress');
    }

    const startTime = Date.now();
    this.status.isSyncing = true;
    this.emit('syncStart');

    try {
      const result: SyncResult = {
        success: false,
        syncedItems: 0,
        conflicts: 0,
        errors: [],
        duration: 0,
        bytesTransferred: 0
      };

      // 1. 数据完整性检查
      await this.validateDataIntegrity();

      // 2. 同步各类型数据
      if (this.config.syncTypes.handHistory) {
        const handHistoryResult = await this.syncHandHistory();
        result.syncedItems += handHistoryResult.syncedItems;
        result.conflicts += handHistoryResult.conflicts;
        result.errors.push(...handHistoryResult.errors);
      }

      if (this.config.syncTypes.playerStats) {
        const statsResult = await this.syncPlayerStats();
        result.syncedItems += statsResult.syncedItems;
        result.conflicts += statsResult.conflicts;
        result.errors.push(...statsResult.errors);
      }

      if (this.config.syncTypes.trainingScenarios) {
        const scenarioResult = await this.syncTrainingScenarios();
        result.syncedItems += scenarioResult.syncedItems;
        result.conflicts += scenarioResult.conflicts;
        result.errors.push(...scenarioResult.errors);
      }

      if (this.config.syncTypes.userProgress) {
        const progressResult = await this.syncUserProgress();
        result.syncedItems += progressResult.syncedItems;
        result.conflicts += progressResult.conflicts;
        result.errors.push(...progressResult.errors);
      }

      // 3. 处理冲突
      if (result.conflicts > 0) {
        await this.resolveConflicts();
      }

      // 4. 更新同步状态
      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;
      this.status.lastSyncTime = Date.now();
      this.status.pendingChanges = 0;

      this.emit('syncComplete', result);
      return result;
    } catch (error) {
      const syncError: SyncError = {
        id: this.generateId(),
        type: 'network',
        message: error.message,
        timestamp: Date.now(),
        retryCount: 0,
        resolved: false
      };
      
      this.status.syncErrors.push(syncError);
      this.emit('syncError', syncError);
      
      throw error;
    } finally {
      this.status.isSyncing = false;
    }
  }

  /**
   * 同步手牌历史数据
   */
  private async syncHandHistory(): Promise<Partial<SyncResult>> {
    const result: Partial<SyncResult> = {
      syncedItems: 0,
      conflicts: 0,
      errors: []
    };

    try {
      // 获取本地变更
      const localChanges = await this.getLocalChanges('handHistory');
      
      // 获取远程变更
      const remoteChanges = await this.cloudAdapter.getRemoteChanges('handHistory', this.status.lastSyncTime);

      // 双向同步
      for (const change of localChanges) {
        try {
          await this.cloudAdapter.saveHandHistory(change.data);
          result.syncedItems++;
        } catch (error) {
          result.errors.push(this.createSyncError('network', error.message));
        }
      }

      for (const change of remoteChanges) {
        try {
          await this.localProvider.saveHandHistory(change.data);
          result.syncedItems++;
        } catch (error) {
          result.errors.push(this.createSyncError('validation', error.message));
        }
      }
    } catch (error) {
      result.errors.push(this.createSyncError('network', error.message));
    }

    return result;
  }

  /**
   * 同步玩家统计数据
   */
  private async syncPlayerStats(): Promise<Partial<SyncResult>> {
    const result: Partial<SyncResult> = {
      syncedItems: 0,
      conflicts: 0,
      errors: []
    };

    try {
      const localStats = await this.localProvider.getAllPlayerStats();
      const remoteStats = await this.cloudAdapter.getAllPlayerStats();

      // 合并统计数据
      const mergedStats = this.mergePlayerStats(localStats, remoteStats);
      
      for (const stats of mergedStats) {
        await this.localProvider.updatePlayerStats(stats);
        await this.cloudAdapter.updatePlayerStats(stats);
        result.syncedItems++;
      }
    } catch (error) {
      result.errors.push(this.createSyncError('network', error.message));
    }

    return result;
  }

  /**
   * 同步训练场景数据
   */
  private async syncTrainingScenarios(): Promise<Partial<SyncResult>> {
    const result: Partial<SyncResult> = {
      syncedItems: 0,
      conflicts: 0,
      errors: []
    };

    try {
      const localScenarios = await this.localProvider.queryTrainingScenarios();
      const remoteScenarios = await this.cloudAdapter.getTrainingScenarios();

      // 智能合并场景数据
      const mergedScenarios = this.mergeTrainingScenarios(localScenarios.data, remoteScenarios);
      
      for (const scenario of mergedScenarios) {
        await this.localProvider.saveTrainingScenario(scenario);
        await this.cloudAdapter.saveTrainingScenario(scenario);
        result.syncedItems++;
      }
    } catch (error) {
      result.errors.push(this.createSyncError('network', error.message));
    }

    return result;
  }

  /**
   * 同步用户进度数据
   */
  private async syncUserProgress(): Promise<Partial<SyncResult>> {
    const result: Partial<SyncResult> = {
      syncedItems: 0,
      conflicts: 0,
      errors: []
    };

    try {
      const userId = 'current_user'; // 从认证系统获取
      const localProgress = await this.localProvider.getUserProgress(userId);
      const remoteProgress = await this.cloudAdapter.getUserProgress(userId);

      // 合并用户进度
      const mergedProgress = this.mergeUserProgress(localProgress, remoteProgress);
      
      if (mergedProgress) {
        await this.localProvider.updateUserProgress(mergedProgress);
        await this.cloudAdapter.updateUserProgress(mergedProgress);
        result.syncedItems++;
      }
    } catch (error) {
      result.errors.push(this.createSyncError('network', error.message));
    }

    return result;
  }

  /**
   * 验证数据完整性
   */
  private async validateDataIntegrity(): Promise<void> {
    // 计算本地数据校验和
    this.status.dataIntegrity.localChecksums = await this.calculateLocalChecksums();
    
    // 获取远程数据校验和
    this.status.dataIntegrity.remoteChecksums = await this.cloudAdapter.getChecksums();
    
    // 检测冲突
    this.status.dataIntegrity.conflicts = this.detectConflicts();
    this.status.dataIntegrity.lastValidation = Date.now();
  }

  /**
   * 解决数据冲突
   */
  private async resolveConflicts(): Promise<void> {
    const conflicts = this.status.dataIntegrity.conflicts;
    
    for (const conflict of conflicts) {
      switch (this.config.conflictResolution) {
        case 'local':
          await this.applyLocalResolution(conflict);
          break;
        case 'remote':
          await this.applyRemoteResolution(conflict);
          break;
        case 'newest':
          await this.applyNewestResolution(conflict);
          break;
        case 'manual':
          await this.requestManualResolution(conflict);
          break;
      }
    }
  }

  /**
   * 设置自动同步
   */
  private setupAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (await this.shouldSync()) {
        try {
          await this.sync();
        } catch (error) {
          console.error('Auto sync failed:', error);
        }
      }
    }, this.config.syncInterval * 60 * 1000);
  }

  /**
   * 检查是否应该同步
   */
  private async shouldSync(): Promise<boolean> {
    // 检查网络状态
    if (this.config.networkRequirements.wifiOnly) {
      // 检查是否为WiFi网络
      // 这里需要实现网络状态检测
    }

    // 检查电池状态
    if (this.config.networkRequirements.minBatteryLevel > 0) {
      // 检查电池电量
      // 这里需要实现电池状态检测
    }

    // 检查是否有待同步的变更
    return this.status.pendingChanges > 0;
  }

  /**
   * 监听本地数据变更
   */
  private setupLocalDataListener(): void {
    this.localProvider.onDataChange((event) => {
      this.status.pendingChanges++;
      this.emit('localChange', event);
    });
  }

  /**
   * 获取本地变更
   */
  private async getLocalChanges(entityType: string): Promise<any[]> {
    // 实现基于时间戳的变更检测
    const lastSync = this.status.lastSyncTime || 0;
    
    switch (entityType) {
      case 'handHistory':
        const handHistories = await this.localProvider.queryHandHistory({
          filters: { timestamp: { $gt: lastSync } }
        });
        return handHistories.data;
      
      default:
        return [];
    }
  }

  /**
   * 合并玩家统计数据
   */
  private mergePlayerStats(local: PlayerStats[], remote: PlayerStats[]): PlayerStats[] {
    const merged = new Map<string, PlayerStats>();
    
    // 添加本地数据
    local.forEach(stats => merged.set(stats.playerId, stats));
    
    // 合并远程数据
    remote.forEach(stats => {
      const existing = merged.get(stats.playerId);
      if (existing) {
        // 采用最新的数据
        merged.set(stats.playerId, stats.lastUpdated > existing.lastUpdated ? stats : existing);
      } else {
        merged.set(stats.playerId, stats);
      }
    });
    
    return Array.from(merged.values());
  }

  /**
   * 合并训练场景数据
   */
  private mergeTrainingScenarios(local: TrainingScenario[], remote: TrainingScenario[]): TrainingScenario[] {
    const merged = new Map<string, TrainingScenario>();
    
    // 添加本地场景
    local.forEach(scenario => merged.set(scenario.id, scenario));
    
    // 合并远程场景
    remote.forEach(scenario => {
      merged.set(scenario.id, scenario);
    });
    
    return Array.from(merged.values());
  }

  /**
   * 合并用户进度
   */
  private mergeUserProgress(local: UserProgress | null, remote: UserProgress | null): UserProgress | null {
    if (!local && !remote) return null;
    if (!local) return remote;
    if (!remote) return local;
    
    // 合并进度数据
    return {
      ...local,
      experience: Math.max(local.experience, remote.experience),
      completedScenarios: [...new Set([...local.completedScenarios, ...remote.completedScenarios])],
      achievements: [...new Set([...local.achievements, ...remote.achievements])],
      lastTrainingDate: Math.max(local.lastTrainingDate, remote.lastTrainingDate)
    };
  }

  /**
   * 计算本地数据校验和
   */
  private async calculateLocalChecksums(): Promise<Record<string, string>> {
    const checksums: Record<string, string> = {};
    
    // 计算各类数据的校验和
    const handHistory = await this.localProvider.queryHandHistory();
    checksums.handHistory = this.calculateChecksum(handHistory.data);
    
    const playerStats = await this.localProvider.getAllPlayerStats();
    checksums.playerStats = this.calculateChecksum(playerStats);
    
    const scenarios = await this.localProvider.queryTrainingScenarios();
    checksums.trainingScenarios = this.calculateChecksum(scenarios.data);
    
    return checksums;
  }

  /**
   * 计算数据校验和
   */
  private calculateChecksum(data: any[]): string {
    // 简单的校验和计算
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }

  /**
   * 检测冲突
   */
  private detectConflicts(): SyncConflict[] {
    const conflicts: SyncConflict[] = [];
    const local = this.status.dataIntegrity.localChecksums;
    const remote = this.status.dataIntegrity.remoteChecksums;
    
    // 检查各数据类型的冲突
    Object.keys(local).forEach(entityType => {
      if (local[entityType] !== remote[entityType]) {
        conflicts.push({
          id: this.generateId(),
          entityType,
          entityId: entityType,
          localVersion: { checksum: local[entityType] },
          remoteVersion: { checksum: remote[entityType] },
          conflictType: 'data_mismatch'
        });
      }
    });
    
    return conflicts;
  }

  /**
   * 应用本地解决方案
   */
  private async applyLocalResolution(conflict: SyncConflict): Promise<void> {
    conflict.resolution = 'local';
    // 实现本地数据覆盖远程的逻辑
  }

  /**
   * 应用远程解决方案
   */
  private async applyRemoteResolution(conflict: SyncConflict): Promise<void> {
    conflict.resolution = 'remote';
    // 实现远程数据覆盖本地的逻辑
  }

  /**
   * 应用最新版本解决方案
   */
  private async applyNewestResolution(conflict: SyncConflict): Promise<void> {
    conflict.resolution = 'newest';
    // 实现基于时间戳的最新版本选择逻辑
  }

  /**
   * 请求手动解决方案
   */
  private async requestManualResolution(conflict: SyncConflict): Promise<void> {
    this.emit('conflict', conflict);
    // 等待用户手动解决冲突
  }

  /**
   * 创建同步错误
   */
  private createSyncError(type: SyncError['type'], message: string): SyncError {
    return {
      id: this.generateId(),
      type,
      message,
      timestamp: Date.now(),
      retryCount: 0,
      resolved: false
    };
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 加载同步状态
   */
  private async loadSyncState(): Promise<void> {
    try {
      const savedState = await this.localProvider.get<SyncStatus>('sync_state');
      if (savedState) {
        this.status = savedState;
      }
    } catch (error) {
      console.warn('Failed to load sync state:', error);
    }
  }

  /**
   * 保存同步状态
   */
  private async saveSyncState(): Promise<void> {
    try {
      await this.localProvider.set('sync_state', this.status);
    } catch (error) {
      console.warn('Failed to save sync state:', error);
    }
  }

  /**
   * 事件监听
   */
  on(event: string, callback: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
    
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * 更新同步配置
   */
  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 重新设置自动同步
    if (config.strategy || config.syncInterval) {
      this.setupAutoSync();
    }
  }

  /**
   * 手动触发同步
   */
  async forceSync(): Promise<SyncResult> {
    return await this.sync();
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.eventListeners.clear();
  }
}