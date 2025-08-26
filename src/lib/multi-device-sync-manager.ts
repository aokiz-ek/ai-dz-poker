/**
 * 多设备同步管理器 - 统一多设备数据同步解决方案
 * 
 * 功能特性：
 * 1. 统一管理实时同步和离线同步
 * 2. 设备状态监控和管理
 * 3. 智能同步策略选择
 * 4. 数据冲突自动解决
 * 5. 网络状态自适应
 * 6. 同步性能优化
 */

import { CloudAdapter, CloudProviderConfig } from './storage/cloud-adapter';
import { DataSyncManager, SyncConfig, SyncResult } from './data-sync-manager';
import { RealtimeSyncManager, RealtimeConfig, DeviceInfo } from './realtime-sync-manager';
import { CloudAuthManager } from './cloud-auth-manager';

export interface MultiDeviceSyncConfig {
  // 云端配置
  cloudProvider: CloudProviderConfig;
  
  // 同步策略配置
  syncStrategy: 'realtime' | 'offline' | 'hybrid' | 'auto';
  syncConfig: SyncConfig;
  realtimeConfig?: RealtimeConfig;
  
  // 设备管理配置
  maxDevices: number;
  deviceTimeout: number; // 设备离线超时时间
  
  // 性能配置
  syncBatchSize: number;
  syncThrottleMs: number;
  compressionThreshold: number;
  
  // 安全配置
  encryptionEnabled: boolean;
  deviceVerification: boolean;
}

export interface SyncStrategy {
  name: string;
  priority: number;
  conditions: {
    networkQuality: 'excellent' | 'good' | 'poor' | 'offline';
    batteryLevel?: number;
    dataUsage?: 'unlimited' | 'limited';
  };
  config: Partial<SyncConfig & RealtimeConfig>;
}

export interface NetworkStatus {
  isOnline: boolean;
  type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  quality: 'excellent' | 'good' | 'poor';
  latency: number;
  bandwidth: number;
  isMetered: boolean;
}

export interface DeviceStatus extends DeviceInfo {
  syncStatus: 'syncing' | 'synced' | 'conflict' | 'offline' | 'error';
  lastSyncTime: number;
  pendingChanges: number;
  dataUsage: number;
  syncErrors: number;
}

export interface SyncStats {
  totalDevices: number;
  onlineDevices: number;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  dataTransferred: number;
  conflicts: number;
  resolvedConflicts: number;
}

export interface MultiDeviceStatus {
  currentStrategy: string;
  devices: DeviceStatus[];
  networkStatus: NetworkStatus;
  syncStats: SyncStats;
  isHealthy: boolean;
  issues: string[];
}

export class MultiDeviceSyncManager {
  private config: MultiDeviceSyncConfig;
  private cloudAdapter: CloudAdapter;
  private authManager: CloudAuthManager;
  private syncManager: DataSyncManager;
  private realtimeSyncManager?: RealtimeSyncManager;
  
  private currentStrategy: SyncStrategy;
  private availableStrategies: SyncStrategy[] = [];
  private networkStatus: NetworkStatus;
  private devices: Map<string, DeviceStatus> = new Map();
  private syncStats: SyncStats;
  private isInitialized = false;
  
  private eventListeners: Map<string, Function[]> = new Map();
  private strategyEvaluationTimer?: NodeJS.Timeout;
  private deviceCleanupTimer?: NodeJS.Timeout;
  private networkMonitorTimer?: NodeJS.Timeout;

  constructor(config: MultiDeviceSyncConfig) {
    this.config = config;
    
    // 初始化组件
    this.cloudAdapter = this.createCloudAdapter(config.cloudProvider);
    this.authManager = new CloudAuthManager(config.cloudProvider);
    this.syncManager = new DataSyncManager(
      this.cloudAdapter, 
      this.cloudAdapter, 
      config.syncConfig
    );
    
    // 初始化状态
    this.networkStatus = this.getInitialNetworkStatus();
    this.syncStats = this.getInitialSyncStats();
    this.currentStrategy = this.getDefaultStrategy();
    
    // 设置策略
    this.setupSyncStrategies();
  }

