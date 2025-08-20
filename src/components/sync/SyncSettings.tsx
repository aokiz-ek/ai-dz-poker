/**
 * 数据同步设置界面
 * 
 * 功能：
 * 1. 同步配置管理
 * 2. 实时同步状态显示
 * 3. 冲突解决界面
 * 4. 数据备份和恢复
 * 5. 网络状态监控
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Switch, Select, Input, Progress, Alert, Badge, Divider, List, Tag, Modal, Form, Space, Typography, Statistic, Timeline, Tooltip } from 'antd';
import { CloudUploadOutlined, CloudDownloadOutlined, SyncOutlined, SettingOutlined, WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { DataSyncManager, SyncConfig, SyncStatus, SyncResult, SyncConflict } from '@/lib/data-sync-manager';
import { createCloudAdapter, CloudProviderConfig } from '@/lib/storage/cloud-adapter';
import { StorageManager } from '@/lib/storage/storage-manager';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface SyncSettingsProps {
  storageManager: StorageManager;
  onConfigChange?: (config: SyncConfig) => void;
}

// 移动端检测Hook
const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

export const SyncSettings: React.FC<SyncSettingsProps> = ({
  storageManager,
  onConfigChange
}) => {
  const mobile = useMobile();
  const [syncManager, setSyncManager] = useState<DataSyncManager | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    strategy: 'smart',
    syncInterval: 30,
    syncTypes: {
      handHistory: true,
      playerStats: true,
      trainingScenarios: true,
      userProgress: true
    },
    networkRequirements: {
      wifiOnly: false,
      minBatteryLevel: 20
    },
    conflictResolution: 'newest'
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [cloudConfig, setCloudConfig] = useState<CloudProviderConfig>({
    provider: 'supabase',
    apiKey: '',
    projectId: '',
    timeout: 30000,
    retryAttempts: 3
  });
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [isConflictModalVisible, setIsConflictModalVisible] = useState(false);
  const [networkStatus, setNetworkStatus] = useState({
    online: navigator.onLine,
    wifi: false,
    latency: 0
  });

  // 初始化同步管理器
  useEffect(() => {
    const initializeSync = async () => {
      try {
        const cloudAdapter = createCloudAdapter(cloudConfig);
        const manager = new DataSyncManager(storageManager, cloudAdapter, syncConfig);
        
        await manager.initialize();
        setSyncManager(manager);
        
        // 监听同步状态
        const unsubscribe = manager.on('syncStatus', (status: SyncStatus) => {
          setSyncStatus(status);
        });
        
        // 监听同步完成
        manager.on('syncComplete', (result: SyncResult) => {
          setSyncResult(result);
          setIsSyncing(false);
        });
        
        // 监听冲突
        manager.on('conflict', (conflict: SyncConflict) => {
          setConflicts(prev => [...prev, conflict]);
          setIsConflictModalVisible(true);
        });
        
        // 获取初始状态
        setSyncStatus(manager.getSyncStatus());
        
        return () => {
          unsubscribe();
          manager.destroy();
        };
      } catch (error) {
        console.error('Failed to initialize sync manager:', error);
      }
    };

    initializeSync();
  }, [storageManager, cloudConfig, syncConfig]);

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(prev => ({ ...prev, online: true }));
    };
    
    const handleOffline = () => {
      setNetworkStatus(prev => ({ ...prev, online: false }));
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 手动同步
  const handleManualSync = async () => {
    if (!syncManager || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const result = await syncManager.forceSync();
      setSyncResult(result);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // 更新同步配置
  const handleConfigUpdate = (newConfig: Partial<SyncConfig>) => {
    const updatedConfig = { ...syncConfig, ...newConfig };
    setSyncConfig(updatedConfig);
    
    if (syncManager) {
      syncManager.updateConfig(updatedConfig);
    }
    
    onConfigChange?.(updatedConfig);
  };

  // 更新云端配置
  const handleCloudConfigUpdate = (config: CloudProviderConfig) => {
    setCloudConfig(config);
    setIsConfigModalVisible(false);
  };

  // 解决冲突
  const handleResolveConflict = async (conflictId: string, resolution: 'local' | 'remote' | 'merge') => {
    if (!syncManager) return;
    
    setConflicts(prev => prev.map(c => 
      c.id === conflictId ? { ...c, resolution } : c
    ));
    
    // 实际的冲突解决逻辑需要实现
  };

  // 格式化时间
  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return '从未同步';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return date.toLocaleDateString();
  };

  // 获取同步状态颜色
  const getStatusColor = () => {
    if (!syncStatus) return 'default';
    if (syncStatus.isSyncing) return 'processing';
    if (syncStatus.syncErrors.length > 0) return 'error';
    if (syncStatus.pendingChanges > 0) return 'warning';
    return 'success';
  };

  // 获取同步状态文本
  const getStatusText = () => {
    if (!syncStatus) return '未初始化';
    if (syncStatus.isSyncing) return '同步中...';
    if (syncStatus.syncErrors.length > 0) return '同步错误';
    if (syncStatus.pendingChanges > 0) return '有待同步项';
    return '同步完成';
  };

  return (
    <div className="sync-settings">
      <Row gutter={[mobile ? 12 : 16, mobile ? 12 : 16]}>
        {/* 同步状态卡片 */}
        <Col span={24}>
          <Card 
            title={
              <Space>
                <CloudUploadOutlined />
                <Text style={{ fontSize: mobile ? 16 : 18 }}>数据同步状态</Text>
                <Badge status={getStatusColor()} text={getStatusText()} />
              </Space>
            }
            extra={
              <Space direction={mobile ? 'vertical' : 'horizontal'} size={mobile ? 'small' : 'middle'}>
                <Button 
                  type="primary" 
                  icon={<SyncOutlined />}
                  onClick={handleManualSync}
                  loading={isSyncing}
                  disabled={!networkStatus.online}
                  block={mobile}
                  size={mobile ? 'middle' : 'large'}
                >
                  {isSyncing ? '同步中...' : '立即同步'}
                </Button>
                <Button 
                  icon={<SettingOutlined />}
                  onClick={() => setIsConfigModalVisible(true)}
                  block={mobile}
                  size={mobile ? 'middle' : 'large'}
                >
                  设置
                </Button>
              </Space>
            }
          >
            <Row gutter={[mobile ? 8 : 16, mobile ? 8 : 16]}>
              <Col xs={12} sm={6}>
                <Statistic
                  title="网络状态"
                  value={networkStatus.online ? '在线' : '离线'}
                  valueStyle={{ 
                    color: networkStatus.online ? '#3f8600' : '#cf1322',
                    fontSize: mobile ? 16 : 24 
                  }}
                                  />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="最后同步"
                  value={syncStatus ? formatTime(syncStatus.lastSyncTime) : '从未同步'}
                  valueStyle={{ fontSize: mobile ? 16 : 24 }}
                                  />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="待同步项"
                  value={syncStatus?.pendingChanges || 0}
                  valueStyle={{ 
                    color: syncStatus?.pendingChanges ? '#faad14' : '#3f8600',
                    fontSize: mobile ? 16 : 24 
                  }}
                                  />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="同步错误"
                  value={syncStatus?.syncErrors.length || 0}
                  valueStyle={{ 
                    color: syncStatus?.syncErrors.length ? '#cf1322' : '#3f8600',
                    fontSize: mobile ? 16 : 24 
                  }}
                                  />
              </Col>
            </Row>

            {/* 同步结果 */}
            {syncResult && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  message={`同步完成 ${syncResult.success ? '成功' : '失败'}`}
                  description={
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text>同步项目: {syncResult.syncedItems}</Text>
                      <Text>冲突数量: {syncResult.conflicts}</Text>
                      <Text>错误数量: {syncResult.errors.length}</Text>
                      <Text>传输数据: {(syncResult.bytesTransferred / 1024 / 1024).toFixed(2)} MB</Text>
                      <Text>耗时: {(syncResult.duration / 1000).toFixed(2)} 秒</Text>
                    </Space>
                  }
                  type={syncResult.success ? 'success' : 'error'}
                  showIcon
                  closable
                />
              </div>
            )}

            {/* 网络状态详情 */}
            <div style={{ marginTop: 16 }}>
              <Space>
                <Badge 
                  status={networkStatus.online ? 'success' : 'error'} 
                  text={networkStatus.online ? '网络连接正常' : '网络连接断开'} 
                />
                {networkStatus.wifi && (
                  <Badge status="success" text="WiFi连接" />
                )}
                {networkStatus.latency > 0 && (
                  <Text type="secondary">延迟: {networkStatus.latency}ms</Text>
                )}
              </Space>
            </div>
          </Card>
        </Col>

        {/* 同步配置 */}
        <Col span={24}>
          <Card title="同步配置">
            <Row gutter={[mobile ? 12 : 16, mobile ? 12 : 16]}>
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>同步策略:</Text>
                    <Select
                      value={syncConfig.strategy}
                      onChange={(value) => handleConfigUpdate({ strategy: value })}
                      style={{ width: '100%', marginTop: 8 }}
                      size={mobile ? 'middle' : 'large'}
                    >
                      <Option value="manual">手动同步</Option>
                      <Option value="auto">自动同步</Option>
                      <Option value="smart">智能同步</Option>
                    </Select>
                  </div>

                  <div>
                    <Text strong>同步间隔:</Text>
                    <Select
                      value={syncConfig.syncInterval}
                      onChange={(value) => handleConfigUpdate({ syncInterval: value })}
                      style={{ width: '100%', marginTop: 8 }}
                      size={mobile ? 'middle' : 'large'}
                    >
                      <Option value={5}>5分钟</Option>
                      <Option value={15}>15分钟</Option>
                      <Option value={30}>30分钟</Option>
                      <Option value={60}>1小时</Option>
                    </Select>
                  </div>

                  <div>
                    <Text strong>冲突解决:</Text>
                    <Select
                      value={syncConfig.conflictResolution}
                      onChange={(value) => handleConfigUpdate({ conflictResolution: value })}
                      style={{ width: '100%', marginTop: 8 }}
                      size={mobile ? 'middle' : 'large'}
                    >
                      <Option value="local">使用本地版本</Option>
                      <Option value="remote">使用云端版本</Option>
                      <Option value="newest">使用最新版本</Option>
                      <Option value="manual">手动解决</Option>
                    </Select>
                  </div>
                </Space>
              </Col>

              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>同步数据类型:</Text>
                  <div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Switch
                          checked={syncConfig.syncTypes.handHistory}
                          onChange={(checked) => handleConfigUpdate({
                            syncTypes: { ...syncConfig.syncTypes, handHistory: checked }
                          })}
                          size={mobile ? 'small' : 'default'}
                        />
                        <Text style={{ marginLeft: 8 }}>手牌历史</Text>
                      </div>
                      <div>
                        <Switch
                          checked={syncConfig.syncTypes.playerStats}
                          onChange={(checked) => handleConfigUpdate({
                            syncTypes: { ...syncConfig.syncTypes, playerStats: checked }
                          })}
                          size={mobile ? 'small' : 'default'}
                        />
                        <Text style={{ marginLeft: 8 }}>玩家统计</Text>
                      </div>
                      <div>
                        <Switch
                          checked={syncConfig.syncTypes.trainingScenarios}
                          onChange={(checked) => handleConfigUpdate({
                            syncTypes: { ...syncConfig.syncTypes, trainingScenarios: checked }
                          })}
                          size={mobile ? 'small' : 'default'}
                        />
                        <Text style={{ marginLeft: 8 }}>训练场景</Text>
                      </div>
                      <div>
                        <Switch
                          checked={syncConfig.syncTypes.userProgress}
                          onChange={(checked) => handleConfigUpdate({
                            syncTypes: { ...syncConfig.syncTypes, userProgress: checked }
                          })}
                          size={mobile ? 'small' : 'default'}
                        />
                        <Text style={{ marginLeft: 8 }}>用户进度</Text>
                      </div>
                    </Space>
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 同步历史 */}
        <Col span={24}>
          <Card title="同步历史">
            <Timeline mode={mobile ? 'left' : 'alternate'}>
              {syncStatus?.lastSyncTime && (
                <Timeline.Item color="green">
                  <Text strong style={{ fontSize: mobile ? 14 : 16 }}>最近同步</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: mobile ? 12 : 14 }}>
                    {formatTime(syncStatus.lastSyncTime)}
                  </Text>
                </Timeline.Item>
              )}
              {syncResult && (
                <Timeline.Item color={syncResult.success ? "green" : "red"}>
                  <Text strong style={{ fontSize: mobile ? 14 : 16 }}>同步完成</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: mobile ? 12 : 14 }}>
                    {syncResult.success ? '成功' : '失败'} - {syncResult.syncedItems} 项
                  </Text>
                </Timeline.Item>
              )}
              {(syncStatus?.syncErrors?.length || 0) > 0 && (
                <Timeline.Item color="red">
                  <Text strong style={{ fontSize: mobile ? 14 : 16 }}>同步错误</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: mobile ? 12 : 14 }}>
                    {syncStatus?.syncErrors?.length || 0} 个错误
                  </Text>
                </Timeline.Item>
              )}
            </Timeline>
          </Card>
        </Col>
      </Row>

      {/* 云端配置模态框 */}
      <Modal
        title="云端服务配置"
        open={isConfigModalVisible}
        onCancel={() => setIsConfigModalVisible(false)}
        footer={null}
        width={mobile ? '95%' : 600}
        style={{ top: mobile ? 20 : 100 }}
      >
        <Form
          layout="vertical"
          initialValues={cloudConfig}
          onFinish={handleCloudConfigUpdate}
        >
          <Form.Item
            label="服务提供商"
            name="provider"
            rules={[{ required: true, message: '请选择服务提供商' }]}
          >
            <Select>
              <Option value="supabase">Supabase</Option>
              <Option value="firebase">Firebase</Option>
              <Option value="custom">自定义服务</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="API密钥"
            name="apiKey"
            rules={[{ required: true, message: '请输入API密钥' }]}
          >
            <Input.Password placeholder="请输入API密钥" />
          </Form.Item>

          <Form.Item
            label="项目ID"
            name="projectId"
            rules={[{ required: true, message: '请输入项目ID' }]}
          >
            <Input placeholder="请输入项目ID" />
          </Form.Item>

          {cloudConfig.provider === 'custom' && (
            <Form.Item
              label="服务地址"
              name="baseUrl"
            >
              <Input placeholder="https://your-api.example.com" />
            </Form.Item>
          )}

          <Form.Item
            label="超时时间（秒）"
            name="timeout"
          >
            <Input type="number" placeholder="30" />
          </Form.Item>

          <Form.Item
            label="重试次数"
            name="retryAttempts"
          >
            <Input type="number" placeholder="3" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存配置
              </Button>
              <Button onClick={() => setIsConfigModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 冲突解决模态框 */}
      <Modal
        title="数据冲突解决"
        open={isConflictModalVisible}
        onCancel={() => setIsConflictModalVisible(false)}
        footer={null}
        width={mobile ? '95%' : 800}
        style={{ top: mobile ? 20 : 100 }}
      >
        <List
          dataSource={conflicts}
          renderItem={(conflict) => (
            <List.Item>
              <Card 
                style={{ width: '100%' }}
                bodyStyle={{ padding: mobile ? 12 : 24 }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={mobile ? 'small' : 'middle'}>
                  {/* 冲突信息 */}
                  <div>
                    <Text strong style={{ fontSize: mobile ? 14 : 16 }}>
                      {conflict.entityType} - {conflict.entityId}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: mobile ? 12 : 14 }}>
                      冲突类型: {conflict.conflictType}
                    </Text>
                  </div>
                  
                  {/* 版本对比 */}
                  {mobile ? (
                    // 移动端垂直布局
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ fontSize: 14 }}>本地版本</Text>
                        <TextArea
                          rows={3}
                          value={JSON.stringify(conflict.localVersion, null, 2)}
                          readOnly
                          style={{ 
                            fontSize: 12,
                            marginTop: 4,
                            backgroundColor: '#f5f5f5'
                          }}
                        />
                      </div>
                      
                      <div style={{ 
                        textAlign: 'center', 
                        margin: '12px 0',
                        padding: '8px',
                        backgroundColor: '#fafafa',
                        borderRadius: 4
                      }}>
                        <Text strong style={{ fontSize: 14, color: '#1890ff' }}>VS</Text>
                      </div>
                      
                      <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ fontSize: 14 }}>云端版本</Text>
                        <TextArea
                          rows={3}
                          value={JSON.stringify(conflict.remoteVersion, null, 2)}
                          readOnly
                          style={{ 
                            fontSize: 12,
                            marginTop: 4,
                            backgroundColor: '#f5f5f5'
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    // 桌面端水平布局
                    <Row gutter={[16, 16]}>
                      <Col span={11}>
                        <div>
                          <Text strong>本地版本</Text>
                          <TextArea
                            rows={4}
                            value={JSON.stringify(conflict.localVersion, null, 2)}
                            readOnly
                          />
                        </div>
                      </Col>
                      <Col span={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text strong>VS</Text>
                      </Col>
                      <Col span={11}>
                        <div>
                          <Text strong>云端版本</Text>
                          <TextArea
                            rows={4}
                            value={JSON.stringify(conflict.remoteVersion, null, 2)}
                            readOnly
                          />
                        </div>
                      </Col>
                    </Row>
                  )}

                  {/* 解决方案按钮 */}
                  <div>
                    <Text strong style={{ fontSize: mobile ? 14 : 16, marginBottom: 8, display: 'block' }}>
                      选择解决方案:
                    </Text>
                    {mobile ? (
                      // 移动端垂直按钮布局
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <Button
                          type="primary"
                          onClick={() => handleResolveConflict(conflict.id, 'local')}
                          block
                          size="middle"
                          icon={<CheckCircleOutlined />}
                        >
                          使用本地版本
                        </Button>
                        <Button
                          onClick={() => handleResolveConflict(conflict.id, 'remote')}
                          block
                          size="middle"
                          icon={<CloudDownloadOutlined />}
                        >
                          使用云端版本
                        </Button>
                        <Button
                          onClick={() => handleResolveConflict(conflict.id, 'merge')}
                          block
                          size="middle"
                          icon={<SyncOutlined />}
                        >
                          合并版本
                        </Button>
                      </Space>
                    ) : (
                      // 桌面端水平按钮布局
                      <Space>
                        <Button
                          type="primary"
                          onClick={() => handleResolveConflict(conflict.id, 'local')}
                        >
                          使用本地版本
                        </Button>
                        <Button
                          onClick={() => handleResolveConflict(conflict.id, 'remote')}
                        >
                          使用云端版本
                        </Button>
                        <Button
                          onClick={() => handleResolveConflict(conflict.id, 'merge')}
                        >
                          合并版本
                        </Button>
                      </Space>
                    )}
                  </div>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default SyncSettings;