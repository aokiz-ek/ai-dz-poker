/**
 * 云端服务配置
 * 
 * 包含 Firebase 和 Supabase 的配置信息
 */

import { CloudProviderConfig } from '../lib/storage/cloud-adapter';

// Supabase 配置
export const SUPABASE_CONFIG: CloudProviderConfig = {
  provider: 'supabase',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wYmNidW5xdXR0YnN5cWlta3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NzIwNzgsImV4cCI6MjA3MTI0ODA3OH0.npjQ3FJoAEP4estPzAINZYeaQrU9ZyjsWP5CJTK3q-w',
  projectId: 'opbcbunquttbsyqimkvh',
  baseUrl: 'https://opbcbunquttbsyqimkvh.supabase.co',
  timeout: 30000,
  retryAttempts: 3
};

// Firebase 配置（演示用）
export const FIREBASE_CONFIG: CloudProviderConfig = {
  provider: 'firebase',
  apiKey: 'your-firebase-api-key',
  projectId: 'ai-poker-gto',
  timeout: 30000,
  retryAttempts: 3
};

// 默认使用的云端服务
export const DEFAULT_CLOUD_CONFIG = SUPABASE_CONFIG;

// 云端功能开关
export const CLOUD_FEATURES = {
  // 基础功能
  authentication: true,
  dataSync: true,
  cloudStorage: true,
  
  // 高级功能
  realtimeSync: true,
  multiDeviceSync: true,
  analytics: true,
  
  // 实验性功能
  aiAnalysis: false,
  predictiveSync: false,
  advancedConflictResolution: true
};

// 环境配置
export const ENV_CONFIG = {
  development: {
    enableLogging: true,
    enableDebugMode: true,
    enableMockData: true,
    syncInterval: 10, // 10秒同步一次（开发环境）
  },
  production: {
    enableLogging: false,
    enableDebugMode: false,
    enableMockData: false,
    syncInterval: 300, // 5分钟同步一次（生产环境）
  }
};

// 获取当前环境配置
export function getCurrentEnvConfig() {
  const env = process.env.NODE_ENV || 'development';
  return ENV_CONFIG[env as keyof typeof ENV_CONFIG] || ENV_CONFIG.development;
}

// 数据分析配置
export const ANALYTICS_CONFIG = {
  // 数据收集配置
  enableUserBehaviorTracking: true,
  enablePerformanceTracking: true,
  enableErrorTracking: true,
  
  // 数据保留配置
  dataRetentionDays: 90,
  aggregationLevels: ['daily', 'weekly', 'monthly'],
  
  // 隐私配置
  anonymizeUserData: true,
  enableDataExport: true,
  enableDataDeletion: true
};

export default {
  SUPABASE_CONFIG,
  FIREBASE_CONFIG,
  DEFAULT_CLOUD_CONFIG,
  CLOUD_FEATURES,
  ENV_CONFIG,
  getCurrentEnvConfig,
  ANALYTICS_CONFIG
};