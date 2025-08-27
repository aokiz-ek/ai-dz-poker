/**
 * 德州扑克手牌评估算法全面测试
 * 验证所有牌型判断的正确性
 */
import { StandardPokerEvaluator, PokerHandRank } from '@/lib/standard-poker-evaluator'
import { PokerHandComparator } from '@/lib/poker-hand-comparator'
import { Card } from '@/types/poker'

interface TestCase {
  name: string
  playerCards: [Card, Card]
  communityCards: Card[]
  expectedRank: PokerHandRank
  expectedDescription: string
  expectedPrimaryValue?: number
}

interface ComparisonTestCase {
  name: string
  player1: {
    cards: [Card, Card]
    community: Card[]
  }
  player2: {
    cards: [Card, Card] 
    community: Card[]
  }
  expectedWinner: 1 | 2 | 0  // 1=player1胜, 2=player2胜, 0=平局
  description: string
}

/**
 * 创建牌的便捷函数
 */
function card(rank: string, suit: string): Card {
  return { 
    rank: rank as any, 
    suit: suit as 'hearts' | 'diamonds' | 'clubs' | 'spades'
  }
}

/**
 * 基本牌型测试案例
 */
const basicHandTests: TestCase[] = [
  // 皇家同花顺
  {
    name: "皇家同花顺 - 黑桃",
    playerCards: [card('A', 'spades'), card('K', 'spades')],
    communityCards: [card('Q', 'spades'), card('J', 'spades'), card('10', 'spades'), card('2', 'hearts'), card('3', 'clubs')],
    expectedRank: PokerHandRank.ROYAL_FLUSH,
    expectedDescription: "皇家同花顺"
  },
  
  // 同花顺
  {
    name: "同花顺 - K高",
    playerCards: [card('K', 'hearts'), card('Q', 'hearts')],
    communityCards: [card('J', 'hearts'), card('10', 'hearts'), card('9', 'hearts'), card('2', 'clubs'), card('3', 'spades')],
    expectedRank: PokerHandRank.STRAIGHT_FLUSH,
    expectedDescription: "K高同花顺"
  },
  
  // 轮子同花顺 (A-2-3-4-5)
  {
    name: "轮子同花顺 - 5高",
    playerCards: [card('A', 'diamonds'), card('2', 'diamonds')],
    communityCards: [card('3', 'diamonds'), card('4', 'diamonds'), card('5', 'diamonds'), card('K', 'hearts'), card('Q', 'spades')],
    expectedRank: PokerHandRank.STRAIGHT_FLUSH,
    expectedDescription: "5高同花顺"
  },
  
  // 四条
  {
    name: "四条A",
    playerCards: [card('A', 'spades'), card('A', 'hearts')],
    communityCards: [card('A', 'diamonds'), card('A', 'clubs'), card('K', 'spades'), card('2', 'hearts'), card('3', 'clubs')],
    expectedRank: PokerHandRank.FOUR_OF_KIND,
    expectedDescription: "四条A"
  },
  
  // 葫芦
  {
    name: "葫芦 - K满A",
    playerCards: [card('K', 'spades'), card('K', 'hearts')],
    communityCards: [card('K', 'diamonds'), card('A', 'clubs'), card('A', 'spades'), card('2', 'hearts'), card('3', 'clubs')],
    expectedRank: PokerHandRank.FULL_HOUSE,
    expectedDescription: "K满A"
  },
  
  // 同花
  {
    name: "同花 - A高红桃",
    playerCards: [card('A', 'hearts'), card('J', 'hearts')],
    communityCards: [card('9', 'hearts'), card('7', 'hearts'), card('3', 'hearts'), card('K', 'spades'), card('Q', 'diamonds')],
    expectedRank: PokerHandRank.FLUSH,
    expectedDescription: "A高同花"
  },
  
  // 顺子
  {
    name: "顺子 - A高",
    playerCards: [card('A', 'spades'), card('K', 'hearts')],
    communityCards: [card('Q', 'diamonds'), card('J', 'clubs'), card('10', 'hearts'), card('2', 'spades'), card('3', 'clubs')],
    expectedRank: PokerHandRank.STRAIGHT,
    expectedDescription: "A高顺子"
  },
  
  // 轮子顺子 (A-2-3-4-5)
  {
    name: "轮子顺子 - 5高",
    playerCards: [card('A', 'spades'), card('2', 'hearts')],
    communityCards: [card('3', 'diamonds'), card('4', 'clubs'), card('5', 'hearts'), card('K', 'spades'), card('Q', 'clubs')],
    expectedRank: PokerHandRank.STRAIGHT,
    expectedDescription: "5高顺子"
  },
  
  // 三条
  {
    name: "三条Q",
    playerCards: [card('Q', 'spades'), card('Q', 'hearts')],
    communityCards: [card('Q', 'diamonds'), card('A', 'clubs'), card('K', 'hearts'), card('2', 'spades'), card('3', 'clubs')],
    expectedRank: PokerHandRank.THREE_OF_KIND,
    expectedDescription: "三条Q"
  },
  
  // 两对
  {
    name: "两对 - AA KK",
    playerCards: [card('A', 'spades'), card('A', 'hearts')],
    communityCards: [card('K', 'diamonds'), card('K', 'clubs'), card('Q', 'hearts'), card('2', 'spades'), card('3', 'clubs')],
    expectedRank: PokerHandRank.TWO_PAIR,
    expectedDescription: "A和K两对"
  },
  
  // 一对
  {
    name: "一对A",
    playerCards: [card('A', 'spades'), card('K', 'hearts')],
    communityCards: [card('A', 'diamonds'), card('Q', 'clubs'), card('J', 'hearts'), card('2', 'spades'), card('3', 'clubs')],
    expectedRank: PokerHandRank.ONE_PAIR,
    expectedDescription: "一对A"
  },
  
  // 高牌
  {
    name: "高牌A",
    playerCards: [card('A', 'spades'), card('K', 'hearts')],
    communityCards: [card('Q', 'diamonds'), card('J', 'clubs'), card('9', 'hearts'), card('2', 'spades'), card('3', 'clubs')],
    expectedRank: PokerHandRank.HIGH_CARD,
    expectedDescription: "A高牌"
  }
]

