/**
 * 实时同步管理器 - WebSocket多设备数据同步
 * 
 * 功能特性：
 * 1. WebSocket实时连接管理
 * 2. 多设备状态同步
 * 3. 冲突解决和优先级处理
 * 4. 离线状态处理和恢复
 * 5. 心跳检测和重连机制
 * 6. 数据变更广播和订阅
 */

import { CloudAdapter } from './storage/cloud-adapter';
import { DataSyncManager, SyncConfig } from './data-sync-manager';

export interface RealtimeConfig {
  // WebSocket 配置
  websocketUrl: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  
  // 同步配置
  syncConflictResolution: 'newest' | 'manual' | 'priority';
  devicePriority: number;
  batchSync: boolean;
  batchSyncInterval: number;
  
  // 性能配置
  maxPendingChanges: number;
  compressionEnabled: boolean;
  throttleMs: number;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  osInfo: string;
  browserInfo: string;
  isOnline: boolean;
  lastSeen: number;
  priority: number;
  capabilities: string[];
}

export interface RealtimeMessage {
  id: string;
  type: 'sync' | 'heartbeat' | 'device_status' | 'conflict' | 'broadcast';
  fromDevice: string;
  toDevice?: string; // 空表示广播
  timestamp: number;
  data: any;
  priority: number;
}

export interface DataChange {
  id: string;
  entity: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  deviceId: string;
  checksum: string;
}

export interface ConflictInfo {
  changeId: string;
  entity: string;
  entityId: string;
  conflicts: DataChange[];
  resolution?: 'local' | 'remote' | 'merge';
}

export interface RealtimeStatus {
  isConnected: boolean;
  connectionId: string | null;
  connectedDevices: DeviceInfo[];
  pendingChanges: number;
  lastSync: number;
  conflicts: ConflictInfo[];
  networkLatency: number;
  reconnectAttempts: number;
}

export class RealtimeSyncManager {
  private config: RealtimeConfig;
  private cloudAdapter: CloudAdapter;
  private syncManager: DataSyncManager;
  private websocket: WebSocket | null = null;
  private deviceInfo: DeviceInfo;
  private status: RealtimeStatus;
  private messageQueue: RealtimeMessage[] = [];
  private pendingChanges: Map<string, DataChange> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private batchSyncTimer?: NodeJS.Timeout;

  constructor(
    config: RealtimeConfig,
    cloudAdapter: CloudAdapter,
    syncManager: DataSyncManager
  ) {
    this.config = config;
    this.cloudAdapter = cloudAdapter;
    this.syncManager = syncManager;
    
    this.deviceInfo = {
      deviceId: this.generateDeviceId(),
      deviceName: this.getDeviceName(),
      deviceType: this.detectDeviceType(),
      osInfo: this.getOSInfo(),
      browserInfo: this.getBrowserInfo(),
      isOnline: true,
      lastSeen: Date.now(),
      priority: config.devicePriority,
      capabilities: ['sync', 'realtime', 'offline']
    };

    this.status = {
      isConnected: false,
      connectionId: null,
      connectedDevices: [],
      pendingChanges: 0,
      lastSync: 0,
      conflicts: [],
      networkLatency: 0,
      reconnectAttempts: 0
    };
  }

