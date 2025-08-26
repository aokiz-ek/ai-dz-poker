import { StorageManager } from './storage/storage-manager'
import { IDataProvider } from './storage/interfaces'

// Training configuration types
export interface TrainingConfig {
  id: string
  name: string
  gameFormat: 'cash' | 'tournament' | 'shortdeck' | 'sitgo'
  structure: 'regular' | 'ante' | 'straddle' | 'straddle_ante'
  tableSize: 9 | 8 | 6 | 2
  stackDepth: 200 | 100 | 50
  displayMode: 'actual' | 'blind'
  blindLevel: number
  rakeConfig: {
    percentage: number
    cap: number
  }
  createdAt: number
  updatedAt: number
}

// Training session types
export interface TrainingSession {
  id: string
  configId: string
  timestamp: number
  handHistory: HandRecord[]
  decisions: DecisionRecord[]
  performance: PerformanceMetrics
  duration: number
  completed: boolean
  isImportant?: boolean // 重要会话，保留时间更长
  isFavorite?: boolean  // 收藏会话，永不自动删除
}

export interface HandRecord {
  id: string
  timestamp: number
  position: string
  holeCards: [string, string]
  communityCards: string[]
  actions: ActionRecord[]
  potSize: number
  result: HandResult
}

export interface ActionRecord {
  player: string
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
  amount?: number
  timestamp: number
  street: 'preflop' | 'flop' | 'turn' | 'river'
}

export interface DecisionRecord {
  handId: string
  timestamp: number
  situation: GameSituation
  playerDecision: PlayerDecision
  gtoRecommendation: GtoRecommendation
  deviation: number // GTO偏离度
  isCorrect: boolean
  feedback: string
}

export interface PerformanceMetrics {
  handsPlayed: number
  decisionsCount: number
  correctDecisions: number
  averageDeviation: number
  improvementRate: number
  strengths: string[]
  weaknesses: string[]
}

export interface HandResult {
  winner: string
  winnings: number
  showdown: boolean
  winningHand?: string
}

export interface GameSituation {
  street: 'preflop' | 'flop' | 'turn' | 'river'
  position: string
  stackSize: number
  potSize: number
  communityCards: string[]
  previousActions: ActionRecord[]
}

export interface PlayerDecision {
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
  amount?: number
  reasoning?: string
}

export interface GtoRecommendation {
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
  amount?: number
  confidence: number // 0-100
  alternativeActions: Array<{
    action: string
    amount?: number
    frequency: number
  }>
}

// Storage cleanup configuration
export interface StorageCleanupConfig {
  enabled: boolean
  maxAge: number // days
  maxSize: number // MB
  keepImportant: boolean
  cleanupPriority: {
    tempData: number
    regularSessions: number
    importantSessions: number
    configurations: number // -1 means never cleanup
  }
  retentionRules: {
    keepMilestones: boolean
    keepHighScores: boolean
    keepFavorites: boolean
  }
}

// Storage usage info
export interface StorageUsage {
  totalSize: number // MB
  configSize: number
  sessionSize: number
  tempSize: number
  itemCounts: {
    configs: number
    sessions: number
    tempData: number
  }
  lastCleanup: number
}

/**
 * Training Storage Manager
 * 专门管理训练系统的数据存储，支持定时清理
 */
export class TrainingStorageManager {
  private storageManager: StorageManager
  private cleanupConfig: StorageCleanupConfig
  private cleanupInterval?: NodeJS.Timeout

  constructor(storageManager?: StorageManager) {
    this.storageManager = storageManager || new StorageManager()
    
    // Default cleanup configuration
    this.cleanupConfig = {
      enabled: true,
      maxAge: 30, // 30 days
      maxSize: 50, // 50 MB
      keepImportant: true,
      cleanupPriority: {
        tempData: 1,      // 1 day
        regularSessions: 7, // 7 days  
        importantSessions: 30, // 30 days
        configurations: -1     // never
      },
      retentionRules: {
        keepMilestones: true,
        keepHighScores: true,
        keepFavorites: true
      }
    }

    this.initCleanupSchedule()
  }