/**
 * 牌力比较测试案例  
 */
const comparisonTests: ComparisonTestCase[] = [
  // 基本牌型强弱
  {
    name: "一对A vs A高牌",
    player1: {
      cards: [card('A', 'clubs'), card('8', 'spades')], // 一对A
      community: [card('A', 'spades'), card('Q', 'hearts'), card('J', 'diamonds'), card('10', 'clubs'), card('9', 'hearts')]
    },
    player2: {
      cards: [card('4', 'diamonds'), card('9', 'spades')], // A高牌  
      community: [card('A', 'spades'), card('Q', 'hearts'), card('J', 'diamonds'), card('10', 'clubs'), card('9', 'hearts')]
    },
    expectedWinner: 1,
    description: "一对应该胜过高牌"
  },
  
  {
    name: "两对 vs 一对", 
    player1: {
      cards: [card('K', 'hearts'), card('K', 'diamonds')], // 两对 KK QQ
      community: [card('Q', 'spades'), card('Q', 'hearts'), card('J', 'diamonds'), card('10', 'clubs'), card('9', 'hearts')]
    },
    player2: {
      cards: [card('A', 'clubs'), card('A', 'spades')], // 一对A
      community: [card('Q', 'spades'), card('Q', 'hearts'), card('J', 'diamonds'), card('10', 'clubs'), card('9', 'hearts')]
    },
    expectedWinner: 1,
    description: "两对应该胜过一对，即使一对更大"
  },
  
  // 同牌型大小比较
  {
    name: "一对A vs 一对K",
    player1: {
      cards: [card('A', 'spades'), card('2', 'hearts')], // 一对A
      community: [card('A', 'clubs'), card('Q', 'diamonds'), card('J', 'hearts'), card('10', 'spades'), card('9', 'clubs')]
    },
    player2: {
      cards: [card('K', 'hearts'), card('3', 'diamonds')], // 一对K
      community: [card('A', 'clubs'), card('K', 'spades'), card('Q', 'diamonds'), card('J', 'hearts'), card('10', 'spades')]
    },
    expectedWinner: 1,
    description: "一对A应该胜过一对K"
  },
  
  // 踢脚牌比较
  {
    name: "一对A - 踢脚牌比较",
    player1: {
      cards: [card('A', 'spades'), card('K', 'hearts')], // 一对A，踢脚K
      community: [card('A', 'clubs'), card('Q', 'diamonds'), card('J', 'hearts'), card('10', 'spades'), card('9', 'clubs')]
    },
    player2: {
      cards: [card('A', 'hearts'), card('2', 'diamonds')], // 一对A，踢脚Q
      community: [card('A', 'clubs'), card('Q', 'diamonds'), card('J', 'hearts'), card('10', 'spades'), card('9', 'clubs')]
    },
    expectedWinner: 1,
    description: "相同对子，踢脚牌K应该胜过踢脚牌Q"
  },
  
  // 顺子比较
  {
    name: "A高顺子 vs K高顺子",
    player1: {
      cards: [card('A', 'spades'), card('K', 'hearts')], // A-K-Q-J-10
      community: [card('Q', 'diamonds'), card('J', 'clubs'), card('10', 'hearts'), card('2', 'spades'), card('3', 'diamonds')]
    },
    player2: {
      cards: [card('K', 'diamonds'), card('Q', 'spades')], // K-Q-J-10-9
      community: [card('Q', 'diamonds'), card('J', 'clubs'), card('10', 'hearts'), card('9', 'hearts'), card('3', 'diamonds')]
    },
    expectedWinner: 1,
    description: "A高顺子应该胜过K高顺子"
  },
  
  // 轮子顺子 vs 高顺子
  {
    name: "6高顺子 vs 轮子顺子",
    player1: {
      cards: [card('6', 'spades'), card('2', 'hearts')], // 6-5-4-3-2
      community: [card('5', 'diamonds'), card('4', 'clubs'), card('3', 'hearts'), card('2', 'spades'), card('A', 'diamonds')]
    },
    player2: {
      cards: [card('A', 'hearts'), card('4', 'spades')], // A-2-3-4-5 (轮子)
      community: [card('5', 'diamonds'), card('4', 'clubs'), card('3', 'hearts'), card('2', 'spades'), card('A', 'diamonds')]
    },
    expectedWinner: 1,
    description: "6高顺子应该胜过5高轮子顺子"
  },
  
  // 同花比较
  {
    name: "同花 - A高 vs K高",
    player1: {
      cards: [card('A', 'hearts'), card('9', 'hearts')], // A-J-10-9-3 红桃
      community: [card('J', 'hearts'), card('10', 'hearts'), card('3', 'hearts'), card('K', 'spades'), card('Q', 'diamonds')]
    },
    player2: {
      cards: [card('K', 'hearts'), card('8', 'hearts')], // K-J-10-8-3 红桃
      community: [card('J', 'hearts'), card('10', 'hearts'), card('3', 'hearts'), card('K', 'spades'), card('Q', 'diamonds')]
    },
    expectedWinner: 1,
    description: "A高同花应该胜过K高同花"
  },
  
  // 平局情况
  {
    name: "完全相同的手牌 - 平局",
    player1: {
      cards: [card('A', 'spades'), card('2', 'hearts')], // 公共牌组成最佳手牌
      community: [card('K', 'diamonds'), card('K', 'clubs'), card('K', 'hearts'), card('Q', 'spades'), card('J', 'diamonds')]
    },
    player2: {
      cards: [card('3', 'diamonds'), card('4', 'clubs')], // 公共牌组成最佳手牌
      community: [card('K', 'diamonds'), card('K', 'clubs'), card('K', 'hearts'), card('Q', 'spades'), card('J', 'diamonds')]
    },
    expectedWinner: 0,
    description: "相同的三条K应该平局"
  }
]

