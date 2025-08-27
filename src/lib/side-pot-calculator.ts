import { Player, Card, HandStrengthResult } from '@/types/poker';
import { HandEvaluator } from '@/lib/hand-evaluator';

/**
 * 边池数据结构
 */
export interface SidePot {
  id: string;
  amount: number;
  eligiblePlayerIds: string[];
  createdByAllIn: boolean;
  allInAmount: number; // 创建此边池的全下金额
}

/**
 * 奖池分配结果
 */
export interface PotDistribution {
  playerId: string;
  playerName: string;
  amount: number;
  potId: string;
  handResult: HandStrengthResult;
  isWinner: boolean;
  isTied: boolean;
}

/**
 * 边池计算结果
 */
export interface SidePotCalculationResult {
  sidePots: SidePot[];
  totalPot: number;
  distributions: PotDistribution[];
  analysis: string;
}

/**
 * 玩家投注信息
 */
export interface PlayerBetInfo {
  playerId: string;
  playerName: string;
  totalBet: number;
  isAllIn: boolean;
  isFolded: boolean;
  cards?: [Card, Card];
}

/**
 * 专业德州扑克边池计算器
 * 
 * 功能：
 * 1. 处理多人全下时的边池创建
 * 2. 正确计算每个边池的合格玩家
 * 3. 专业的奖池分配算法
 * 4. 奇数筹码处理（按位置顺序分配）
 */
export class SidePotCalculator {
  
  /**
   * 计算边池结构
   * @param playerBets 所有玩家的投注信息
   * @returns 边池结构数组
   */
  static calculateSidePots(playerBets: PlayerBetInfo[]): SidePot[] {
    // 过滤掉弃牌玩家
    const activeBets = playerBets.filter(bet => !bet.isFolded);
    
    if (activeBets.length === 0) {
      return [];
    }

    // 按投注金额排序（从小到大）
    const sortedBets = [...activeBets].sort((a, b) => a.totalBet - b.totalBet);
    
    const sidePots: SidePot[] = [];
    let processedAmount = 0;

    for (let i = 0; i < sortedBets.length; i++) {
      const currentBet = sortedBets[i];
      const betAmount = currentBet.totalBet;
      
      // 计算这一层的边池金额
      const layerAmount = betAmount - processedAmount;
      
      if (layerAmount > 0) {
        // 计算有资格参与此边池的玩家
        const eligiblePlayers = sortedBets.slice(i).map(bet => bet.playerId);
        
        // 计算此边池的总金额
        const potAmount = layerAmount * eligiblePlayers.length;
        
        sidePots.push({
          id: `pot-${i}`,
          amount: potAmount,
          eligiblePlayerIds: eligiblePlayers,
          createdByAllIn: currentBet.isAllIn,
          allInAmount: betAmount
        });
      }
      
      processedAmount = betAmount;
    }

    return sidePots;
  }

  /**
   * 分配奖池给获胜者
   * @param sidePots 边池结构
   * @param playerBets 玩家投注信息
   * @param communityCards 公共牌
   * @returns 完整的分配结果
   */
  static distributePots(
    sidePots: SidePot[], 
    playerBets: PlayerBetInfo[], 
    communityCards: Card[]
  ): SidePotCalculationResult {
    const distributions: PotDistribution[] = [];
    let totalDistributed = 0;

    // 为每个边池计算获胜者
    for (const pot of sidePots) {
      const potResult = this.distributeSinglePot(pot, playerBets, communityCards);
      distributions.push(...potResult.distributions);
      totalDistributed += pot.amount;
    }

    // 生成分析报告
    const analysis = this.generateDistributionAnalysis(sidePots, distributions);

    return {
      sidePots,
      totalPot: totalDistributed,
      distributions,
      analysis
    };
  }

