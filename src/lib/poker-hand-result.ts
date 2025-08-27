import { Card, Player } from '@/types/poker'
import { StandardPokerEvaluator, PokerPlayerRanking } from './standard-poker-evaluator'
import { PokerHandComparator } from './poker-hand-comparator'
import { SidePotCalculator, SidePotCalculationResult, PlayerBetInfo } from './side-pot-calculator'

/**
 * 完整的扑克手牌结果
 */
export interface PokerHandResult {
  // === 🏆 手牌胜负 (界面核心) ===
  handWinnerId: string              // 手牌最强玩家ID → 金色特效
  handWinnerName: string           // 获胜者姓名
  isHandTied: boolean              // 是否多人平局最强
  heroHandResult: 'win' | 'lose' | 'tie'  // 英雄结果 → 顶部显示
  
  // === 📋 完整排名 ===
  handRankings: PokerPlayerRanking[] // 按手牌强度排序的完整列表
  
  // === 💰 金钱分配 (保持独立) ===
  sidePotResult: SidePotCalculationResult  // 边池计算结果
  totalPot: number
  
  // === 📊 分析信息 ===
  showdown: boolean                // 是否摊牌
  handAnalysis: string             // 基于手牌的分析
  combinedAnalysis: string         // 综合分析（手牌+金钱）
}

/**
 * 德州扑克手牌结果生成器
 * 负责整合手牌强度判定和金额分配逻辑
 */
export class PokerHandResultGenerator {
  
  /**
   * 生成完整的手牌结果
   * 包括手牌胜负判定和金额分配
   */
  static generateHandResult(
    players: Player[],
    communityCards: Card[],
    totalPot: number,
    isShowdown: boolean = true
  ): PokerHandResult {
    
    try {
      // === Step 1: 处理非摊牌情况（弃牌结束） ===
      const activePlayers = players.filter(p => !p.folded)
      
      if (activePlayers.length <= 1) {
        return this.handleFoldResult(players, activePlayers, totalPot)
      }
      
      // === Step 2: 摊牌情况 - 评估所有未弃牌玩家的手牌 ===
      const handEvaluations = this.evaluateAllHands(activePlayers, communityCards)
      
      // === Step 3: 按手牌强度排名 ===
      const handRankings = PokerHandComparator.rankPlayers(handEvaluations)
      
      // === Step 4: 确定手牌获胜者 ===
      const handWinners = PokerHandComparator.getWinners(handRankings)
      const heroRanking = handRankings.find(r => r.playerId === 'hero')
      
      // === Step 5: 计算金钱分配（保持现有边池逻辑） ===
      const sidePotResult = this.calculateMoneyDistribution(players, communityCards)
      
      // === Step 6: 生成最终结果 ===
      const result = {
        // 手牌胜负（界面显示核心）
        handWinnerId: handWinners[0]?.playerId || '',
        handWinnerName: PokerHandComparator.formatWinnerName(handWinners),
        isHandTied: PokerHandComparator.hasTiedWinners(handRankings),
        heroHandResult: this.determineHeroResult(heroRanking, handRankings),
        
        // 完整排名
        handRankings,
        
        // 金钱分配
        sidePotResult,
        totalPot,
        
        // 分析
        showdown: isShowdown,
        handAnalysis: PokerHandComparator.generateHandAnalysis(handRankings),
        combinedAnalysis: this.generateCombinedAnalysis(handRankings, sidePotResult)
      }
      
      // 🔍 调试日志
      console.log('🎯 PokerHandResult生成结果:', {
        handWinnerId: result.handWinnerId,
        heroHandResult: result.heroHandResult,
        handRankingsCount: result.handRankings?.length || 0,
        handRankings: result.handRankings?.map(r => ({
          playerId: r.playerId,
          rank: r.rank,
          handDescription: r.handEvaluation?.readableDescription
        }))
      })
      
      return result
      
    } catch (error) {
      console.error('生成手牌结果时发生错误:', error)
      return this.generateErrorResult(players, totalPot, error)
    }
  }
  
