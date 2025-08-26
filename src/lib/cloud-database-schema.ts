/**
 * 云端数据库架构设计
 * 
 * 支持 Firebase Firestore 和 Supabase PostgreSQL
 * 定义统一的数据结构和索引策略
 */

// =================== 通用数据类型定义 ===================

export interface CloudDocument {
  id: string;
  created_at: string;
  updated_at: string;
  device_id?: string;
  user_id?: string;
}

// =================== 数据表结构定义 ===================

/**
 * 主数据表 - 存储所有应用数据
 */
export interface DataTable extends CloudDocument {
  key: string;           // 数据键，用于KV存储
  data: any;            // 实际数据内容（JSON）
  data_type: string;    // 数据类型标识
  size_bytes: number;   // 数据大小（字节）
  compressed: boolean;  // 是否压缩
  checksum: string;     // 数据校验和
}

/**
 * 变更历史表 - 记录所有数据变更
 */
export interface ChangesTable extends CloudDocument {
  entity_type: string;  // 实体类型（handHistory, playerStats等）
  entity_id: string;    // 实体ID
  change_type: 'create' | 'update' | 'delete'; // 变更类型
  data: any;           // 变更后的数据
  data_diff?: any;     // 数据差异（增量）
  timestamp: number;   // 变更时间戳
  sync_status: 'pending' | 'synced' | 'failed'; // 同步状态
}

/**
 * 用户配置表 - 存储用户个人设置
 */
export interface UserConfigTable extends CloudDocument {
  config_key: string;   // 配置键
  config_value: any;    // 配置值
  config_type: string;  // 配置类型
  is_encrypted: boolean; // 是否加密存储
}

/**
 * 手牌历史表 - 专门存储手牌历史数据
 */
export interface HandHistoryTable extends CloudDocument {
  hand_id: string;      // 手牌ID
  session_id: string;   // 会话ID
  game_type: string;    // 游戏类型
  stakes: string;       // 盲注级别
  players: number;      // 玩家人数
  position: string;     // 位置
  hole_cards: string[];  // 底牌
  board_cards: string[]; // 公共牌
  actions: any[];       // 行动序列
  pot_size: number;     // 底池大小
  win_amount: number;   // 赢取金额
  bb_won: number;       // 大盲倍数收益
  duration_ms: number;  // 手牌时长
  gto_analysis: any;    // GTO分析结果
  played_at: string;    // 游戏时间
}

/**
 * 玩家统计表 - 存储玩家统计数据
 */
export interface PlayerStatsTable extends CloudDocument {
  player_id: string;    // 玩家ID
  stats_type: 'overall' | 'position' | 'session'; // 统计类型
  period_start: string; // 统计周期开始
  period_end: string;   // 统计周期结束
  hands_played: number; // 总手牌数
  vpip: number;         // 入池率
  pfr: number;          // 翻前加注率
  af: number;           // 侵略因子
  wtsd: number;         // 摊牌率
  w_sd: number;         // 摊牌胜率
  bb_per_100: number;   // 100手大盲收益
  total_winnings: number; // 总收益
  stats_data: any;      // 详细统计数据
}

/**
 * 训练场景表 - 存储训练场景配置
 */
export interface TrainingScenariosTable extends CloudDocument {
  scenario_id: string;  // 场景ID
  scenario_name: string; // 场景名称
  scenario_type: string; // 场景类型
  difficulty: number;   // 难度等级
  description: string;  // 场景描述
  config: any;         // 场景配置
  tags: string[];      // 标签
  is_public: boolean;  // 是否公开
  usage_count: number; // 使用次数
  rating: number;      // 评分
}

/**
 * 用户进度表 - 存储用户学习进度
 */
export interface UserProgressTable extends CloudDocument {
  experience: number;   // 经验值
  level: number;        // 等级
  completed_scenarios: string[]; // 完成的场景
  achievements: string[]; // 解锁的成就
  skill_levels: any;    // 技能水平
  last_training_date: string; // 最后训练时间
  training_streak: number; // 连续训练天数
  preferences: any;     // 用户偏好设置
}