/**
 * 复杂的7选5测试案例
 */
const complex7Choose5Tests: ComparisonTestCase[] = [
  {
    name: "7选5 - 隐藏的更好组合",
    player1: {
      cards: [card('2', 'spades'), card('3', 'hearts')], // 实际最佳：A-K-Q-J-10顺子
      community: [card('A', 'diamonds'), card('K', 'clubs'), card('Q', 'hearts'), card('J', 'spades'), card('10', 'diamonds')]
    },
    player2: {
      cards: [card('A', 'clubs'), card('K', 'spades')], // 实际最佳：一对A，踢脚K-Q-J-10
      community: [card('A', 'diamonds'), card('K', 'clubs'), card('Q', 'hearts'), card('J', 'spades'), card('9', 'hearts')]
    },
    expectedWinner: 1,
    description: "顺子应该胜过一对，即使底牌不参与最佳组合"
  }
]

/**
 * 执行单个手牌测试
 */
function runBasicHandTest(test: TestCase): boolean {
  try {
    console.log(`\n🧪 测试: ${test.name}`)
    
    const evaluation = StandardPokerEvaluator.evaluateBestHand(
      'test-player',
      '测试玩家',
      test.playerCards,
      test.communityCards
    )
    
    const success = evaluation.handRank === test.expectedRank
    
    console.log(`   底牌: ${test.playerCards.map(c => `${c.rank}${c.suit[0]}`).join(' ')}`)
    console.log(`   公共牌: ${test.communityCards.map(c => `${c.rank}${c.suit[0]}`).join(' ')}`)
    console.log(`   期望: ${test.expectedDescription} (${test.expectedRank})`)
    console.log(`   实际: ${evaluation.readableDescription} (${evaluation.handRank})`)
    console.log(`   结果: ${success ? '✅ 通过' : '❌ 失败'}`)
    
    if (!success) {
      console.log(`   🔍 详细信息:`)
      console.log(`      - 手牌强度: ${evaluation.handStrength}`)
      console.log(`      - 主要值: ${evaluation.primaryValue}`)
      console.log(`      - 踢脚牌: ${evaluation.kickers}`)
    }
    
    return success
  } catch (error) {
    console.log(`   ❌ 错误: ${error}`)
    return false
  }
}