  /**
   * 处理弃牌结束的情况
   */
  private static handleFoldResult(
    allPlayers: Player[],
    activePlayers: Player[],
    totalPot: number
  ): PokerHandResult {
    
    const winner = activePlayers[0]
    const isHeroWinner = winner?.id === 'hero'
    
    // 创建简单的排名结果
    const handRankings: PokerPlayerRanking[] = []
    
    if (winner) {
      handRankings.push({
        playerId: winner.id,
        playerName: winner.name,
        rank: 1,
        handEvaluation: {
          playerId: winner.id,
          playerName: winner.name,
          holeCards: winner.cards as [Card, Card] || [{ rank: '2', suit: 'hearts' }, { rank: '3', suit: 'spades' }],
          bestFiveCards: [{rank: 'A', suit: 'spades'}, {rank: 'K', suit: 'hearts'}, {rank: 'Q', suit: 'diamonds'}, {rank: 'J', suit: 'clubs'}, {rank: '10', suit: 'spades'}] as any,
          handRank: 1,
          handStrength: 0,
          primaryValue: 0,
          kickers: [],
          handDescription: '对手弃牌获胜',
          readableDescription: '对手弃牌，无需比牌'
        },
        isWinner: true,
        isFolded: false
      })
    }
    
    // 添加弃牌玩家
    const foldedPlayers = allPlayers.filter(p => p.folded)
    foldedPlayers.forEach((player, index) => {
      handRankings.push({
        playerId: player.id,
        playerName: player.name,
        rank: 999, // 弃牌玩家排名最后
        handEvaluation: {
          playerId: player.id,
          playerName: player.name,
          holeCards: player.cards as [Card, Card] || [{ rank: '2', suit: 'hearts' }, { rank: '3', suit: 'spades' }],
          bestFiveCards: [{rank: '2', suit: 'hearts'}, {rank: '3', suit: 'spades'}, {rank: '4', suit: 'diamonds'}, {rank: '5', suit: 'clubs'}, {rank: '6', suit: 'spades'}] as any,
          handRank: 0,
          handStrength: -1,
          primaryValue: 0,
          kickers: [],
          handDescription: '已弃牌',
          readableDescription: '已弃牌'
        },
        isWinner: false,
        isFolded: true
      })
    })
    
    // 简单的边池结果
    const sidePotResult: SidePotCalculationResult = {
      sidePots: [{
        id: 'main-pot',
        amount: totalPot,
        eligiblePlayerIds: winner ? [winner.id] : [],
        createdByAllIn: false,
        allInAmount: 0
      }],
      totalPot,
      distributions: winner ? [{
        playerId: winner.id,
        playerName: winner.name,
        amount: totalPot,
        potId: 'main-pot',
        handResult: {
          rank: 'high-card',
          strength: 0,
          kickers: [],
          description: '弃牌获胜'
        },
        isWinner: true,
        isTied: false
      }] : [],
      analysis: winner ? `${winner.name} 因对手弃牌获得 $${totalPot}` : '无获胜者'
    }
    
    return {
      handWinnerId: winner?.id || '',
      handWinnerName: winner?.name || '无获胜者',
      isHandTied: false,
      heroHandResult: isHeroWinner ? 'win' : 'lose',
      handRankings,
      sidePotResult,
      totalPot,
      showdown: false,
      handAnalysis: winner ? `${winner.name} 因对手弃牌获胜` : '所有玩家弃牌',
      combinedAnalysis: winner ? `🏆 ${winner.name} 因对手弃牌获胜，获得全部奖池 $${totalPot}` : '牌局异常结束'
    }
  }
  
  /**
   * 评估所有玩家的手牌
   */
  private static evaluateAllHands(players: Player[], communityCards: Card[]) {
    const evaluations = []
    
    for (const player of players) {
      if (!player.cards || player.cards.length !== 2) {
        console.warn(`玩家 ${player.name} 没有有效手牌`)
        continue
      }
      
      try {
        const evaluation = StandardPokerEvaluator.evaluateBestHand(
          player.id,
          player.name,
          player.cards as [Card, Card],
          communityCards
        )
        evaluations.push(evaluation)
      } catch (error) {
        console.error(`评估玩家 ${player.name} 手牌失败:`, error)
      }
    }
    
    return evaluations
  }
  