/**
 * 成就系统表 - 存储成就定义和进度
 */
export interface AchievementsTable extends CloudDocument {
  achievement_id: string; // 成就ID
  name: string;          // 成就名称
  description: string;   // 描述
  icon: string;          // 图标
  rarity: 'common' | 'rare' | 'epic' | 'legendary'; // 稀有度
  category: string;      // 类别
  requirements: any;     // 解锁要求
  rewards: any;          // 奖励
  is_unlocked: boolean;  // 是否解锁
  unlocked_at?: string;  // 解锁时间
  progress: number;      // 进度百分比
}

/**
 * 同步元数据表 - 存储同步相关元数据
 */
export interface SyncMetadataTable extends CloudDocument {
  metadata_key: string;  // 元数据键
  metadata_value: any;   // 元数据值
  last_sync: string;     // 最后同步时间
  sync_version: string;  // 同步版本
  device_ids: string[];  // 设备ID列表
}

/**
 * 设备管理表 - 管理多设备同步
 */
export interface DevicesTable extends CloudDocument {
  device_name: string;   // 设备名称
  device_type: string;   // 设备类型
  os_info: string;       // 操作系统信息
  browser_info: string;  // 浏览器信息
  is_active: boolean;    // 是否活跃
  last_seen: string;     // 最后在线时间
  sync_enabled: boolean; // 是否启用同步
  data_usage: number;    // 数据使用量
}

// =================== Supabase SQL 架构定义 ===================

