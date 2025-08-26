/**
 * 数据库初始化工具
 * 
 * 用于设置 Supabase 数据库表和函数
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SCHEMA } from './cloud-database-schema';
import { SUPABASE_CONFIG } from '../config/cloud-config';

/**
 * 数据库初始化类
 */
export class DatabaseSetup {
  private supabase: any;

  constructor(config = SUPABASE_CONFIG) {
    this.supabase = createClient(
      config.baseUrl || '',
      config.apiKey || ''
    );
  }

  /**
   * 执行单个 SQL 命令
   */
  private async executeSql(sql: string, description: string): Promise<boolean> {
    try {
      console.log(`正在执行: ${description}...`);
      
      // 分割 SQL 语句并逐个执行
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { data, error } = await this.supabase.rpc('exec_sql', { 
            sql_query: statement 
          });

          if (error) {
            // 如果错误是表已存在，我们可以忽略
            if (error.message?.includes('already exists') || 
                error.message?.includes('relation') && error.message?.includes('already exists')) {
              console.log(`⚠️ ${description}: 已存在，跳过`);
              continue;
            }
            throw error;
          }
        }
      }

      console.log(`✅ ${description}: 完成`);
      return true;
    } catch (error) {
      console.error(`❌ ${description}: 失败`, error);
      return false;
    }
  }

  /**
   * 初始化所有数据库表
   */
  async initializeTables(): Promise<boolean> {
    console.log('🚀 开始初始化数据库表...');
    
    let allSuccess = true;
    
    // 依次执行各个表的创建脚本
    for (const [tableName, sql] of Object.entries(SUPABASE_SCHEMA)) {
      if (tableName === 'rls_policies' || tableName === 'functions') {
        continue; // 先跳过策略和函数，最后执行
      }
      
      const success = await this.executeSql(sql, `创建表 ${tableName}`);
      if (!success) {
        allSuccess = false;
      }
    }

    return allSuccess;
  }

  /**
   * 设置行级安全策略
   */
  async setupRLS(): Promise<boolean> {
    console.log('🔒 开始设置行级安全策略...');
    
    if (SUPABASE_SCHEMA.rls_policies) {
      return await this.executeSql(SUPABASE_SCHEMA.rls_policies, '设置 RLS 策略');
    }
    
    return true;
  }

  /**
   * 创建存储过程和函数
   */
  async createFunctions(): Promise<boolean> {
    console.log('⚡ 开始创建存储过程和函数...');
    
    if (SUPABASE_SCHEMA.functions) {
      return await this.executeSql(SUPABASE_SCHEMA.functions, '创建存储过程');
    }
    
    return true;
  }

  /**
   * 验证数据库设置
   */
  async verifySetup(): Promise<boolean> {
    console.log('🔍 验证数据库设置...');
    
    try {
      // 检查必要的表是否存在
      const requiredTables = ['data', 'changes', 'hand_history', 'player_stats', 'metadata'];
      
      for (const table of requiredTables) {
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error && error.code === 'PGRST116') { // 表不存在
          console.error(`❌ 表 ${table} 不存在`);
          return false;
        }
      }

      // 检查存储过程是否存在
      const { data: functionData, error: functionError } = await this.supabase
        .rpc('get_storage_usage');
      
      if (functionError && functionError.code === 'PGRST202') {
        console.error('❌ 存储函数 get_storage_usage 不存在');
        return false;
      }

      console.log('✅ 数据库设置验证成功');
      return true;
    } catch (error) {
      console.error('❌ 数据库验证失败:', error);
      return false;
    }
  }

  /**
   * 完整的数据库初始化流程
   */
  async initializeDatabase(): Promise<boolean> {
    console.log('🗄️ 开始完整数据库初始化...');
    
    try {
      // 步骤 1: 创建表
      const tablesSuccess = await this.initializeTables();
      if (!tablesSuccess) {
        console.error('❌ 表创建失败，停止初始化');
        return false;
      }

      // 步骤 2: 创建函数
      const functionsSuccess = await this.createFunctions();
      if (!functionsSuccess) {
        console.warn('⚠️ 函数创建失败，但继续执行...');
      }

      // 步骤 3: 设置 RLS 策略
      const rlsSuccess = await this.setupRLS();
      if (!rlsSuccess) {
        console.warn('⚠️ RLS 策略设置失败，但继续执行...');
      }

      // 步骤 4: 验证设置
      const verificationSuccess = await this.verifySetup();
      
      if (verificationSuccess) {
        console.log('🎉 数据库初始化完成！');
        return true;
      } else {
        console.error('❌ 数据库初始化验证失败');
        return false;
      }
    } catch (error) {
      console.error('❌ 数据库初始化过程中出现错误:', error);
      return false;
    }
  }

  /**
   * 重置数据库（谨慎使用）
   */
  async resetDatabase(): Promise<boolean> {
    console.log('⚠️ 开始重置数据库...');
    
    try {
      const tables = ['metadata', 'player_stats', 'hand_history', 'changes', 'data'];
      
      for (const table of tables) {
        await this.executeSql(`DROP TABLE IF EXISTS ${table} CASCADE;`, `删除表 ${table}`);
      }

      console.log('✅ 数据库重置完成');
      return true;
    } catch (error) {
      console.error('❌ 数据库重置失败:', error);
      return false;
    }
  }
}

/**
 * 便捷的初始化函数
 */
export async function setupDatabase(): Promise<boolean> {
  const setup = new DatabaseSetup();
  return await setup.initializeDatabase();
}

/**
 * 便捷的验证函数  
 */
export async function verifyDatabase(): Promise<boolean> {
  const setup = new DatabaseSetup();
  return await setup.verifySetup();
}

export default DatabaseSetup;