  /**
   * 计算金钱分配
   */
  private static calculateMoneyDistribution(
    players: Player[],
    communityCards: Card[]
  ): SidePotCalculationResult {
    
    try {
      // 创建玩家投注信息
      const playerBetInfo: PlayerBetInfo[] = SidePotCalculator.createPlayerBetInfo(players)
      
      // 计算边池结构
      const sidePots = SidePotCalculator.calculateSidePots(playerBetInfo)
      
      // 分配奖池
      return SidePotCalculator.distributePots(sidePots, playerBetInfo, communityCards)
      
    } catch (error) {
      console.error('计算金钱分配失败:', error)
      
      // 返回简单的分配结果
      const totalPot = players.reduce((sum, p) => sum + p.currentBet, 0)
      return {
        sidePots: [{
          id: 'main-pot',
          amount: totalPot,
          eligiblePlayerIds: players.filter(p => !p.folded).map(p => p.id),
          createdByAllIn: false,
          allInAmount: 0
        }],
        totalPot,
        distributions: [],
        analysis: '金额分配计算失败'
      }
    }
  }
  
  /**
   * 确定英雄玩家的结果
   */
  private static determineHeroResult(
    heroRanking: PokerPlayerRanking | undefined,
    allRankings: PokerPlayerRanking[]
  ): 'win' | 'lose' | 'tie' {
    
    if (!heroRanking) {
      return 'lose'  // 英雄已弃牌或不存在
    }
    
    if (heroRanking.rank === 1) {
      // 英雄排名第一，检查是否平局
      const winners = allRankings.filter(r => r.rank === 1)
      return winners.length > 1 ? 'tie' : 'win'
    }
    
    return 'lose'  // 英雄不是第一名
  }
  
  /**
   * 生成综合分析报告
   */
  private static generateCombinedAnalysis(
    handRankings: PokerPlayerRanking[],
    sidePotResult: SidePotCalculationResult
  ): string {
    
    const lines: string[] = []
    const winners = handRankings.filter(r => r.isWinner)
    
    lines.push('🎯 综合分析报告')
    lines.push('=' .repeat(30))
    lines.push('')
    
    // 手牌分析
    if (winners.length === 1) {
      const winner = winners[0]
      lines.push(`🏆 手牌获胜者: ${winner.playerName}`)
      lines.push(`   获胜牌型: ${winner.handEvaluation.readableDescription}`)
    } else if (winners.length > 1) {
      const winnerNames = winners.map(w => w.playerName).join('、')
      lines.push(`🤝 手牌平局: ${winnerNames}`)
      lines.push(`   平局牌型: ${winners[0].handEvaluation.readableDescription}`)
    }
    
    lines.push('')
    
    // 金钱分配分析
    const moneyWinners = sidePotResult.distributions.filter(d => d.amount > 0)
    if (moneyWinners.length > 0) {
      lines.push('💰 实际收益:')
      moneyWinners.forEach(dist => {
        lines.push(`   ${dist.playerName}: +$${dist.amount}`)
      })
    }
    
    lines.push('')
    lines.push(`📊 总奖池: $${sidePotResult.totalPot}`)
    lines.push('✅ 基于国际德州扑克标准规则')
    
    return lines.join('\n')
  }
  
  /**
   * 生成错误结果
   */
  private static generateErrorResult(
    players: Player[],
    totalPot: number,
    error: any
  ): PokerHandResult {
    
    console.error('生成手牌结果时发生严重错误:', error)
    
    return {
      handWinnerId: '',
      handWinnerName: '计算错误',
      isHandTied: false,
      heroHandResult: 'lose',
      handRankings: [],
      sidePotResult: {
        sidePots: [],
        totalPot,
        distributions: [],
        analysis: '计算过程发生错误'
      },
      totalPot,
      showdown: false,
      handAnalysis: '手牌分析失败',
      combinedAnalysis: `计算错误: ${error?.message || '未知错误'}`
    }
  }
}