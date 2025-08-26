/**
 * 简化的数据库初始化工具
 * 
 * 使用 Supabase JavaScript 客户端直接创建表和数据
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../config/cloud-config';

export interface InitializationResult {
  success: boolean;
  message: string;
  details?: string[];
}

/**
 * 简化的数据库初始化类
 */
export class SimpleDatabaseInit {
  private supabase: SupabaseClient;
  private results: string[] = [];

  constructor(config = SUPABASE_CONFIG) {
    this.supabase = createClient(
      config.baseUrl || '',
      config.apiKey || ''
    );
  }

  private log(message: string, isError: boolean = false): void {
    const prefix = isError ? '❌' : '✅';
    const logMessage = `${prefix} ${message}`;
    console.log(logMessage);
    this.results.push(logMessage);
  }

  /**
   * 检查表是否存在
   */
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      // 如果没有错误，或者错误不是表不存在的错误，说明表存在
      return !error || error.code !== 'PGRST116';
    } catch {
      return false;
    }
  }

  /**
   * 创建示例数据来确保表结构正确
   */
  private async createSampleData(): Promise<void> {
    try {
      // 为每个表创建一条示例数据，确保表结构正确
      const sampleData = {
        data: {
          key: 'init_test',
          data: { test: true, timestamp: Date.now() },
          data_type: 'initialization',
          size_bytes: 100,
          compressed: false,
          checksum: 'test_checksum',
          device_id: 'init_device'
        },
        changes: {
          entity_type: 'initialization',
          entity_id: 'init_test',
          change_type: 'create',
          data: { test: true },
          timestamp: Date.now(),
          sync_status: 'synced',
          device_id: 'init_device'
        },
        hand_history: {
          hand_id: 'init_hand_001',
          session_id: 'init_session',
          game_type: 'NLHE',
          stakes: '0.01/0.02',
          players: 6,
          position: 'BTN',
          hole_cards: ['As', 'Ks'],
          board_cards: ['Qh', 'Jd', 'Ts'],
          actions: [],
          pot_size: 1.50,
          win_amount: 3.00,
          bb_won: 75.0,
          duration_ms: 45000,
          gto_analysis: {},
          played_at: new Date().toISOString(),
          device_id: 'init_device'
        },
        player_stats: {
          player_id: 'init_player',
          stats_type: 'overall',
          hands_played: 1,
          vpip: 25.0,
          pfr: 20.0,
          af: 2.5,
          wtsd: 30.0,
          w_sd: 50.0,
          bb_per_100: 5.0,
          total_winnings: 10.0,
          stats_data: {},
          device_id: 'init_device'
        },
        metadata: {
          key: 'init_metadata',
          value: { version: '1.0.0', initialized: true },
          last_sync: new Date().toISOString(),
          sync_version: '1.0.0',
          device_ids: ['init_device'],
          device_id: 'init_device'
        }
      };

      for (const [tableName, data] of Object.entries(sampleData)) {
        try {
          const { error } = await this.supabase
            .from(tableName)
            .insert(data)
            .select();

          if (error) {
            // 如果是因为表不存在或列不存在，这是预期的错误
            if (error.code === 'PGRST116' || error.code === 'PGRST205') {
              this.log(`表 ${tableName} 不存在或结构不完整，需要创建`, true);
            } else if (error.code === '23505') {
              // 唯一约束违反，说明数据已存在，这是正常的
              this.log(`表 ${tableName} 已存在示例数据`);
            } else {
              this.log(`表 ${tableName} 插入数据时出错: ${error.message}`, true);
            }
          } else {
            this.log(`表 ${tableName} 示例数据创建成功`);
          }
        } catch (error) {
          this.log(`表 ${tableName} 操作失败: ${error}`, true);
        }
      }
    } catch (error) {
      this.log(`创建示例数据时出错: ${error}`, true);
    }
  }

  /**
   * 测试存储函数
   */
  private async testStorageFunctions(): Promise<void> {
    try {
      // 测试 get_storage_usage 函数
      const { data, error } = await this.supabase
        .rpc('get_storage_usage');

      if (error) {
        if (error.code === 'PGRST202') {
          this.log('存储函数 get_storage_usage 不存在，需要创建', true);
        } else {
          this.log(`存储函数测试失败: ${error.message}`, true);
        }
      } else {
        this.log('存储函数 get_storage_usage 工作正常');
      }
    } catch (error) {
      this.log(`存储函数测试出错: ${error}`, true);
    }
  }

  /**
   * 检查数据库连接和权限
   */
  private async checkConnection(): Promise<boolean> {
    try {
      // 尝试获取用户信息
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError) {
        this.log(`认证检查失败: ${authError.message}`, true);
        return false;
      }

      if (user) {
        this.log(`已认证用户: ${user.id}`);
      } else {
        this.log('当前未认证，将使用匿名访问');
      }

      return true;
    } catch (error) {
      this.log(`连接检查失败: ${error}`, true);
      return false;
    }
  }

  /**
   * 执行简化的数据库初始化检查
   */
  async initializeAndCheck(): Promise<InitializationResult> {
    this.results = [];
    this.log('开始数据库初始化检查...');

    try {
      // 1. 检查连接
      const connectionOk = await this.checkConnection();
      if (!connectionOk) {
        return {
          success: false,
          message: '数据库连接失败',
          details: this.results
        };
      }

      // 2. 创建/测试示例数据
      await this.createSampleData();

      // 3. 测试存储函数
      await this.testStorageFunctions();

      // 4. 检查表状态
      const requiredTables = ['data', 'changes', 'hand_history', 'player_stats', 'metadata'];
      let tablesOk = 0;

      for (const table of requiredTables) {
        const exists = await this.tableExists(table);
        if (exists) {
          this.log(`表 ${table} 可访问`);
          tablesOk++;
        } else {
          this.log(`表 ${table} 不可访问或不存在`, true);
        }
      }

      const allTablesOk = tablesOk === requiredTables.length;

      if (allTablesOk) {
        this.log('🎉 数据库检查完成，所有表都可以正常访问！');
        return {
          success: true,
          message: '数据库初始化检查成功',
          details: this.results
        };
      } else {
        this.log(`数据库检查完成，但有 ${requiredTables.length - tablesOk} 个表不可访问`, true);
        return {
          success: false,
          message: `数据库不完整，需要在 Supabase 后台创建缺失的表`,
          details: this.results
        };
      }

    } catch (error) {
      this.log(`数据库初始化检查失败: ${error}`, true);
      return {
        success: false,
        message: '数据库初始化检查出现错误',
        details: this.results
      };
    }
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData(): Promise<void> {
    const testKeys = ['init_test', 'init_hand_001', 'init_player', 'init_metadata'];
    
    for (const table of ['data', 'hand_history', 'player_stats', 'metadata']) {
      try {
        await this.supabase
          .from(table)
          .delete()
          .or(testKeys.map(key => {
            if (table === 'data' || table === 'metadata') return `key.eq.${key}`;
            if (table === 'hand_history') return `hand_id.eq.${key}`;
            if (table === 'player_stats') return `player_id.eq.${key}`;
            return `id.eq.${key}`;
          }).join(','));
      } catch (error) {
        // 忽略清理错误
      }
    }
  }
}

/**
 * 便捷的初始化函数
 */
export async function checkAndInitializeDatabase(): Promise<InitializationResult> {
  const init = new SimpleDatabaseInit();
  const result = await init.initializeAndCheck();
  
  // 清理测试数据
  await init.cleanupTestData();
  
  return result;
}

export default SimpleDatabaseInit;