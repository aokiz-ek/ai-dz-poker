import { Card, Rank, Suit } from '@/types/poker';

// 将牌转换为字符串表示
export function cardToString(card: Card): string {
  const suitLetters = {
    hearts: 'h',
    diamonds: 'd',
    clubs: 'c',
    spades: 's'
  };
  return `${card.rank}${suitLetters[card.suit]}`;
}

// 将字符串表示转换为Card对象
export function stringToCard(cardString: string): Card {
  if (!cardString || cardString.length < 2) {
    throw new Error(`Invalid card string: ${cardString}`);
  }
  
  const rank = cardString.slice(0, -1) as Rank;
  const suitLetter = cardString.slice(-1).toLowerCase();
  
  const suitMap: { [key: string]: Suit } = {
    'h': 'hearts',
    'd': 'diamonds', 
    'c': 'clubs',
    's': 'spades'
  };
  
  const suit = suitMap[suitLetter];
  if (!suit) {
    throw new Error(`Invalid suit letter: ${suitLetter}`);
  }
  
  return { rank, suit };
}

// 将牌面转换为数值以便比较
export function rankValue(rank: Rank): number {
  const values = {
    'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
    '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
  };
  return values[rank];
}

// 生成手牌代码 (例如 "AA", "AKs", "AKo")
export function getHandCode(card1: Card, card2: Card): string {
  const rank1 = card1.rank;
  const rank2 = card2.rank;
  const suited = card1.suit === card2.suit;
  
  // 按数值排序牌面（高的在前）
  const val1 = rankValue(rank1);
  const val2 = rankValue(rank2);
  
  if (val1 === val2) {
    // 口袋对子
    return `${rank1}${rank2}`;
  }
  
  // 不同牌面
  const highRank = val1 > val2 ? rank1 : rank2;
  const lowRank = val1 > val2 ? rank2 : rank1;
  
  return `${highRank}${lowRank}${suited ? 's' : 'o'}`;
}

// 按顺序获取所有可能的起手牌
export function getAllStartingHands(): string[] {
  const ranks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  const hands: string[] = [];
  
  for (let i = 0; i < ranks.length; i++) {
    for (let j = i; j < ranks.length; j++) {
      if (i === j) {
        // 口袋对子
        hands.push(`${ranks[i]}${ranks[j]}`);
      } else {
        // 同花和杂色
        hands.push(`${ranks[i]}${ranks[j]}s`);
        hands.push(`${ranks[i]}${ranks[j]}o`);
      }
    }
  }
  
  return hands;
}

// 格式化积分量显示
export function formatStack(amount: number): string {
  if (amount >= 1000000) {
    return `${Math.round(amount / 1000000)}M`;
  }
  if (amount >= 1000) {
    return `${Math.round(amount / 1000)}K`;
  }
  return Math.round(amount).toString();
}

// 格式化彩池大小显示
export function formatPot(amount: number): string {
  return formatStack(amount);
}

// 计算底池赔率
export function calculatePotOdds(potSize: number, betSize: number): number {
  return betSize / (potSize + betSize);
}

// 简单手牌强度估算（复杂评估的占位符）
export function estimateHandStrength(holeCards: [Card, Card], communityCards: Card[]): number {
  // 这是简化版本 - 在真实实现中你会使用
  // 专业的手牌评估器如 pokersolver 或类似库
  const handCode = getHandCode(holeCards[0], holeCards[1]);
  
  // 基础翻前手牌强度估算
  const pairStrength = {
    'AA': 0.95, 'KK': 0.90, 'QQ': 0.85, 'JJ': 0.80, '1010': 0.75,
    '99': 0.70, '88': 0.65, '77': 0.60, '66': 0.55, '55': 0.50,
    '44': 0.45, '33': 0.40, '22': 0.35
  };
  
  if (handCode in pairStrength) {
    return pairStrength[handCode as keyof typeof pairStrength];
  }
  
  // 简化的同花/杂色评估
  if (handCode.endsWith('s')) {
    return 0.60; // 同花牌获得加成
  }
  
  return 0.40; // 基础杂色强度
}