  /**
   * 初始化实时同步
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 初始化实时同步管理器...');
      
      // 连接WebSocket
      await this.connectWebSocket();
      
      // 设置心跳检测
      this.setupHeartbeat();
      
      // 设置批量同步
      if (this.config.batchSync) {
        this.setupBatchSync();
      }
      
      // 监听本地数据变更
      this.setupLocalChangeListener();
      
      // 注册设备信息
      await this.registerDevice();
      
      console.log('✅ 实时同步管理器初始化完成');
      this.emit('initialized', this.status);
    } catch (error) {
      console.error('❌ 实时同步初始化失败:', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * 连接WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.config.websocketUrl);
        
        this.websocket.onopen = () => {
          console.log('🔗 WebSocket连接已建立');
          this.status.isConnected = true;
          this.status.reconnectAttempts = 0;
          this.clearReconnectTimer();
          this.emit('connected', this.status);
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.websocket.onclose = (event) => {
          console.log('🔌 WebSocket连接已断开', event.code, event.reason);
          this.status.isConnected = false;
          this.status.connectionId = null;
          this.emit('disconnected', this.status);
          this.scheduleReconnect();
        };

        this.websocket.onerror = (error) => {
          console.error('❌ WebSocket连接错误:', error);
          this.emit('error', error);
          reject(error);
        };

        // 连接超时处理
        setTimeout(() => {
          if (this.websocket?.readyState !== WebSocket.OPEN) {
            this.websocket?.close();
            reject(new Error('WebSocket连接超时'));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 处理接收到的消息
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const message: RealtimeMessage = JSON.parse(event.data);
      
      // 更新网络延迟
      if (message.type === 'heartbeat' && message.fromDevice !== this.deviceInfo.deviceId) {
        this.status.networkLatency = Date.now() - message.timestamp;
      }

      switch (message.type) {
        case 'sync':
          await this.handleSyncMessage(message);
          break;
          
        case 'device_status':
          this.handleDeviceStatusMessage(message);
          break;
          
        case 'conflict':
          this.handleConflictMessage(message);
          break;
          
        case 'broadcast':
          this.handleBroadcastMessage(message);
          break;
          
        case 'heartbeat':
          // 心跳消息已在上面处理
          break;
          
        default:
          console.warn('未知的消息类型:', message.type);
      }
    } catch (error) {
      console.error('消息处理错误:', error);
    }
  }

  /**
   * 处理同步消息
   */
  private async handleSyncMessage(message: RealtimeMessage): Promise<void> {
    const changes: DataChange[] = message.data.changes || [];
    
    for (const change of changes) {
      // 检查是否是来自本设备的更改
      if (change.deviceId === this.deviceInfo.deviceId) {
        continue;
      }
      
      // 检查冲突
      const conflict = await this.detectConflict(change);
      if (conflict) {
        await this.handleConflict(conflict);
        continue;
      }
      
      // 应用远程更改
      await this.applyRemoteChange(change);
    }
    
    this.status.lastSync = Date.now();
    this.emit('synced', { changes: changes.length });
  }

  /**
   * 处理设备状态消息
   */
  private handleDeviceStatusMessage(message: RealtimeMessage): void {
    const deviceInfo: DeviceInfo = message.data;
    
    // 更新设备列表
    const existingIndex = this.status.connectedDevices.findIndex(
      d => d.deviceId === deviceInfo.deviceId
    );
    
    if (existingIndex >= 0) {
      this.status.connectedDevices[existingIndex] = deviceInfo;
    } else {
      this.status.connectedDevices.push(deviceInfo);
    }
    
    this.emit('device_status_changed', { deviceInfo, devices: this.status.connectedDevices });
  }

  /**
   * 处理冲突消息
   */
  private handleConflictMessage(message: RealtimeMessage): void {
    const conflictInfo: ConflictInfo = message.data;
    
    // 添加到冲突列表
    this.status.conflicts.push(conflictInfo);
    
    this.emit('conflict_detected', conflictInfo);
  }

  /**
   * 处理广播消息
   */
  private handleBroadcastMessage(message: RealtimeMessage): void {
    this.emit('broadcast_received', message.data);
  }

