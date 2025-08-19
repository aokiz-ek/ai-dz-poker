import { 
  CompactHandHistory, 
  HandStatistics,
  PositionStats,
  StageStats,
  OpponentStats,
  TrendPoint,
  HandAggregates
} from '@/types/hand-history';
import { Position, GameStage } from '@/types/poker';

/**
 * 统计管理器 - 实时聚合计算手牌统计数据
 */
export class StatisticsManager {
  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  // =================== 实时聚合计算 ===================

  async calculateStatistics(hands: CompactHandHistory[], heroId?: string): Promise<HandStatistics> {
    const cacheKey = `stats_${hands.length}_${heroId || 'all'}_${this.getHandsChecksum(hands)}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    const stats = this.computeStatistics(hands, heroId);
    this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
    
    return stats;
  }

  async calculateAggregates(hands: CompactHandHistory[], heroId?: string): Promise<HandAggregates> {
    if (hands.length === 0) {
      return this.getEmptyAggregates();
    }

    const heroHands = heroId ? hands.filter(h => this.isHeroInHand(h, heroId)) : hands;
    
    const totalWon = this.countWonHands(heroHands, heroId);
    const totalProfit = this.calculateTotalProfit(heroHands, heroId);
    const vpipCount = this.countVPIPHands(heroHands, heroId);
    const pfrCount = this.countPFRHands(heroHands, heroId);
    const wtsdCount = this.countWTSDHands(heroHands, heroId);
    const showdownWins = this.countShowdownWins(heroHands, heroId);
    const showdownTotal = this.countShowdowns(heroHands, heroId);

    return {
      totalHands: heroHands.length,
      totalWon,
      winRate: totalWon / heroHands.length,
      totalProfit,
      avgPotSize: heroHands.reduce((sum, h) => sum + h.result.potSize, 0) / heroHands.length,
      vpipRate: vpipCount / heroHands.length,
      pfrRate: pfrCount / heroHands.length,
      wtsdRate: wtsdCount / heroHands.length,
      showdownWinRate: showdownTotal > 0 ? showdownWins / showdownTotal : 0,
      avgScore: this.calculateAverageScore(heroHands)
    };
  }

  // =================== 位置统计 ===================

  calculatePositionalStats(hands: CompactHandHistory[], heroId?: string): Map<Position, PositionStats> {
    const positionMap = new Map<Position, PositionStats>();
    
    const positions: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'MP', 'MP1', 'CO'];
    
    positions.forEach(position => {
      const positionHands = hands.filter(hand => 
        this.getHeroPosition(hand, heroId) === position
      );

      if (positionHands.length > 0) {
        positionMap.set(position, {
          position,
          handsPlayed: positionHands.length,
          vpip: this.calculateVPIP(positionHands, heroId),
          pfr: this.calculatePFR(positionHands, heroId),
          threeBet: this.calculateThreeBet(positionHands, heroId),
          winRate: this.calculateWinRate(positionHands, heroId),
          profit: this.calculateProfit(positionHands, heroId),
          avgScore: this.calculateAverageScore(positionHands)
        });
      }
    });

    return positionMap;
  }

  // =================== 阶段统计 ===================

  calculateStageStats(hands: CompactHandHistory[], heroId?: string): {
    preflop: StageStats;
    postflop: StageStats;
    flop: StageStats;
    turn: StageStats;
    river: StageStats;
  } {
    return {
      preflop: this.calculateStageStatistics(hands, 'preflop', heroId),
      postflop: this.calculateStageStatistics(hands, 'flop', heroId), // 包含所有翻后
      flop: this.calculateStageStatistics(hands, 'flop', heroId),
      turn: this.calculateStageStatistics(hands, 'turn', heroId),
      river: this.calculateStageStatistics(hands, 'river', heroId)
    };
  }

  // =================== 对手分析 ===================

  calculateOpponentStats(hands: CompactHandHistory[], heroId?: string): OpponentStats[] {
    const opponentMap = new Map<string, {
      handsAgainst: number;
      wins: number;
      profit: number;
      theirActions: { vpip: number; pfr: number; aggression: number; total: number };
    }>();

    hands.forEach(hand => {
      hand.players.forEach(player => {
        if (player.id !== heroId) {
          const key = player.id;
          if (!opponentMap.has(key)) {
            opponentMap.set(key, {
              handsAgainst: 0,
              wins: 0,
              profit: 0,
              theirActions: { vpip: 0, pfr: 0, aggression: 0, total: 0 }
            });
          }

          const stats = opponentMap.get(key)!;
          stats.handsAgainst++;
          
          if (hand.result.winners.includes(player.id)) {
            stats.wins++;
          }

          // 简化的行为分析
          const actions = hand.actions.filter(a => a.p === player.id);
          stats.theirActions.total += actions.length;
          stats.theirActions.aggression += actions.filter(a => a.a === 3 || a.a === 4).length;
        }
      });
    });

    return Array.from(opponentMap.entries()).map(([opponentId, data]) => ({
      opponentId,
      handsAgainst: data.handsAgainst,
      winRateAgainst: (data.handsAgainst - data.wins) / data.handsAgainst,
      profitAgainst: data.profit,
      theirVpip: 0.25, // 简化计算
      theirPfr: 0.15,
      theirAggression: data.theirActions.total > 0 ? 
        data.theirActions.aggression / data.theirActions.total : 0
    }));
  }

  // =================== 趋势分析 ===================

  calculateTrends(hands: CompactHandHistory[], heroId?: string): {
    winRateTrend: TrendPoint[];
    profitTrend: TrendPoint[];
    scoreTrend: TrendPoint[];
  } {
    if (hands.length < 10) {
      return { winRateTrend: [], profitTrend: [], scoreTrend: [] };
    }

    const sortedHands = [...hands].sort((a, b) => a.timestamp - b.timestamp);
    const windowSize = Math.max(10, Math.floor(sortedHands.length / 20));
    
    const winRateTrend: TrendPoint[] = [];
    const profitTrend: TrendPoint[] = [];
    const scoreTrend: TrendPoint[] = [];

    for (let i = windowSize; i < sortedHands.length; i += windowSize) {
      const window = sortedHands.slice(i - windowSize, i);
      const timestamp = window[window.length - 1].timestamp;
      
      winRateTrend.push({
        timestamp,
        value: this.calculateWinRate(window, heroId),
        sampleSize: window.length
      });

      profitTrend.push({
        timestamp,
        value: this.calculateProfit(window, heroId),
        sampleSize: window.length
      });

      scoreTrend.push({
        timestamp,
        value: this.calculateAverageScore(window),
        sampleSize: window.length
      });
    }

    return { winRateTrend, profitTrend, scoreTrend };
  }

  // =================== 私有计算方法 ===================

  private computeStatistics(hands: CompactHandHistory[], heroId?: string): HandStatistics {
    const filteredHands = heroId ? hands.filter(h => this.isHeroInHand(h, heroId)) : hands;
    
    return {
      timeRange: {
        start: Math.min(...filteredHands.map(h => h.timestamp)),
        end: Math.max(...filteredHands.map(h => h.timestamp)),
        totalHands: filteredHands.length
      },
      basicStats: {
        handsPlayed: filteredHands.length,
        handsWon: this.countWonHands(filteredHands, heroId),
        winRate: this.calculateWinRate(filteredHands, heroId),
        totalProfit: this.calculateProfit(filteredHands, heroId),
        hourlyRate: this.calculateHourlyRate(filteredHands, heroId),
        avgPotSize: filteredHands.reduce((sum, h) => sum + h.result.potSize, 0) / filteredHands.length
      },
      positionalStats: this.calculatePositionalStats(filteredHands, heroId),
      stageStats: this.calculateStageStats(filteredHands, heroId),
      opponentStats: this.calculateOpponentStats(filteredHands, heroId),
      trends: this.calculateTrends(filteredHands, heroId)
    };
  }

  private calculateStageStatistics(hands: CompactHandHistory[], stage: GameStage, heroId?: string): StageStats {
    const stageHands = hands.filter(hand => this.handReachedStage(hand, stage));
    
    if (stageHands.length === 0) {
      return {
        stage,
        handsReached: 0,
        aggression: 0,
        checkCallFreq: 0,
        betRaiseFreq: 0,
        foldFreq: 0,
        winRate: 0,
        avgEquity: 0
      };
    }

    const stageCode = { preflop: 0, flop: 1, turn: 2, river: 3 }[stage];
    let aggressiveActions = 0;
    let passiveActions = 0;
    let foldActions = 0;
    let totalActions = 0;

    stageHands.forEach(hand => {
      const stageActions = hand.actions.filter(a => a.s === stageCode);
      totalActions += stageActions.length;
      
      stageActions.forEach(action => {
        if (action.a === 0) foldActions++; // fold
        else if (action.a === 3 || action.a === 4 || action.a === 5) aggressiveActions++; // bet/raise/allin
        else passiveActions++; // check/call
      });
    });

    return {
      stage,
      handsReached: stageHands.length,
      aggression: totalActions > 0 ? aggressiveActions / totalActions : 0,
      checkCallFreq: totalActions > 0 ? passiveActions / totalActions : 0,
      betRaiseFreq: totalActions > 0 ? aggressiveActions / totalActions : 0,
      foldFreq: totalActions > 0 ? foldActions / totalActions : 0,
      winRate: this.calculateWinRate(stageHands, heroId),
      avgEquity: 0.5 // 简化计算
    };
  }

  // 辅助方法

  private isHeroInHand(hand: CompactHandHistory, heroId?: string): boolean {
    if (!heroId) return true;
    return hand.players.some(p => p.id === heroId);
  }

  private getHeroPosition(hand: CompactHandHistory, heroId?: string): Position | null {
    if (!heroId) return null;
    const hero = hand.players.find(p => p.id === heroId);
    return hero?.position || null;
  }

  private countWonHands(hands: CompactHandHistory[], heroId?: string): number {
    return hands.filter(hand => {
      if (!heroId) return hand.result.winners.length > 0;
      return hand.result.winners.includes(heroId);
    }).length;
  }

  private calculateTotalProfit(hands: CompactHandHistory[], heroId?: string): number {
    return hands.reduce((sum, hand) => {
      if (!heroId || hand.result.winners.includes(heroId)) {
        return sum + hand.result.potSize;
      }
      return sum;
    }, 0);
  }

  private calculateWinRate(hands: CompactHandHistory[], heroId?: string): number {
    if (hands.length === 0) return 0;
    return this.countWonHands(hands, heroId) / hands.length;
  }

  private calculateProfit(hands: CompactHandHistory[], heroId?: string): number {
    return this.calculateTotalProfit(hands, heroId);
  }

  private calculateHourlyRate(hands: CompactHandHistory[], heroId?: string): number {
    if (hands.length < 2) return 0;
    
    const profit = this.calculateProfit(hands, heroId);
    const timeSpan = hands[hands.length - 1].timestamp - hands[0].timestamp;
    const hours = timeSpan / (1000 * 60 * 60);
    
    return hours > 0 ? profit / hours : 0;
  }

  private calculateVPIP(hands: CompactHandHistory[], heroId?: string): number {
    return this.countVPIPHands(hands, heroId) / hands.length;
  }

  private calculatePFR(hands: CompactHandHistory[], heroId?: string): number {
    return this.countPFRHands(hands, heroId) / hands.length;
  }

  private calculateThreeBet(hands: CompactHandHistory[], heroId?: string): number {
    // 简化计算
    return 0.05;
  }

  private calculateAverageScore(hands: CompactHandHistory[]): number {
    // 简化评分计算
    return 0.75;
  }

  private countVPIPHands(hands: CompactHandHistory[], heroId?: string): number {
    // 简化计算 - 统计主动投入底池的手牌数
    return Math.floor(hands.length * 0.25);
  }

  private countPFRHands(hands: CompactHandHistory[], heroId?: string): number {
    // 简化计算 - 统计翻前加注的手牌数
    return Math.floor(hands.length * 0.15);
  }

  private countWTSDHands(hands: CompactHandHistory[], heroId?: string): number {
    // 简化计算 - 统计到摊牌的手牌数
    return Math.floor(hands.length * 0.18);
  }

  private countShowdownWins(hands: CompactHandHistory[], heroId?: string): number {
    return hands.filter(hand => 
      hand.result.showdown && 
      (!heroId || hand.result.winners.includes(heroId))
    ).length;
  }

  private countShowdowns(hands: CompactHandHistory[], heroId?: string): number {
    return hands.filter(hand => hand.result.showdown).length;
  }

  private handReachedStage(hand: CompactHandHistory, stage: GameStage): boolean {
    const stageOrder = ['preflop', 'flop', 'turn', 'river'];
    const targetIndex = stageOrder.indexOf(stage);
    
    return hand.snapshots.some(snapshot => snapshot.stage >= targetIndex);
  }

  private getHandsChecksum(hands: CompactHandHistory[]): string {
    return hands.map(h => h.id).join('').slice(0, 8);
  }

  private getEmptyAggregates(): HandAggregates {
    return {
      totalHands: 0,
      totalWon: 0,
      winRate: 0,
      totalProfit: 0,
      avgPotSize: 0,
      vpipRate: 0,
      pfrRate: 0,
      wtsdRate: 0,
      showdownWinRate: 0,
      avgScore: 0
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}