export const SUPABASE_SCHEMA = {
  // 主数据表
  data: `
    CREATE TABLE IF NOT EXISTS data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      data JSONB NOT NULL,
      data_type TEXT NOT NULL,
      size_bytes INTEGER DEFAULT 0,
      compressed BOOLEAN DEFAULT FALSE,
      checksum TEXT,
      device_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, key)
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_data_user_key ON data(user_id, key);
    CREATE INDEX IF NOT EXISTS idx_data_type ON data(data_type);
    CREATE INDEX IF NOT EXISTS idx_data_updated_at ON data(updated_at);
  `,

  // 变更历史表
  changes: `
    CREATE TABLE IF NOT EXISTS changes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
      data JSONB,
      data_diff JSONB,
      timestamp BIGINT NOT NULL,
      sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
      device_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_changes_user_entity ON changes(user_id, entity_type);
    CREATE INDEX IF NOT EXISTS idx_changes_timestamp ON changes(timestamp);
    CREATE INDEX IF NOT EXISTS idx_changes_sync_status ON changes(sync_status);
  `,

  // 手牌历史表
  hand_history: `
    CREATE TABLE IF NOT EXISTS hand_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      hand_id TEXT NOT NULL,
      session_id TEXT,
      game_type TEXT NOT NULL,
      stakes TEXT,
      players INTEGER,
      position TEXT,
      hole_cards JSONB,
      board_cards JSONB,
      actions JSONB,
      pot_size DECIMAL(10,2),
      win_amount DECIMAL(10,2),
      bb_won DECIMAL(8,2),
      duration_ms INTEGER,
      gto_analysis JSONB,
      played_at TIMESTAMPTZ,
      device_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, hand_id)
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_hand_history_user_played ON hand_history(user_id, played_at);
    CREATE INDEX IF NOT EXISTS idx_hand_history_session ON hand_history(session_id);
    CREATE INDEX IF NOT EXISTS idx_hand_history_game_type ON hand_history(game_type);
  `,

  // 玩家统计表
  player_stats: `
    CREATE TABLE IF NOT EXISTS player_stats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      player_id TEXT NOT NULL,
      stats_type TEXT DEFAULT 'overall' CHECK (stats_type IN ('overall', 'position', 'session')),
      period_start TIMESTAMPTZ,
      period_end TIMESTAMPTZ,
      hands_played INTEGER DEFAULT 0,
      vpip DECIMAL(5,2) DEFAULT 0,
      pfr DECIMAL(5,2) DEFAULT 0,
      af DECIMAL(5,2) DEFAULT 0,
      wtsd DECIMAL(5,2) DEFAULT 0,
      w_sd DECIMAL(5,2) DEFAULT 0,
      bb_per_100 DECIMAL(8,2) DEFAULT 0,
      total_winnings DECIMAL(10,2) DEFAULT 0,
      stats_data JSONB,
      device_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, player_id, stats_type)
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_player_stats_user_player ON player_stats(user_id, player_id);
    CREATE INDEX IF NOT EXISTS idx_player_stats_type ON player_stats(stats_type);
    CREATE INDEX IF NOT EXISTS idx_player_stats_period ON player_stats(period_start, period_end);
  `,

  // 元数据表
  metadata: `
    CREATE TABLE IF NOT EXISTS metadata (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value JSONB NOT NULL,
      last_sync TIMESTAMPTZ DEFAULT NOW(),
      sync_version TEXT DEFAULT '1.0.0',
      device_ids JSONB DEFAULT '[]',
      device_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, key)
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_metadata_user_key ON metadata(user_id, key);
    CREATE INDEX IF NOT EXISTS idx_metadata_sync ON metadata(last_sync);
    CREATE INDEX IF NOT EXISTS idx_metadata_version ON metadata(sync_version);
  `,

  // RLS (行级安全) 策略
  rls_policies: `
    -- 启用 RLS
    ALTER TABLE data ENABLE ROW LEVEL SECURITY;
    ALTER TABLE changes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE hand_history ENABLE ROW LEVEL SECURITY;
    ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
    ALTER TABLE metadata ENABLE ROW LEVEL SECURITY;

    -- 数据表访问策略
    CREATE POLICY "Users can access their own data" ON data
      FOR ALL USING (auth.uid() = user_id);

    -- 变更历史访问策略
    CREATE POLICY "Users can access their own changes" ON changes
      FOR ALL USING (auth.uid() = user_id);

    -- 手牌历史访问策略
    CREATE POLICY "Users can access their own hand history" ON hand_history
      FOR ALL USING (auth.uid() = user_id);

    -- 玩家统计访问策略
    CREATE POLICY "Users can access their own player stats" ON player_stats
      FOR ALL USING (auth.uid() = user_id);

    -- 元数据访问策略
    CREATE POLICY "Users can access their own metadata" ON metadata
      FOR ALL USING (auth.uid() = user_id);
  `,

  // 存储过程
  functions: `
    -- 获取存储使用统计
    CREATE OR REPLACE FUNCTION get_storage_usage()
    RETURNS TABLE (
      used_bytes BIGINT,
      total_records INTEGER,
      compressed_records INTEGER,
      compression_ratio DECIMAL(5,2)
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        SUM(size_bytes)::BIGINT as used_bytes,
        COUNT(*)::INTEGER as total_records,
        SUM(CASE WHEN compressed THEN 1 ELSE 0 END)::INTEGER as compressed_records,
        (SUM(CASE WHEN compressed THEN size_bytes ELSE 0 END) * 100.0 / NULLIF(SUM(size_bytes), 0))::DECIMAL(5,2) as compression_ratio
      FROM data
      WHERE user_id = auth.uid();
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 清理旧数据
    CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INTEGER DEFAULT 90)
    RETURNS INTEGER AS $$
    DECLARE
      deleted_count INTEGER;
    BEGIN
      DELETE FROM changes 
      WHERE user_id = auth.uid() 
        AND created_at < NOW() - INTERVAL '1 day' * days_to_keep;
      
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 计算数据校验和
    CREATE OR REPLACE FUNCTION calculate_checksum(data_content JSONB)
    RETURNS TEXT AS $$
    BEGIN
      RETURN md5(data_content::TEXT);
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `
};

// =================== Firebase Firestore 规则 ===================

