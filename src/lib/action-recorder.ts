import { ActionType, GameStage, Player } from '@/types/poker'

export interface DetailedActionRecord {
  // 基础信息
  playerId: string
  playerName: string
  position: string
  action: ActionType
  amount?: number
  
  // 时间信息
  timestamp: number
  sequenceId: number        // 严格递增序列号
  street: GameStage        // 哪个街道的操作
  
  // 上下文信息
  potSizeBefore: number    // 操作前底池大小
  potSizeAfter: number     // 操作后底池大小
  stackBefore: number      // 操作前筹码量
  stackAfter: number       // 操作后筹码量
  
  // 操作类型标记
  actionCategory: 'game_event' | 'player_action' | 'system_action'
  
  // 详细描述
  description?: string     // 操作描述文本
}

/**
 * 专业操作记录管理器
 * 记录游戏中的所有操作，包括游戏事件、玩家操作和系统操作
 */
export class ActionRecorder {
  private records: DetailedActionRecord[] = []
  private sequenceCounter: number = 0

  /**
   * 清除所有记录，开始新的手牌
   */
  clearRecords(): void {
    this.records = []
    this.sequenceCounter = 0
  }

  /**
   * 记录游戏开始事件
   */
  recordGameStart(players: Player[], pot: number): void {
    this.addRecord({
      playerId: 'system',
      playerName: '系统',
      position: '',
      action: 'check' as ActionType, // 使用check作为游戏开始标记
      street: 'preflop',
      potSizeBefore: 0,
      potSizeAfter: pot,
      stackBefore: 0,
      stackAfter: 0,
      actionCategory: 'game_event',
      description: `新手牌开始，${players.length}名玩家参与`
    })
  }

  /**
   * 记录盲注投入
   */
  recordBlindPost(
    player: Player, 
    amount: number, 
    blindType: 'small' | 'big',
    potBefore: number,
    potAfter: number
  ): void {
    this.addRecord({
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      action: 'bet',
      amount,
      street: 'preflop',
      potSizeBefore: potBefore,
      potSizeAfter: potAfter,
      stackBefore: player.stack + amount,
      stackAfter: player.stack,
      actionCategory: 'game_event',
      description: `投入${blindType === 'small' ? '小' : '大'}盲注`
    })
  }

  /**
   * 记录玩家操作
   */
  recordPlayerAction(
    player: Player,
    action: ActionType,
    amount: number = 0,
    street: GameStage,
    potBefore: number,
    potAfter: number,
    stackBefore: number
  ): void {
    this.addRecord({
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      action,
      amount: amount > 0 ? amount : undefined,
      street,
      potSizeBefore: potBefore,
      potSizeAfter: potAfter,
      stackBefore,
      stackAfter: player.stack,
      actionCategory: 'player_action',
      description: this.generateActionDescription(player, action, amount)
    })
  }

  /**
   * 记录街道进展（翻牌、转牌、河牌）
   */
  recordStreetProgression(
    fromStreet: GameStage,
    toStreet: GameStage,
    communityCards: number,
    pot: number
  ): void {
    this.addRecord({
      playerId: 'system',
      playerName: '系统',
      position: '',
      action: 'check' as ActionType,
      street: toStreet,
      potSizeBefore: pot,
      potSizeAfter: pot,
      stackBefore: 0,
      stackAfter: 0,
      actionCategory: 'system_action',
      description: `进入${this.getStreetName(toStreet)}阶段，公共牌${communityCards}张`
    })
  }

  /**
   * 记录手牌结束
   */
  recordHandEnd(
    winnerId: string,
    winnerName: string,
    winAmount: number,
    reason: 'showdown' | 'fold'
  ): void {
    this.addRecord({
      playerId: winnerId,
      playerName: winnerName,
      position: '',
      action: 'check' as ActionType,
      street: 'showdown',
      potSizeBefore: winAmount,
      potSizeAfter: 0,
      stackBefore: 0,
      stackAfter: 0,
      actionCategory: 'game_event',
      description: reason === 'showdown' 
        ? `摊牌获胜，赢得$${winAmount}` 
        : `其他玩家弃牌，赢得$${winAmount}`
    })
  }

  /**
   * 获取所有记录
   */
  getRecords(): DetailedActionRecord[] {
    return [...this.records]
  }

  /**
   * 获取最近的N个记录
   */
  getRecentRecords(count: number = 8): DetailedActionRecord[] {
    return this.records.slice(-count)
  }

  /**
   * 获取特定街道的操作记录
   */
  getRecordsByStreet(street: GameStage): DetailedActionRecord[] {
    return this.records.filter(record => record.street === street)
  }

  /**
   * 私有方法：添加记录
   */
  private addRecord(baseRecord: Omit<DetailedActionRecord, 'timestamp' | 'sequenceId'>): void {
    const record: DetailedActionRecord = {
      ...baseRecord,
      timestamp: Date.now(),
      sequenceId: this.sequenceCounter++
    }
    
    this.records.push(record)
    
    // 限制记录数量，防止内存泄漏（保留最近100个记录）
    if (this.records.length > 100) {
      this.records = this.records.slice(-100)
    }
  }

  /**
   * 生成操作描述
   */
  private generateActionDescription(player: Player, action: ActionType, amount: number): string {
    switch (action) {
      case 'fold':
        return `${player.name}弃牌`
      case 'check':
        return `${player.name}过牌`
      case 'call':
        return `${player.name}跟注$${amount}`
      case 'bet':
        return `${player.name}投入$${amount}`
      case 'raise':
        return `${player.name}加注到$${amount}`
      case 'all-in':
        return `${player.name}全下$${amount}`
      default:
        return `${player.name}执行${action}`
    }
  }

  /**
   * 获取街道名称
   */
  private getStreetName(street: GameStage): string {
    const names = {
      'preflop': '翻前',
      'flop': '翻牌',
      'turn': '转牌',
      'river': '河牌',
      'showdown': '摊牌'
    }
    return names[street] || street
  }
}