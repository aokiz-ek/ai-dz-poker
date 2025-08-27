import { PokerHandEvaluation, PokerPlayerRanking } from './standard-poker-evaluator'

/**
 * 德州扑克手牌比较器
 * 实现标准的德州扑克比牌规则
 */
export class PokerHandComparator {
  
  /**
   * 比较两个玩家的手牌强度
   * 返回: >0 表示player1获胜, <0 表示player2获胜, =0 表示平局
   */
  static compareHands(
    player1: PokerHandEvaluation, 
    player2: PokerHandEvaluation
  ): number {
    
    // 1. 首先比较牌型等级
    const rankDiff = player1.handRank - player2.handRank
    if (rankDiff !== 0) return rankDiff
    
    // 2. 牌型相同，比较主要点数
    const primaryDiff = player1.primaryValue - player2.primaryValue
    if (primaryDiff !== 0) return primaryDiff
    
    // 3. 主要点数相同，比较次要点数（如果有）
    if (player1.secondaryValue !== undefined && player2.secondaryValue !== undefined) {
      const secondaryDiff = player1.secondaryValue - player2.secondaryValue
      if (secondaryDiff !== 0) return secondaryDiff
    }
    
    // 4. 最后比较踢脚牌（按顺序比较）
    const minKickers = Math.min(player1.kickers.length, player2.kickers.length)
    for (let i = 0; i < minKickers; i++) {
      const kickerDiff = player1.kickers[i] - player2.kickers[i]
      if (kickerDiff !== 0) return kickerDiff
    }
    
    // 5. 完全相同，平局
    return 0
  }
  
  /**
   * 对多个玩家按手牌强度排序
   * 支持并列排名
   */
  static rankPlayers(evaluations: PokerHandEvaluation[]): PokerPlayerRanking[] {
    if (evaluations.length === 0) return []
    
    // 按强度排序（降序）
    const sorted = [...evaluations].sort((a, b) => 
      this.compareHands(b, a) // 注意：b-a 是降序
    )
    
    const rankings: PokerPlayerRanking[] = []
    let currentRank = 1
    
    for (let i = 0; i < sorted.length; i++) {
      const player = sorted[i]
      
      // 检查是否与前一个玩家平局
      const isTied = i > 0 && this.compareHands(player, sorted[i-1]) === 0
      
      // 如果不是平局，更新排名
      if (!isTied && i > 0) {
        currentRank = i + 1
      }
      
      rankings.push({
        playerId: player.playerId,
        playerName: player.playerName,
        rank: currentRank,
        handEvaluation: player,
        isWinner: currentRank === 1,  // 排名第一即为获胜者
        isFolded: false
      })
    }
    
    return rankings
  }
  
  /**
   * 获取获胜者列表（可能多人并列第一）
   */
  static getWinners(rankings: PokerPlayerRanking[]): PokerPlayerRanking[] {
    return rankings.filter(r => r.isWinner)
  }
  
  /**
   * 格式化获胜者名称
   */
  static formatWinnerName(winners: PokerPlayerRanking[]): string {
    if (winners.length === 0) return '无获胜者'
    if (winners.length === 1) return winners[0].playerName
    
    const names = winners.map(w => w.playerName).join('、')
    return `${names}等${winners.length}人平局`
  }
  
  /**
   * 检查是否存在平局
   */
  static hasTiedWinners(rankings: PokerPlayerRanking[]): boolean {
    const winners = this.getWinners(rankings)
    return winners.length > 1
  }
  
  /**
   * 生成手牌分析报告
   */
  static generateHandAnalysis(rankings: PokerPlayerRanking[]): string {
    const lines: string[] = []
    
    lines.push('🃏 手牌强度分析报告')
    lines.push('=' .repeat(40))
    
    rankings.forEach((ranking, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📋'
      const tieIndicator = ranking.rank === 1 && this.hasTiedWinners(rankings) ? ' (并列第一)' : ''
      
      lines.push('')
      lines.push(`${medal} 第${ranking.rank}名: ${ranking.playerName}${tieIndicator}`)
      lines.push(`   牌型: ${ranking.handEvaluation.readableDescription}`)
      lines.push(`   最佳5张: ${this.formatBestFiveCards(ranking.handEvaluation.bestFiveCards)}`)
    })
    
    lines.push('')
    lines.push('✅ 基于国际德州扑克7选5标准规则')
    
    return lines.join('\n')
  }
  
  /**
   * 格式化最佳5张牌显示
   */
  private static formatBestFiveCards(cards: [any, any, any, any, any]): string {
    return cards.map(card => `${card.rank}${this.getSuitSymbol(card.suit)}`).join(' ')
  }
  
  /**
   * 获取花色符号
   */
  private static getSuitSymbol(suit: string): string {
    switch (suit) {
      case 'hearts': return '♥'
      case 'diamonds': return '♦'
      case 'clubs': return '♣'
      case 'spades': return '♠'
      default: return '?'
    }
  }
}