export const FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用户只能访问自己的数据
    match /data/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.user_id;
    }
    
    // 变更历史访问控制
    match /changes/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.user_id;
    }
    
    // 手牌历史访问控制
    match /hand_history/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.user_id;
    }
    
    // 公共训练场景（只读）
    match /training_scenarios/{document} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == resource.data.user_id;
    }
    
    // 元数据访问控制
    match /metadata/{document} {
      allow read, write: if request.auth != null;
    }
  }
}`;

// =================== 索引配置 ===================

export const FIRESTORE_INDEXES = [
  {
    collectionGroup: 'data',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'user_id', order: 'ASCENDING' },
      { fieldPath: 'data_type', order: 'ASCENDING' },
      { fieldPath: 'updated_at', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'changes',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'user_id', order: 'ASCENDING' },
      { fieldPath: 'entity_type', order: 'ASCENDING' },
      { fieldPath: 'timestamp', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'hand_history',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'user_id', order: 'ASCENDING' },
      { fieldPath: 'played_at', order: 'DESCENDING' }
    ]
  }
];

// =================== 数据迁移工具 ===================

export class CloudDatabaseMigration {
  /**
   * 初始化 Supabase 数据库架构
   */
  static async initializeSupabaseSchema(supabaseClient: any): Promise<void> {
    const schemas = Object.values(SUPABASE_SCHEMA);
    
    for (const schema of schemas) {
      try {
        await supabaseClient.rpc('exec_sql', { sql: schema });
        console.log('Schema executed successfully');
      } catch (error) {
        console.error('Schema execution failed:', error);
        // 继续执行其他schema
      }
    }
  }

  /**
   * 验证数据完整性
   */
  static async validateDataIntegrity(client: any, provider: 'firebase' | 'supabase'): Promise<boolean> {
    try {
      switch (provider) {
        case 'firebase':
          // Firebase 数据完整性检查
          const firestoreSnapshot = await client.collection('data').limit(1).get();
          return !firestoreSnapshot.empty;
          
        case 'supabase':
          // Supabase 数据完整性检查
          const { data, error } = await client.from('data').select('id').limit(1);
          return !error && Array.isArray(data);
          
        default:
          return false;
      }
    } catch (error) {
      console.error('Data integrity validation failed:', error);
      return false;
    }
  }

  /**
   * 数据备份
   */
  static async backupData(client: any, provider: 'firebase' | 'supabase'): Promise<any> {
    const backup: any = {
      timestamp: Date.now(),
      provider,
      data: {}
    };

    try {
      switch (provider) {
        case 'firebase':
          const collections = ['data', 'changes', 'hand_history'];
          for (const collection of collections) {
            const snapshot = await client.collection(collection).get();
            backup.data[collection] = snapshot.docs.map((doc: any) => ({
              id: doc.id,
              ...doc.data()
            }));
          }
          break;

        case 'supabase':
          const tables = ['data', 'changes', 'hand_history'];
          for (const table of tables) {
            const { data } = await client.from(table).select('*');
            backup.data[table] = data || [];
          }
          break;
      }

      return backup;
    } catch (error) {
      console.error('Data backup failed:', error);
      throw error;
    }
  }

  /**
   * 数据恢复
   */
  static async restoreData(client: any, provider: 'firebase' | 'supabase', backup: any): Promise<void> {
    try {
      switch (provider) {
        case 'firebase':
          for (const [collection, docs] of Object.entries(backup.data)) {
            const batch = client.batch();
            (docs as any[]).forEach(doc => {
              const { id, ...data } = doc;
              const ref = client.collection(collection).doc(id);
              batch.set(ref, data);
            });
            await batch.commit();
          }
          break;

        case 'supabase':
          for (const [table, rows] of Object.entries(backup.data)) {
            if (Array.isArray(rows) && rows.length > 0) {
              const { error } = await client.from(table).upsert(rows);
              if (error) throw error;
            }
          }
          break;
      }

      console.log('Data restoration completed successfully');
    } catch (error) {
      console.error('Data restoration failed:', error);
      throw error;
    }
  }
}

export default {
  SUPABASE_SCHEMA,
  FIRESTORE_RULES,
  FIRESTORE_INDEXES,
  CloudDatabaseMigration
};