/**
 * 执行手牌比较测试
 */
function runComparisonTest(test: ComparisonTestCase): boolean {
  try {
    console.log(`\n🆚 比较测试: ${test.name}`)
    
    const eval1 = StandardPokerEvaluator.evaluateBestHand(
      'player1',
      '玩家1',
      test.player1.cards,
      test.player1.community
    )
    
    const eval2 = StandardPokerEvaluator.evaluateBestHand(
      'player2', 
      '玩家2',
      test.player2.cards,
      test.player2.community
    )
    
    const comparison = PokerHandComparator.compareHands(eval1, eval2)
    let actualWinner: 0 | 1 | 2
    
    if (comparison > 0) {
      actualWinner = 1  // player1 胜
    } else if (comparison < 0) {
      actualWinner = 2  // player2 胜  
    } else {
      actualWinner = 0  // 平局
    }
    
    const success = actualWinner === test.expectedWinner
    
    console.log(`   玩家1: ${test.player1.cards.map(c => `${c.rank}${c.suit[0]}`).join(' ')} → ${eval1.readableDescription} (强度: ${eval1.handStrength})`)
    console.log(`   玩家2: ${test.player2.cards.map(c => `${c.rank}${c.suit[0]}`).join(' ')} → ${eval2.readableDescription} (强度: ${eval2.handStrength})`)
    console.log(`   公共牌: ${test.player1.community.map(c => `${c.rank}${c.suit[0]}`).join(' ')}`)
    console.log(`   期望获胜者: ${test.expectedWinner === 0 ? '平局' : `玩家${test.expectedWinner}`}`)
    console.log(`   实际获胜者: ${actualWinner === 0 ? '平局' : `玩家${actualWinner}`}`)
    console.log(`   比较值: ${comparison}`)
    console.log(`   结果: ${success ? '✅ 通过' : '❌ 失败'}`)
    console.log(`   说明: ${test.description}`)
    
    return success
  } catch (error) {
    console.log(`   ❌ 错误: ${error}`)
    return false
  }
}

/**
 * 运行所有测试
 */
export function runAllPokerEvaluatorTests(): void {
  console.log('🚀 开始德州扑克手牌评估算法全面测试')
  console.log('=' .repeat(60))
  
  let totalTests = 0
  let passedTests = 0
  
  // 1. 基本手牌测试
  console.log('\n📋 第一部分：基本手牌类型测试')
  console.log('-' .repeat(40))
  
  for (const test of basicHandTests) {
    totalTests++
    if (runBasicHandTest(test)) {
      passedTests++
    }
  }
  
  // 2. 手牌比较测试  
  console.log('\n⚔️ 第二部分：手牌强弱比较测试')
  console.log('-' .repeat(40))
  
  for (const test of comparisonTests) {
    totalTests++
    if (runComparisonTest(test)) {
      passedTests++
    }
  }
  
  // 3. 复杂7选5测试
  console.log('\n🧠 第三部分：复杂7选5组合测试')  
  console.log('-' .repeat(40))
  
  for (const test of complex7Choose5Tests) {
    totalTests++
    if (runComparisonTest(test)) {
      passedTests++
    }
  }
  
  // 测试总结
  console.log('\n📊 测试总结')
  console.log('=' .repeat(60))
  console.log(`总测试数: ${totalTests}`)
  console.log(`通过数: ${passedTests}`)
  console.log(`失败数: ${totalTests - passedTests}`)
  console.log(`成功率: ${Math.round((passedTests / totalTests) * 100)}%`)
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！手牌评估算法工作正常。')
  } else {
    console.log('⚠️  有测试失败，需要检查算法实现。')
  }
}

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
  runAllPokerEvaluatorTests()
}