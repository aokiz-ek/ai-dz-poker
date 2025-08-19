/**
 * 数据同步页面
 * 
 * 提供完整的数据同步功能界面
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Tabs, Alert, Statistic, Progress, Space, Typography, Badge, Divider } from 'antd';
import { CloudUploadOutlined, CloudDownloadOutlined, SyncOutlined, SettingOutlined, WarningOutlined, CheckCircleOutlined, InfoCircleOutlined, ReloadOutlined, DatabaseOutlined, MobileOutlined, GlobalOutlined, SafetyOutlined } from '@ant-design/icons';
import SyncSettings from '@/components/sync/SyncSettings';
import { StorageManager } from '@/lib/storage/storage-manager';
import { DataSyncManager } from '@/lib/data-sync-manager';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface SyncPageProps {
  storageManager: StorageManager;
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

export const SyncPage: React.FC<SyncPageProps> = ({
  storageManager
}) => {
  const mobile = useMobile();
  const [syncManager, setSyncManager] = useState<DataSyncManager | null>(null);
  const [storageStats, setStorageStats] = useState({
    local: { used: 0, total: 0, percentage: 0 },
    cloud: { used: 0, total: 0, percentage: 0 }
  });
  const [syncStats, setSyncStats] = useState({
    lastSync: null as Date | null,
    syncedItems: 0,
    pendingChanges: 0,
    conflicts: 0,
    errors: 0
  });
  const [networkStatus, setNetworkStatus] = useState({
    online: navigator.onLine,
    type: 'unknown',
    downlink: 0,
    rtt: 0
  });

  useEffect(() => {
    // 监听网络状态
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection;
      setNetworkStatus({
        online: navigator.onLine,
        type: connection?.effectiveType || 'unknown',
        downlink: connection?.downlink || 0,
        rtt: connection?.rtt || 0
      });
    };

    updateNetworkStatus();
    
    const handleOnline = () => {
      setNetworkStatus(prev => ({ ...prev, online: true }));
      updateNetworkStatus();
    };
    
    const handleOffline = () => {
      setNetworkStatus(prev => ({ ...prev, online: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus);
    }

    // 获取存储统计
    const fetchStorageStats = async () => {
      try {
        const localUsage = await storageManager.getStorageUsage();
        setStorageStats(prev => ({
          ...prev,
          local: {
            used: localUsage.used,
            total: localUsage.total,
            percentage: (localUsage.used / localUsage.total) * 100
          }
        }));
      } catch (error) {
        console.error('Failed to fetch storage stats:', error);
      }
    };

    fetchStorageStats();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [storageManager]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getNetworkQuality = () => {
    if (!networkStatus.online) return { color: 'error', text: '离线' };
    
    switch (networkStatus.type) {
      case '4g':
        return { color: 'success', text: '4G' };
      case '3g':
        return { color: 'warning', text: '3G' };
      case '2g':
        return { color: 'error', text: '2G' };
      case 'wifi':
        return { color: 'success', text: 'WiFi' };
      default:
        return { color: 'default', text: '未知' };
    }
  };

  const networkQuality = getNetworkQuality();

  return (
    <div className="sync-page" style={{ padding: mobile ? '16px' : '24px' }}>
      <Row gutter={[mobile ? 16 : 24, mobile ? 16 : 24]}>
        <Col span={24}>
          <div style={{ marginBottom: mobile ? 16 : 24 }}>
            <Title level={mobile ? 3 : 2}>
              <CloudUploadOutlined style={{ marginRight: 8 }} />
              数据同步中心
            </Title>
            <Paragraph type="secondary" style={{ fontSize: mobile ? 14 : 16 }}>
              管理本地与云端数据的同步，确保您的训练数据在多设备间保持一致
            </Paragraph>
          </div>
        </Col>

        {/* 状态概览 */}
        <Col span={24}>
          <Card>
            <Row gutter={[mobile ? 12 : 16, mobile ? 12 : 16]}>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="网络状态"
                  value={networkStatus.online ? '在线' : '离线'}
                  valueStyle={{ color: networkStatus.online ? '#3f8600' : '#cf1322' }}
                  prefix={<GlobalOutlined />}
                />
                <div style={{ marginTop: 8 }}>
                  <Badge status={networkQuality.color as any} text={networkQuality.text} />
                  {networkStatus.downlink > 0 && (
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: mobile ? 12 : 14 }}>
                      {networkStatus.downlink} Mbps
                    </Text>
                  )}
                </div>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="本地存储"
                  value={formatBytes(storageStats.local.used)}
                  suffix={`/ ${formatBytes(storageStats.local.total)}`}
                  prefix={<DatabaseOutlined />}
                />
                <Progress 
                  percent={storageStats.local.percentage} 
                  size="small" 
                  style={{ marginTop: 8 }}
                  status={storageStats.local.percentage > 80 ? 'exception' : 'normal'}
                />
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="云端存储"
                  value={formatBytes(storageStats.cloud.used)}
                  suffix={`/ ${formatBytes(storageStats.cloud.total)}`}
                  prefix={<CloudUploadOutlined />}
                />
                <Progress 
                  percent={storageStats.cloud.percentage} 
                  size="small" 
                  style={{ marginTop: 8 }}
                />
              </Col>

              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="同步状态"
                  value={syncStats.pendingChanges}
                  suffix="待同步"
                  prefix={<SyncOutlined />}
                  valueStyle={{ color: syncStats.pendingChanges > 0 ? '#faad14' : '#3f8600' }}
                />
                <div style={{ marginTop: 8 }}>
                  {syncStats.lastSync && (
                    <Text type="secondary" style={{ fontSize: mobile ? 12 : 14 }}>
                      {mobile ? '上次: ' : '上次同步: '}{syncStats.lastSync.toLocaleDateString()}
                    </Text>
                  )}
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 功能标签页 */}
        <Col span={24}>
          <Card>
            <Tabs defaultActiveKey="settings" centered={mobile}>
              <TabPane
                tab={
                  <span>
                    <SettingOutlined />
                    {mobile ? '设置' : '同步设置'}
                  </span>
                }
                key="settings"
              >
                <SyncSettings storageManager={storageManager} />
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <DatabaseOutlined />
                    {mobile ? '存储' : '存储管理'}
                  </span>
                }
                key="storage"
              >
                <Row gutter={[mobile ? 12 : 16, mobile ? 12 : 16]}>
                  <Col xs={24} md={12}>
                    <Card title="本地存储" size="small">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Text strong>已使用空间</Text>
                          <Progress 
                            percent={storageStats.local.percentage} 
                            format={() => `${formatBytes(storageStats.local.used)}`}
                          />
                        </div>
                        <div>
                          <Text strong>存储分布</Text>
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>手牌历史</Text>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>45%</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>训练场景</Text>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>30%</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>统计数据</Text>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>15%</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>用户数据</Text>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>10%</Text>
                            </div>
                          </div>
                        </div>
                        <Button type="primary" icon={<ReloadOutlined />} block={mobile}>
                          清理缓存
                        </Button>
                      </Space>
                    </Card>
                  </Col>

                  <Col xs={24} md={12}>
                    <Card title="云端存储" size="small">
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Text strong>云端容量</Text>
                          <Progress 
                            percent={storageStats.cloud.percentage} 
                            format={() => `${formatBytes(storageStats.cloud.used)}`}
                          />
                        </div>
                        <div>
                          <Text strong>同步统计</Text>
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>已同步项目</Text>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>{syncStats.syncedItems}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>待同步项目</Text>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>{syncStats.pendingChanges}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>同步冲突</Text>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>{syncStats.conflicts}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>同步错误</Text>
                              <Text style={{ fontSize: mobile ? 12 : 14 }}>{syncStats.errors}</Text>
                            </div>
                          </div>
                        </div>
                        <Button type="primary" icon={<CloudDownloadOutlined />} block={mobile}>
                          备份数据
                        </Button>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <MobileOutlined />
                    {mobile ? '设备' : '设备管理'}
                  </span>
                }
                key="devices"
              >
                <Card title="已连接设备">
                  <Row gutter={[mobile ? 12 : 16, mobile ? 12 : 16]}>
                    <Col xs={24} sm={8}>
                      <Card size="small" bordered={false}>
                        <div style={{ textAlign: 'center' }}>
                          <MobileOutlined style={{ fontSize: mobile ? 36 : 48, color: '#1890ff' }} />
                          <div style={{ marginTop: 8 }}>
                            <Text strong style={{ fontSize: mobile ? 14 : 16 }}>当前设备</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: mobile ? 12 : 14 }}>Chrome / Windows</Text>
                          </div>
                          <Badge status="success" text="在线" style={{ marginTop: 8 }} />
                        </div>
                      </Card>
                    </Col>
                    
                    <Col xs={24} sm={8}>
                      <Card size="small" bordered={false}>
                        <div style={{ textAlign: 'center' }}>
                          <MobileOutlined style={{ fontSize: mobile ? 36 : 48, color: '#52c41a' }} />
                          <div style={{ marginTop: 8 }}>
                            <Text strong style={{ fontSize: mobile ? 14 : 16 }}>iPhone 13</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: mobile ? 12 : 14 }}>Safari / iOS</Text>
                          </div>
                          <Badge status="default" text="离线" style={{ marginTop: 8 }} />
                        </div>
                      </Card>
                    </Col>
                    
                    <Col xs={24} sm={8}>
                      <Card size="small" bordered={false}>
                        <div style={{ textAlign: 'center' }}>
                          <MobileOutlined style={{ fontSize: mobile ? 36 : 48, color: '#722ed1' }} />
                          <div style={{ marginTop: 8 }}>
                            <Text strong style={{ fontSize: mobile ? 14 : 16 }}>iPad Pro</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: mobile ? 12 : 14 }}>Safari / iPadOS</Text>
                          </div>
                          <Badge status="processing" text="同步中" style={{ marginTop: 8 }} />
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </TabPane>

              <TabPane
                tab={
                  <span>
                    <SafetyOutlined />
                    {mobile ? '安全' : '安全设置'}
                  </span>
                }
                key="security"
              >
                <Card title="数据安全">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Alert
                      message="数据加密"
                      description={mobile ? "所有同步数据均采用AES-256加密传输" : "所有同步数据均采用AES-256加密传输，确保您的隐私安全"}
                      type="info"
                      showIcon
                    />
                    
                    <Alert
                      message="访问控制"
                      description={mobile ? "只有经过身份验证的设备才能访问" : "只有经过身份验证的设备才能访问您的云端数据"}
                      type="success"
                      showIcon
                    />
                    
                    <Alert
                      message="数据备份"
                      description={mobile ? "云端数据会自动进行多重备份" : "云端数据会自动进行多重备份，防止数据丢失"}
                      type="warning"
                      showIcon
                    />
                    
                    <Divider />
                    
                    <div>
                      <Text strong>数据保留策略</Text>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: mobile ? 12 : 14 }}>手牌历史</Text>
                          <Text style={{ fontSize: mobile ? 12 : 14 }}>保留1年</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: mobile ? 12 : 14 }}>训练记录</Text>
                          <Text style={{ fontSize: mobile ? 12 : 14 }}>永久保留</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: mobile ? 12 : 14 }}>统计数据</Text>
                          <Text style={{ fontSize: mobile ? 12 : 14 }}>保留2年</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: mobile ? 12 : 14 }}>临时文件</Text>
                          <Text style={{ fontSize: mobile ? 12 : 14 }}>30天自动清理</Text>
                        </div>
                      </div>
                    </div>
                  </Space>
                </Card>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SyncPage;