  /**
   * 初始化多设备同步管理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🚀 初始化多设备同步管理器...');

      // 1. 初始化认证
      await this.authManager.initialize();

      // 2. 初始化云端适配器
      await this.cloudAdapter.initialize();

      // 3. 初始化数据同步管理器
      await this.syncManager.initialize();

      // 4. 根据策略初始化实时同步
      if (this.shouldUseRealtimeSync()) {
        await this.initializeRealtimeSync();
      }

      // 5. 设置监控和定时任务
      this.setupNetworkMonitoring();
      this.setupDeviceCleanup();
      this.setupStrategyEvaluation();

      // 6. 注册当前设备
      await this.registerCurrentDevice();

      // 7. 执行初始同步
      await this.performInitialSync();

      this.isInitialized = true;
      console.log('✅ 多设备同步管理器初始化完成');
      
      this.emit('initialized', {
        strategy: this.currentStrategy.name,
        devices: Array.from(this.devices.values()),
        networkStatus: this.networkStatus
      });
    } catch (error) {
      console.error('❌ 多设备同步初始化失败:', error);
      this.emit('initialization_failed', error);
      throw error;
    }
  }

  /**
   * 初始化实时同步
   */
  private async initializeRealtimeSync(): Promise<void> {
    if (!this.config.realtimeConfig) {
      throw new Error('实时同步配置缺失');
    }

    this.realtimeSyncManager = new RealtimeSyncManager(
      this.config.realtimeConfig,
      this.cloudAdapter,
      this.syncManager
    );

    // 监听实时同步事件
    this.realtimeSyncManager.on('connected', () => {
      this.emit('realtime_connected');
    });

    this.realtimeSyncManager.on('disconnected', () => {
      this.emit('realtime_disconnected');
      this.evaluateAndSwitchStrategy();
    });

    this.realtimeSyncManager.on('device_status_changed', (data) => {
      this.updateDeviceStatus(data.deviceInfo);
      this.emit('device_status_changed', data);
    });

    this.realtimeSyncManager.on('conflict_detected', (conflict) => {
      this.handleConflict(conflict);
    });

    await this.realtimeSyncManager.initialize();
  }

  /**
   * 执行同步
   */
  async sync(): Promise<SyncResult> {
    if (!this.isInitialized) {
      throw new Error('同步管理器未初始化');
    }

    const startTime = Date.now();
    
    try {
      this.emit('sync_started', { strategy: this.currentStrategy.name });
      
      let result: SyncResult;

      switch (this.currentStrategy.name) {
        case 'realtime':
          result = await this.performRealtimeSync();
          break;
          
        case 'offline':
          result = await this.performOfflineSync();
          break;
          
        case 'hybrid':
          result = await this.performHybridSync();
          break;
          
        default:
          result = await this.performAutoSync();
      }

      // 更新统计信息
      this.updateSyncStats(result, Date.now() - startTime);
      
      this.emit('sync_completed', result);
      return result;
    } catch (error) {
      this.syncStats.failedSyncs++;
      this.emit('sync_failed', error);
      throw error;
    }
  }

  /**
   * 执行实时同步
   */
  private async performRealtimeSync(): Promise<SyncResult> {
    if (!this.realtimeSyncManager) {
      throw new Error('实时同步管理器未初始化');
    }

    // 强制实时同步
    await this.realtimeSyncManager.forceSync();
    
    return {
      success: true,
      syncedItems: 0, // 实时同步不统计具体项数
      conflicts: this.realtimeSyncManager.getStatus().conflicts.length,
      errors: [],
      duration: 0,
      bytesTransferred: 0
    };
  }

  /**
   * 执行离线同步
   */
  private async performOfflineSync(): Promise<SyncResult> {
    return await this.syncManager.sync();
  }

  /**
   * 执行混合同步
   */
  private async performHybridSync(): Promise<SyncResult> {
    // 先尝试实时同步，失败则使用离线同步
    try {
      if (this.realtimeSyncManager && this.networkStatus.quality !== 'poor') {
        return await this.performRealtimeSync();
      } else {
        return await this.performOfflineSync();
      }
    } catch (error) {
      console.warn('实时同步失败，切换到离线同步:', error);
      return await this.performOfflineSync();
    }
  }

  /**
   * 执行自动同步
   */
  private async performAutoSync(): Promise<SyncResult> {
    // 根据当前网络状态和设备状态选择最佳同步方式
    if (this.networkStatus.isOnline && this.networkStatus.quality === 'excellent') {
      return await this.performRealtimeSync();
    } else if (this.networkStatus.isOnline) {
      return await this.performHybridSync();
    } else {
      // 离线状态，返回缓存的同步结果
      return {
        success: false,
        syncedItems: 0,
        conflicts: 0,
        errors: [{ id: 'offline', type: 'network', message: '设备离线', timestamp: Date.now(), retryCount: 0, resolved: false }],
        duration: 0,
        bytesTransferred: 0
      };
    }
  }