  // === Training Configuration Management ===

  /**
   * Save training configuration
   */
  async saveTrainingConfig(config: Omit<TrainingConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrainingConfig> {
    const newConfig: TrainingConfig = {
      ...config,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    await this.storageManager.set(`training_config_${newConfig.id}`, newConfig)
    return newConfig
  }

  /**
   * Load training configuration
   */
  async loadTrainingConfig(id: string): Promise<TrainingConfig | null> {
    return await this.storageManager.get(`training_config_${id}`)
  }

  /**
   * Get all training configurations
   */
  async getAllTrainingConfigs(): Promise<TrainingConfig[]> {
    const keys = await this.storageManager.getAllKeys()
    const configKeys = keys.filter(key => key.startsWith('training_config_'))
    
    const configs: TrainingConfig[] = []
    for (const key of configKeys) {
      const config = await this.storageManager.get(key)
      if (config) {
        configs.push(config)
      }
    }

    return configs.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  /**
   * Update training configuration
   */
  async updateTrainingConfig(id: string, updates: Partial<TrainingConfig>): Promise<TrainingConfig | null> {
    const existing = await this.loadTrainingConfig(id)
    if (!existing) return null

    const updated: TrainingConfig = {
      ...existing,
      ...updates,
      id, // ensure ID doesn't change
      updatedAt: Date.now()
    }

    await this.storageManager.set(`training_config_${id}`, updated)
    return updated
  }

  /**
   * Delete training configuration
   */
  async deleteTrainingConfig(id: string): Promise<boolean> {
    return await this.storageManager.remove(`training_config_${id}`)
  }

  // === Training Session Management ===

  /**
   * Save training session
   */
  async saveTrainingSession(session: Omit<TrainingSession, 'id' | 'timestamp'>): Promise<TrainingSession> {
    const newSession: TrainingSession = {
      ...session,
      id: this.generateId(),
      timestamp: Date.now()
    }

    await this.storageManager.set(`training_session_${newSession.id}`, newSession)
    return newSession
  }

  /**
   * Load training session
   */
  async loadTrainingSession(id: string): Promise<TrainingSession | null> {
    return await this.storageManager.get(`training_session_${id}`)
  }

  /**
   * Get training sessions with filters
   */
  async getTrainingSessions(filter?: {
    configId?: string
    limit?: number
    offset?: number
    sortBy?: 'timestamp' | 'performance'
    completed?: boolean
  }): Promise<{sessions: TrainingSession[], total: number}> {
    const keys = await this.storageManager.getAllKeys()
    const sessionKeys = keys.filter(key => key.startsWith('training_session_'))
    
    let sessions: TrainingSession[] = []
    for (const key of sessionKeys) {
      const session = await this.storageManager.get(key)
      if (session) {
        // Apply filters
        if (filter?.configId && session.configId !== filter.configId) continue
        if (filter?.completed !== undefined && session.completed !== filter.completed) continue
        
        sessions.push(session)
      }
    }

    // Sort sessions
    if (filter?.sortBy === 'performance') {
      sessions.sort((a, b) => b.performance.correctDecisions - a.performance.correctDecisions)
    } else {
      sessions.sort((a, b) => b.timestamp - a.timestamp)
    }

    const total = sessions.length
    
    // Apply pagination
    if (filter?.offset || filter?.limit) {
      const offset = filter.offset || 0
      const limit = filter.limit || 50
      sessions = sessions.slice(offset, offset + limit)
    }

    return { sessions, total }
  }

  /**
   * Update training session
   */
  async updateTrainingSession(id: string, updates: Partial<TrainingSession>): Promise<TrainingSession | null> {
    const existing = await this.loadTrainingSession(id)
    if (!existing) return null

    const updated: TrainingSession = {
      ...existing,
      ...updates,
      id // ensure ID doesn't change
    }

    await this.storageManager.set(`training_session_${id}`, updated)
    return updated
  }

  /**
   * Delete training session
   */
  async deleteTrainingSession(id: string): Promise<boolean> {
    return await this.storageManager.remove(`training_session_${id}`)
  }

  /**
   * Mark session as favorite
   */
  async toggleSessionFavorite(id: string): Promise<boolean> {
    const session = await this.loadTrainingSession(id)
    if (!session) return false

    session.isFavorite = !session.isFavorite
    await this.updateTrainingSession(id, session)
    return true
  }

  /**
   * Mark session as important
   */
  async toggleSessionImportance(id: string): Promise<boolean> {
    const session = await this.loadTrainingSession(id)
    if (!session) return false

    session.isImportant = !session.isImportant
    await this.updateTrainingSession(id, session)
    return true
  }

  // === Storage Management ===

  /**
   * Get storage usage statistics
   */
  async getStorageUsage(): Promise<StorageUsage> {
    const keys = await this.storageManager.getAllKeys()
    const trainingKeys = keys.filter(key => 
      key.startsWith('training_') || key.startsWith('temp_training_')
    )

    let totalSize = 0
    let configSize = 0
    let sessionSize = 0
    let tempSize = 0
    let configCount = 0
    let sessionCount = 0
    let tempCount = 0

    for (const key of trainingKeys) {
      const data = await this.storageManager.get(key)
      if (data) {
        const size = JSON.stringify(data).length / 1024 / 1024 // Convert to MB
        
        if (key.startsWith('training_config_')) {
          configSize += size
          configCount++
        } else if (key.startsWith('training_session_')) {
          sessionSize += size
          sessionCount++
        } else if (key.startsWith('temp_training_')) {
          tempSize += size
          tempCount++
        }
        
        totalSize += size
      }
    }

    return {
      totalSize,
      configSize,
      sessionSize,
      tempSize,
      itemCounts: {
        configs: configCount,
        sessions: sessionCount,
        tempData: tempCount
      },
      lastCleanup: await this.storageManager.get('last_training_cleanup') || 0
    }
  }

  /**
   * Configure automatic cleanup
   */
  setCleanupConfig(config: Partial<StorageCleanupConfig>): void {
    this.cleanupConfig = { ...this.cleanupConfig, ...config }
    
    // Restart cleanup schedule if enabled changed
    if ('enabled' in config) {
      this.stopCleanupSchedule()
      if (config.enabled) {
        this.initCleanupSchedule()
      }
    }
  }

  /**
   * Get current cleanup configuration
   */
  getCleanupConfig(): StorageCleanupConfig {
    return { ...this.cleanupConfig }
  }

  /**
   * Manually trigger cleanup
   */
  async cleanupExpiredData(): Promise<{
    deletedItems: number
    freedSpace: number
    errors: string[]
  }> {
    if (!this.cleanupConfig.enabled) {
      return { deletedItems: 0, freedSpace: 0, errors: ['Cleanup is disabled'] }
    }

    const usage = await this.getStorageUsage()
    const currentTime = Date.now()
    const errors: string[] = []
    let deletedItems = 0
    let freedSpace = 0

    try {
      // Get all training-related keys
      const keys = await this.storageManager.getAllKeys()
      const trainingKeys = keys.filter(key => 
        key.startsWith('training_') || key.startsWith('temp_training_')
      )

      for (const key of trainingKeys) {
        try {
          const data = await this.storageManager.get(key)
          if (!data) continue

          let shouldDelete = false
          let reason = ''

          // Check temp data
          if (key.startsWith('temp_training_')) {
            const age = (currentTime - data.timestamp) / (1000 * 60 * 60 * 24)
            if (age > this.cleanupConfig.cleanupPriority.tempData) {
              shouldDelete = true
              reason = 'temp data expired'
            }
          }
          
          // Check training sessions
          else if (key.startsWith('training_session_')) {
            const session = data as TrainingSession
            const age = (currentTime - session.timestamp) / (1000 * 60 * 60 * 24)
            
            // Never delete favorites
            if (this.cleanupConfig.retentionRules.keepFavorites && session.isFavorite) {
              continue
            }
            
            // Check if important and should keep
            if (this.cleanupConfig.keepImportant && session.isImportant) {
              if (age > this.cleanupConfig.cleanupPriority.importantSessions) {
                shouldDelete = true
                reason = 'important session expired'
              }
            } else {
              if (age > this.cleanupConfig.cleanupPriority.regularSessions) {
                shouldDelete = true
                reason = 'regular session expired'
              }
            }
          }
          
          // Never delete configurations (unless priority is set)
          else if (key.startsWith('training_config_')) {
            if (this.cleanupConfig.cleanupPriority.configurations > 0) {
              const age = (currentTime - data.updatedAt) / (1000 * 60 * 60 * 24)
              if (age > this.cleanupConfig.cleanupPriority.configurations) {
                shouldDelete = true
                reason = 'configuration expired'
              }
            }
          }

          if (shouldDelete) {
            const itemSize = JSON.stringify(data).length / 1024 / 1024
            const deleted = await this.storageManager.remove(key)
            if (deleted) {
              deletedItems++
              freedSpace += itemSize
              console.log(`Cleaned up ${key}: ${reason}`)
            }
          }
        } catch (error) {
          errors.push(`Failed to process ${key}: ${error}`)
        }
      }

      // Check if we need to free more space
      const newUsage = await this.getStorageUsage()
      if (newUsage.totalSize > this.cleanupConfig.maxSize) {
        // More aggressive cleanup needed
        await this.performAggressiveCleanup(newUsage.totalSize - this.cleanupConfig.maxSize)
      }

      // Update last cleanup timestamp
      await this.storageManager.set('last_training_cleanup', currentTime)

    } catch (error) {
      errors.push(`Cleanup failed: ${error}`)
    }

    return { deletedItems, freedSpace, errors }
  }

  /**
   * Perform aggressive cleanup when storage is still over limit
   */
  private async performAggressiveCleanup(targetSize: number): Promise<void> {
    const keys = await this.storageManager.getAllKeys()
    const sessionKeys = keys.filter(key => key.startsWith('training_session_'))
    
    // Sort sessions by age (oldest first) and importance (least important first)
    const sessions: Array<{key: string, data: TrainingSession, size: number}> = []
    
    for (const key of sessionKeys) {
      const data = await this.storageManager.get(key)
      if (data && !data.isFavorite) { // Never delete favorites
        const size = JSON.stringify(data).length / 1024 / 1024
        sessions.push({key, data, size})
      }
    }

    // Sort by: not important first, then by age (oldest first)
    sessions.sort((a, b) => {
      if (a.data.isImportant !== b.data.isImportant) {
        return a.data.isImportant ? 1 : -1
      }
      return a.data.timestamp - b.data.timestamp
    })

    let freedSpace = 0
    for (const session of sessions) {
      if (freedSpace >= targetSize) break
      
      await this.storageManager.remove(session.key)
      freedSpace += session.size
      console.log(`Aggressively cleaned up ${session.key}`)
    }
  }

  /**
   * Initialize automatic cleanup schedule
   */
  private initCleanupSchedule(): void {
    if (!this.cleanupConfig.enabled) return

    // Run cleanup daily
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredData()
      } catch (error) {
        console.error('Scheduled cleanup failed:', error)
      }
    }, 24 * 60 * 60 * 1000) // 24 hours
  }

  /**
   * Stop automatic cleanup schedule
   */
  private stopCleanupSchedule(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cleanup when manager is destroyed
   */
  destroy(): void {
    this.stopCleanupSchedule()
  }
}

// Export singleton instance
export const trainingStorageManager = new TrainingStorageManager()

// Export default
export default TrainingStorageManager