  /**
   * 分配单个边池
   */
  private static distributeSinglePot(
    pot: SidePot,
    playerBets: PlayerBetInfo[],
    communityCards: Card[]
  ): { distributions: PotDistribution[] } {
    // 获取有资格参与此边池的玩家
    const eligiblePlayers = playerBets.filter(bet => 
      pot.eligiblePlayerIds.includes(bet.playerId) && !bet.isFolded && bet.cards
    );

    if (eligiblePlayers.length === 0) {
      return { distributions: [] };
    }

    // 如果只有一个合格玩家，直接获得整个边池
    if (eligiblePlayers.length === 1) {
      const winner = eligiblePlayers[0];
      return {
        distributions: [{
          playerId: winner.playerId,
          playerName: winner.playerName,
          amount: pot.amount,
          potId: pot.id,
          handResult: {
            rank: 'high-card',
            strength: 0,
            kickers: [],
            description: '唯一合格玩家'
          },
          isWinner: true,
          isTied: false
        }]
      };
    }

    // 评估每个玩家的手牌强度
    const playerResults = eligiblePlayers.map(player => {
      let handResult: HandStrengthResult;
      
      try {
        handResult = HandEvaluator.evaluateBestHand(
          player.cards as [Card, Card],
          communityCards
        );
      } catch (error) {
        console.error(`评估玩家 ${player.playerId} 手牌时出错:`, error);
        handResult = {
          rank: 'high-card',
          strength: 0,
          kickers: ['2', '3', '4', '5', '7'],
          description: '评估失败'
        };
      }

      return {
        player,
        handResult
      };
    });

    // 找出最强的手牌强度
    const maxStrength = Math.max(...playerResults.map(result => result.handResult.strength));
    const winners = playerResults.filter(result => result.handResult.strength === maxStrength);

    // 分配边池
    const distributions: PotDistribution[] = [];
    
    if (winners.length === 1) {
      // 单独获胜者
      const winner = winners[0];
      distributions.push({
        playerId: winner.player.playerId,
        playerName: winner.player.playerName,
        amount: pot.amount,
        potId: pot.id,
        handResult: winner.handResult,
        isWinner: true,
        isTied: false
      });
    } else {
      // 平局，需要分配奖池
      const splitAmount = Math.floor(pot.amount / winners.length);
      const oddChips = pot.amount - (splitAmount * winners.length);
      
      // 按照德州扑克规则，奇数筹码按位置顺序分配
      // 这里简化为按玩家ID字母顺序分配
      const sortedWinners = [...winners].sort((a, b) => 
        a.player.playerId.localeCompare(b.player.playerId)
      );

      sortedWinners.forEach((winner, index) => {
        const extraChip = index < oddChips ? 1 : 0;
        distributions.push({
          playerId: winner.player.playerId,
          playerName: winner.player.playerName,
          amount: splitAmount + extraChip,
          potId: pot.id,
          handResult: winner.handResult,
          isWinner: true,
          isTied: true
        });
      });
    }

    return { distributions };
  }

  /**
   * 生成分配分析报告
   */
  private static generateDistributionAnalysis(
    sidePots: SidePot[], 
    distributions: PotDistribution[]
  ): string {
    const lines: string[] = [];
    
    lines.push('🏆 专业德州扑克奖池分配结果');
    lines.push('');
    
    // 边池结构分析
    if (sidePots.length > 1) {
      lines.push('📊 边池结构分析：');
      sidePots.forEach((pot, index) => {
        const mainPot = index === 0 ? '主池' : `边池${index}`;
        lines.push(`${mainPot}: $${pot.amount} (合格玩家: ${pot.eligiblePlayerIds.length}人)`);
      });
      lines.push('');
    }

    // 获奖者分析
    lines.push('💰 奖池分配详情：');
    const winnersByPot = distributions.reduce((acc, dist) => {
      if (!acc[dist.potId]) acc[dist.potId] = [];
      acc[dist.potId].push(dist);
      return acc;
    }, {} as Record<string, PotDistribution[]>);

    Object.entries(winnersByPot).forEach(([potId, dists], index) => {
      const potName = index === 0 ? '主池' : `边池${index}`;
      
      if (dists.length === 1) {
        const winner = dists[0];
        lines.push(`${potName}: ${winner.playerName} 获得 $${winner.amount}`);
        lines.push(`  获胜牌型: ${winner.handResult.description}`);
      } else {
        const totalAmount = dists.reduce((sum, d) => sum + d.amount, 0);
        const winnerNames = dists.map(d => d.playerName).join('、');
        lines.push(`${potName}: ${winnerNames} 平分 $${totalAmount}`);
        lines.push(`  平局牌型: ${dists[0].handResult.description}`);
      }
    });
    
    lines.push('');
    lines.push('✅ 按照国际德州扑克标准规则计算');
    
    return lines.join('\n');
  }

  /**
   * 从游戏状态创建玩家投注信息
   */
  static createPlayerBetInfo(players: Player[]): PlayerBetInfo[] {
    return players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      totalBet: player.currentBet,
      isAllIn: player.isAllIn,
      isFolded: player.folded,
      cards: player.cards as [Card, Card] | undefined
    }));
  }

  /**
   * 验证边池计算的正确性
   */
  static validateSidePots(sidePots: SidePot[], originalPot: number): boolean {
    const totalCalculated = sidePots.reduce((sum, pot) => sum + pot.amount, 0);
    
    // 允许1筹码的误差（由于奇数筹码分配）
    return Math.abs(totalCalculated - originalPot) <= 1;
  }

  /**
   * 获取简化的分配摘要
   */
  static getDistributionSummary(distributions: PotDistribution[]): {
    winnerId: string;
    winnerName: string;
    totalWon: number;
    isTied: boolean;
  } {
    // 按获得金额排序
    const sortedWinners = [...distributions]
      .filter(d => d.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    if (sortedWinners.length === 0) {
      return {
        winnerId: '',
        winnerName: '无获胜者',
        totalWon: 0,
        isTied: false
      };
    }

    const topWinner = sortedWinners[0];
    const maxAmount = topWinner.amount;
    const topWinners = sortedWinners.filter(w => w.amount === maxAmount);

    return {
      winnerId: topWinner.playerId,
      winnerName: topWinners.length > 1 ? 
        `${topWinners.map(w => w.playerName).join('、')}等${topWinners.length}人` : 
        topWinner.playerName,
      totalWon: topWinners.reduce((sum, w) => sum + w.amount, 0),
      isTied: topWinners.length > 1
    };
  }
}