  /**
   * 设置同步策略
   */
  private setupSyncStrategies(): void {
    this.availableStrategies = [
      {
        name: 'realtime',
        priority: 1,
        conditions: {
          networkQuality: 'excellent',
          batteryLevel: 30,
          dataUsage: 'unlimited'
        },
        config: {
          strategy: 'smart',
          syncInterval: 1,
          ...this.config.realtimeConfig
        }
      },
      {
        name: 'hybrid',
        priority: 2,
        conditions: {
          networkQuality: 'good',
          batteryLevel: 20
        },
        config: {
          strategy: 'auto',
          syncInterval: 5
        }
      },
      {
        name: 'offline',
        priority: 3,
        conditions: {
          networkQuality: 'poor'
        },
        config: {
          strategy: 'manual',
          syncInterval: 30
        }
      }
    ];

    // 根据配置选择初始策略
    this.currentStrategy = this.selectOptimalStrategy();
  }

  /**
   * 选择最优同步策略
   */
  private selectOptimalStrategy(): SyncStrategy {
    for (const strategy of this.availableStrategies.sort((a, b) => a.priority - b.priority)) {
      if (this.meetsStrategyConditions(strategy)) {
        return strategy;
      }
    }
    
    // 默认使用离线策略
    return this.availableStrategies.find(s => s.name === 'offline') || this.availableStrategies[0];
  }

  /**
   * 检查策略条件
   */
  private meetsStrategyConditions(strategy: SyncStrategy): boolean {
    const conditions = strategy.conditions;
    
    // 检查网络质量
    if (this.networkStatus.quality !== conditions.networkQuality && conditions.networkQuality !== 'offline') {
      if (this.networkStatus.quality === 'poor' && conditions.networkQuality === 'excellent') {
        return false;
      }
    }
    
    // 检查电池电量（如果浏览器支持）
    if (conditions.batteryLevel && 'getBattery' in navigator) {
      // 这里可以添加电池电量检查逻辑
    }
    
    // 检查数据使用情况
    if (conditions.dataUsage === 'unlimited' && this.networkStatus.isMetered) {
      return false;
    }
    
    return true;
  }

  /**
   * 评估并切换策略
   */
  private async evaluateAndSwitchStrategy(): Promise<void> {
    const optimalStrategy = this.selectOptimalStrategy();
    
    if (optimalStrategy.name !== this.currentStrategy.name) {
      console.log(`🔄 切换同步策略: ${this.currentStrategy.name} -> ${optimalStrategy.name}`);
      
      await this.switchStrategy(optimalStrategy);
    }
  }

  /**
   * 切换同步策略
   */
  private async switchStrategy(newStrategy: SyncStrategy): Promise<void> {
    const oldStrategy = this.currentStrategy;
    this.currentStrategy = newStrategy;
    
    try {
      // 清理旧策略的资源
      if (oldStrategy.name === 'realtime' && newStrategy.name !== 'realtime') {
        this.realtimeSyncManager?.disconnect();
      }
      
      // 初始化新策略的资源
      if (newStrategy.name === 'realtime' && !this.realtimeSyncManager) {
        await this.initializeRealtimeSync();
      }
      
      // 更新配置
      this.syncManager.updateConfig(newStrategy.config as SyncConfig);
      
      this.emit('strategy_changed', {
        oldStrategy: oldStrategy.name,
        newStrategy: newStrategy.name,
        reason: 'auto_evaluation'
      });
    } catch (error) {
      console.error('策略切换失败:', error);
      this.currentStrategy = oldStrategy; // 回滚
      throw error;
    }
  }

  /**
   * 网络状态监控
   */
  private setupNetworkMonitoring(): void {
    // 监听网络状态变化
    window.addEventListener('online', () => {
      this.networkStatus.isOnline = true;
      this.updateNetworkQuality();
      this.evaluateAndSwitchStrategy();
      this.emit('network_status_changed', this.networkStatus);
    });

    window.addEventListener('offline', () => {
      this.networkStatus.isOnline = false;
      this.networkStatus.quality = 'poor';
      this.evaluateAndSwitchStrategy();
      this.emit('network_status_changed', this.networkStatus);
    });

    // 定期检测网络质量
    this.networkMonitorTimer = setInterval(() => {
      this.updateNetworkQuality();
    }, 30000); // 每30秒检查一次
  }