  /**
   * 发送消息
   */
  private sendMessage(message: RealtimeMessage): boolean {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      // 将消息加入队列，等待重连后发送
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.websocket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('消息发送失败:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  /**
   * 广播本地数据变更
   */
  async broadcastChange(change: DataChange): Promise<void> {
    // 节流处理
    if (this.shouldThrottle(change)) {
      return;
    }
    
    const message: RealtimeMessage = {
      id: this.generateMessageId(),
      type: 'sync',
      fromDevice: this.deviceInfo.deviceId,
      timestamp: Date.now(),
      priority: this.config.devicePriority,
      data: {
        changes: [change]
      }
    };

    if (this.config.batchSync) {
      // 批量同步模式：添加到待处理队列
      this.pendingChanges.set(change.id, change);
      this.status.pendingChanges = this.pendingChanges.size;
    } else {
      // 实时同步模式：立即发送
      this.sendMessage(message);
    }
  }

  /**
   * 检测数据冲突
   */
  private async detectConflict(remoteChange: DataChange): Promise<ConflictInfo | null> {
    // 检查是否存在本地待处理的相同实体更改
    const localChange = Array.from(this.pendingChanges.values()).find(
      change => change.entity === remoteChange.entity && 
               change.entityId === remoteChange.entityId
    );

    if (!localChange) {
      return null;
    }

    // 比较时间戳和校验和
    if (localChange.timestamp === remoteChange.timestamp && 
        localChange.checksum === remoteChange.checksum) {
      // 相同的更改，无冲突
      return null;
    }

    return {
      changeId: remoteChange.id,
      entity: remoteChange.entity,
      entityId: remoteChange.entityId,
      conflicts: [localChange, remoteChange]
    };
  }

  /**
   * 处理数据冲突
   */
  private async handleConflict(conflict: ConflictInfo): Promise<void> {
    switch (this.config.syncConflictResolution) {
      case 'newest':
        const newestChange = conflict.conflicts.reduce((newest, current) =>
          current.timestamp > newest.timestamp ? current : newest
        );
        await this.applyRemoteChange(newestChange);
        conflict.resolution = newestChange.deviceId === this.deviceInfo.deviceId ? 'local' : 'remote';
        break;

      case 'priority':
        const highestPriorityChange = conflict.conflicts.reduce((highest, current) => {
          const currentDevice = this.status.connectedDevices.find(d => d.deviceId === current.deviceId);
          const highestDevice = this.status.connectedDevices.find(d => d.deviceId === highest.deviceId);
          return (currentDevice?.priority || 0) > (highestDevice?.priority || 0) ? current : highest;
        });
        await this.applyRemoteChange(highestPriorityChange);
        conflict.resolution = highestPriorityChange.deviceId === this.deviceInfo.deviceId ? 'local' : 'remote';
        break;

      case 'manual':
        // 保持冲突状态，等待手动解决
        conflict.resolution = undefined;
        this.emit('manual_conflict_resolution_required', conflict);
        return;
    }

    // 移除已解决的冲突
    this.status.conflicts = this.status.conflicts.filter(c => c.changeId !== conflict.changeId);
    this.emit('conflict_resolved', conflict);
  }

  /**
   * 应用远程数据变更
   */
  private async applyRemoteChange(change: DataChange): Promise<void> {
    try {
      switch (change.operation) {
        case 'create':
        case 'update':
          await this.cloudAdapter.set(`${change.entity}_${change.entityId}`, change.data);
          break;
          
        case 'delete':
          await this.cloudAdapter.delete(`${change.entity}_${change.entityId}`);
          break;
      }
      
      // 移除本地对应的待处理更改
      this.pendingChanges.delete(change.id);
      this.status.pendingChanges = this.pendingChanges.size;
      
      this.emit('change_applied', change);
    } catch (error) {
      console.error('应用远程更改失败:', error);
      this.emit('change_apply_failed', { change, error });
    }
  }

  /**
   * 设置心跳检测
   */
  private setupHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const heartbeatMessage: RealtimeMessage = {
        id: this.generateMessageId(),
        type: 'heartbeat',
        fromDevice: this.deviceInfo.deviceId,
        timestamp: Date.now(),
        priority: 0,
        data: {
          deviceInfo: this.deviceInfo,
          status: {
            pendingChanges: this.status.pendingChanges,
            lastSync: this.status.lastSync
          }
        }
      };
      
      this.sendMessage(heartbeatMessage);
    }, this.config.heartbeatInterval);
  }

  /**
   * 设置批量同步
   */
  private setupBatchSync(): void {
    this.batchSyncTimer = setInterval(async () => {
      if (this.pendingChanges.size === 0) {
        return;
      }
      
      const changes = Array.from(this.pendingChanges.values());
      const batchMessage: RealtimeMessage = {
        id: this.generateMessageId(),
        type: 'sync',
        fromDevice: this.deviceInfo.deviceId,
        timestamp: Date.now(),
        priority: this.config.devicePriority,
        data: {
          changes
        }
      };
      
      if (this.sendMessage(batchMessage)) {
        this.pendingChanges.clear();
        this.status.pendingChanges = 0;
      }
    }, this.config.batchSyncInterval);
  }

  /**
   * 监听本地数据变更
   */
  private setupLocalChangeListener(): void {
    // 监听云端适配器的数据变更事件
    this.cloudAdapter.onDataChange((event) => {
      const change: DataChange = {
        id: this.generateChangeId(),
        entity: event.entity || 'unknown',
        entityId: event.entityId || 'unknown',
        operation: event.operation || 'update',
        data: event.data,
        timestamp: Date.now(),
        deviceId: this.deviceInfo.deviceId,
        checksum: this.calculateChecksum(event.data)
      };
      
      this.broadcastChange(change);
    });
  }

  /**
   * 注册设备信息
   */
  private async registerDevice(): Promise<void> {
    const registrationMessage: RealtimeMessage = {
      id: this.generateMessageId(),
      type: 'device_status',
      fromDevice: this.deviceInfo.deviceId,
      timestamp: Date.now(),
      priority: this.config.devicePriority,
      data: this.deviceInfo
    };
    
    this.sendMessage(registrationMessage);
  }

  /**
   * 重连调度
   */
  private scheduleReconnect(): void {
    if (this.status.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('🚫 达到最大重连次数，停止重连');
      this.emit('max_reconnect_attempts_reached');
      return;
    }
    
    this.clearReconnectTimer();
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.status.reconnectAttempts),
      30000 // 最大延迟30秒
    );
    
    console.log(`🔄 将在 ${delay}ms 后尝试重连... (第${this.status.reconnectAttempts + 1}次)`);
    
    this.reconnectTimer = setTimeout(async () => {
      this.status.reconnectAttempts++;
      
      try {
        await this.connectWebSocket();
        
        // 重连成功后发送队列中的消息
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          if (message) {
            this.sendMessage(message);
          }
        }
        
        // 重新注册设备
        await this.registerDevice();
        
      } catch (error) {
        console.error('重连失败:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * 清除重连定时器
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  /**
   * 节流检查
   */
  private shouldThrottle(change: DataChange): boolean {
    // 简化的节流实现
    const now = Date.now();
    const lastChangeKey = `${change.entity}_${change.entityId}_last`;
    const lastTime = (this as any)[lastChangeKey] || 0;
    
    if (now - lastTime < this.config.throttleMs) {
      return true;
    }
    
    (this as any)[lastChangeKey] = now;
    return false;
  }

  /**
   * 手动解决冲突
   */
  async resolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
    const conflict = this.status.conflicts.find(c => c.changeId === conflictId);
    if (!conflict) {
      throw new Error('冲突不存在');
    }

    switch (resolution) {
      case 'local':
        // 保持本地版本，广播覆盖
        const localChange = conflict.conflicts.find(c => c.deviceId === this.deviceInfo.deviceId);
        if (localChange) {
          await this.broadcastChange(localChange);
        }
        break;

      case 'remote':
        // 应用远程版本
        const remoteChange = conflict.conflicts.find(c => c.deviceId !== this.deviceInfo.deviceId);
        if (remoteChange) {
          await this.applyRemoteChange(remoteChange);
        }
        break;

      case 'merge':
        // 合并版本（需要具体的合并逻辑）
        const mergedChange = await this.mergeConflicts(conflict.conflicts);
        await this.applyRemoteChange(mergedChange);
        await this.broadcastChange(mergedChange);
        break;
    }

    conflict.resolution = resolution;
    this.status.conflicts = this.status.conflicts.filter(c => c.changeId !== conflictId);
    
    this.emit('conflict_resolved', conflict);
  }

  /**
   * 合并冲突数据
   */
  private async mergeConflicts(conflicts: DataChange[]): Promise<DataChange> {
    // 简化的合并逻辑：使用最新时间戳的数据作为基础，合并其他字段
    const latest = conflicts.reduce((newest, current) =>
      current.timestamp > newest.timestamp ? current : newest
    );

    const merged = { ...latest };
    
    // 这里可以实现更复杂的合并逻辑
    // 例如：字段级别的合并、用户自定义合并规则等
    
    merged.id = this.generateChangeId();
    merged.timestamp = Date.now();
    merged.deviceId = this.deviceInfo.deviceId;
    merged.checksum = this.calculateChecksum(merged.data);

    return merged;
  }

  /**
   * 计算数据校验和
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }

  // =================== 工具方法 ===================

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceName(): string {
    return `${this.detectDeviceType()}_${Date.now()}`;
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

  private getOSInfo(): string {
    return navigator.platform || 'Unknown OS';
  }

  private getBrowserInfo(): string {
    return `${navigator.userAgent.split(' ')[0]} ${navigator.appVersion.split(' ')[0]}`;
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
   * 获取实时状态
   */
  getStatus(): RealtimeStatus {
    return { ...this.status };
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  /**
   * 强制同步
   */
  async forceSync(): Promise<void> {
    if (this.pendingChanges.size === 0) {
      return;
    }

    const changes = Array.from(this.pendingChanges.values());
    const syncMessage: RealtimeMessage = {
      id: this.generateMessageId(),
      type: 'sync',
      fromDevice: this.deviceInfo.deviceId,
      timestamp: Date.now(),
      priority: this.config.devicePriority + 1, // 提高优先级
      data: { changes }
    };
    
    if (this.sendMessage(syncMessage)) {
      this.pendingChanges.clear();
      this.status.pendingChanges = 0;
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.clearReconnectTimer();
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    if (this.batchSyncTimer) {
      clearInterval(this.batchSyncTimer);
    }
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.status.isConnected = false;
    this.emit('disconnected', this.status);
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.pendingChanges.clear();
    this.messageQueue.length = 0;
  }
}

export default RealtimeSyncManager;