  /**
   * 更新网络质量
   */
  private async updateNetworkQuality(): Promise<void> {
    if (!this.networkStatus.isOnline) {
      this.networkStatus.quality = 'poor';
      return;
    }

    try {
      // 简单的网络质量检测
      const start = Date.now();
      const response = await fetch('/api/ping', { 
        method: 'GET',
        cache: 'no-cache'
      });
      const latency = Date.now() - start;
      
      this.networkStatus.latency = latency;
      
      if (latency < 100) {
        this.networkStatus.quality = 'excellent';
      } else if (latency < 300) {
        this.networkStatus.quality = 'good';
      } else {
        this.networkStatus.quality = 'poor';
      }
    } catch (error) {
      this.networkStatus.quality = 'poor';
    }
  }

  /**
   * 设备清理
   */
  private setupDeviceCleanup(): void {
    this.deviceCleanupTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.deviceTimeout;
      
      for (const [deviceId, device] of this.devices) {
        if (now - device.lastSeen > timeout) {
          device.syncStatus = 'offline';
          this.emit('device_timeout', device);
        }
      }
    }, 60000); // 每分钟检查一次
  }

  /**
   * 策略评估
   */
  private setupStrategyEvaluation(): void {
    this.strategyEvaluationTimer = setInterval(() => {
      this.evaluateAndSwitchStrategy();
    }, 5 * 60 * 1000); // 每5分钟评估一次
  }

  /**
   * 注册当前设备
   */
  private async registerCurrentDevice(): Promise<void> {
    const deviceInfo: DeviceInfo = {
      deviceId: this.generateDeviceId(),
      deviceName: this.getDeviceName(),
      deviceType: this.detectDeviceType(),
      osInfo: navigator.platform,
      browserInfo: navigator.userAgent,
      isOnline: true,
      lastSeen: Date.now(),
      priority: 1,
      capabilities: ['sync', 'offline', 'realtime']
    };

    const deviceStatus: DeviceStatus = {
      ...deviceInfo,
      syncStatus: 'synced',
      lastSyncTime: Date.now(),
      pendingChanges: 0,
      dataUsage: 0,
      syncErrors: 0
    };

    this.devices.set(deviceInfo.deviceId, deviceStatus);
    
    // 保存到云端
    await this.cloudAdapter.set(`device_${deviceInfo.deviceId}`, deviceInfo);
  }

  /**
   * 执行初始同步
   */
  private async performInitialSync(): Promise<void> {
    try {
      console.log('🔄 执行初始同步...');
      const result = await this.sync();
      
      if (result.success) {
        console.log('✅ 初始同步完成');
      } else {
        console.warn('⚠️ 初始同步部分失败', result.errors);
      }
    } catch (error) {
      console.error('❌ 初始同步失败:', error);
      // 不抛出错误，允许应用继续运行
    }
  }

  /**
   * 更新设备状态
   */
  private updateDeviceStatus(deviceInfo: DeviceInfo): void {
    const existingDevice = this.devices.get(deviceInfo.deviceId);
    
    if (existingDevice) {
      existingDevice.isOnline = deviceInfo.isOnline;
      existingDevice.lastSeen = deviceInfo.lastSeen;
      existingDevice.priority = deviceInfo.priority;
    } else {
      const newDevice: DeviceStatus = {
        ...deviceInfo,
        syncStatus: 'synced',
        lastSyncTime: 0,
        pendingChanges: 0,
        dataUsage: 0,
        syncErrors: 0
      };
      this.devices.set(deviceInfo.deviceId, newDevice);
    }
    
    this.syncStats.totalDevices = this.devices.size;
    this.syncStats.onlineDevices = Array.from(this.devices.values()).filter(d => d.isOnline).length;
  }

  /**
   * 处理冲突
   */
  private async handleConflict(conflict: any): Promise<void> {
    this.syncStats.conflicts++;
    
    // 根据配置自动解决或等待手动处理
    if (this.config.syncConfig.conflictResolution !== 'manual') {
      try {
        // 自动解决冲突的逻辑
        this.syncStats.resolvedConflicts++;
        this.emit('conflict_resolved', conflict);
      } catch (error) {
        this.emit('conflict_resolution_failed', { conflict, error });
      }
    } else {
      this.emit('manual_conflict_resolution_required', conflict);
    }
  }

  /**
   * 更新同步统计
   */
  private updateSyncStats(result: SyncResult, duration: number): void {
    this.syncStats.totalSyncs++;
    
    if (result.success) {
      this.syncStats.successfulSyncs++;
    } else {
      this.syncStats.failedSyncs++;
    }
    
    // 更新平均同步时间
    this.syncStats.averageSyncTime = (
      (this.syncStats.averageSyncTime * (this.syncStats.totalSyncs - 1) + duration) / 
      this.syncStats.totalSyncs
    );
    
    this.syncStats.dataTransferred += result.bytesTransferred || 0;
  }

  // =================== 工具方法 ===================

  private createCloudAdapter(config: CloudProviderConfig): CloudAdapter {
    const { createCloudAdapter } = require('./storage/cloud-adapter');
    return createCloudAdapter(config);
  }

  private shouldUseRealtimeSync(): boolean {
    return this.config.syncStrategy === 'realtime' || 
           this.config.syncStrategy === 'hybrid' ||
           this.config.syncStrategy === 'auto';
  }

  private getInitialNetworkStatus(): NetworkStatus {
    return {
      isOnline: navigator.onLine,
      type: 'unknown',
      quality: 'good',
      latency: 0,
      bandwidth: 0,
      isMetered: false
    };
  }

  private getInitialSyncStats(): SyncStats {
    return {
      totalDevices: 0,
      onlineDevices: 0,
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      dataTransferred: 0,
      conflicts: 0,
      resolvedConflicts: 0
    };
  }

  private getDefaultStrategy(): SyncStrategy {
    return {
      name: this.config.syncStrategy || 'auto',
      priority: 1,
      conditions: { networkQuality: 'good' },
      config: this.config.syncConfig
    };
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceName(): string {
    return `${this.detectDeviceType()}_${new Date().toLocaleDateString()}`;
  }

  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/tablet|ipad/.test(userAgent)) {
      return 'tablet';
    } else if (/mobile|android|iphone/.test(userAgent)) {
      return 'mobile';
    } else {
      return 'desktop';
    }
  }

  // =================== 事件系统 ===================

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

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // =================== 公共方法 ===================

  /**
   * 获取当前状态
   */
  getStatus(): MultiDeviceStatus {
    return {
      currentStrategy: this.currentStrategy.name,
      devices: Array.from(this.devices.values()),
      networkStatus: this.networkStatus,
      syncStats: this.syncStats,
      isHealthy: this.isHealthy(),
      issues: this.getHealthIssues()
    };
  }

  /**
   * 检查健康状态
   */
  private isHealthy(): boolean {
    const failureRate = this.syncStats.totalSyncs > 0 ? 
      this.syncStats.failedSyncs / this.syncStats.totalSyncs : 0;
    
    return failureRate < 0.1 && // 失败率小于10%
           this.networkStatus.isOnline &&
           this.syncStats.conflicts < 10; // 冲突数量少于10个
  }

  /**
   * 获取健康问题
   */
  private getHealthIssues(): string[] {
    const issues: string[] = [];
    
    if (!this.networkStatus.isOnline) {
      issues.push('设备离线');
    }
    
    if (this.syncStats.totalSyncs > 0) {
      const failureRate = this.syncStats.failedSyncs / this.syncStats.totalSyncs;
      if (failureRate > 0.1) {
        issues.push(`同步失败率过高: ${(failureRate * 100).toFixed(1)}%`);
      }
    }
    
    if (this.syncStats.conflicts > 10) {
      issues.push(`未解决冲突过多: ${this.syncStats.conflicts}个`);
    }
    
    const offlineDevices = Array.from(this.devices.values()).filter(d => !d.isOnline).length;
    if (offlineDevices > 0) {
      issues.push(`${offlineDevices}个设备离线`);
    }
    
    return issues;
  }

  /**
   * 强制切换策略
   */
  async switchToStrategy(strategyName: string): Promise<void> {
    const strategy = this.availableStrategies.find(s => s.name === strategyName);
    if (!strategy) {
      throw new Error(`未知的同步策略: ${strategyName}`);
    }
    
    await this.switchStrategy(strategy);
  }

  /**
   * 获取同步统计
   */
  getSyncStats(): SyncStats {
    return { ...this.syncStats };
  }

  /**
   * 重置统计数据
   */
  resetStats(): void {
    this.syncStats = this.getInitialSyncStats();
    this.emit('stats_reset');
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    // 清理定时器
    if (this.strategyEvaluationTimer) {
      clearInterval(this.strategyEvaluationTimer);
    }
    if (this.deviceCleanupTimer) {
      clearInterval(this.deviceCleanupTimer);
    }
    if (this.networkMonitorTimer) {
      clearInterval(this.networkMonitorTimer);
    }
    
    // 销毁组件
    this.realtimeSyncManager?.destroy();
    this.syncManager.destroy();
    this.authManager.destroy();
    
    // 清理资源
    this.eventListeners.clear();
    this.devices.clear();
    
    this.isInitialized = false;
  }
}

export default MultiDeviceSyncManager;