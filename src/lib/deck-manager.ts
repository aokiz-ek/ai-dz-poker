import { Card, Rank, Suit } from '@/types/poker';

/**
 * 专业牌组管理器 - 防止重复牌的严格发牌系统
 */
export class DeckManager {
  private availableCards: Card[] = [];
  private usedCards: Card[] = [];

  constructor() {
    this.initializeDeck();
  }

  /**
   * 初始化标准52张牌
   */
  private initializeDeck(): void {
    const ranks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
    const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
    
    this.availableCards = [];
    this.usedCards = [];
    
    for (const rank of ranks) {
      for (const suit of suits) {
        this.availableCards.push({ rank, suit });
      }
    }
    
    // 洗牌
    this.shuffleDeck();
  }

  /**
   * Fisher-Yates洗牌算法
   */
  private shuffleDeck(): void {
    for (let i = this.availableCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.availableCards[i], this.availableCards[j]] = [this.availableCards[j], this.availableCards[i]];
    }
  }

  /**
   * 发一张牌
   */
  dealCard(): Card {
    if (this.availableCards.length === 0) {
      throw new Error('牌组已空，无法发牌');
    }
    
    const card = this.availableCards.pop()!;
    this.usedCards.push(card);
    return card;
  }

  /**
   * 发两张手牌
   */
  dealHoleCards(): [Card, Card] {
    return [this.dealCard(), this.dealCard()];
  }

  /**
   * 发指定数量的牌
   */
  dealCards(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      cards.push(this.dealCard());
    }
    return cards;
  }

  /**
   * 检查是否有重复牌
   */
  validateNoDuplicates(): boolean {
    const cardStrings = this.usedCards.map(card => `${card.rank}${card.suit}`);
    const uniqueCards = new Set(cardStrings);
    
    if (cardStrings.length !== uniqueCards.size) {
      console.error('🚨 发现重复牌:', cardStrings);
      console.error('🚨 重复的牌:', cardStrings.filter((card, index) => 
        cardStrings.indexOf(card) !== index
      ));
      return false;
    }
    
    return true;
  }

  /**
   * 获取已使用的牌
   */
  getUsedCards(): Card[] {
    return [...this.usedCards];
  }

  /**
   * 获取剩余可用牌数
   */
  getRemainingCount(): number {
    return this.availableCards.length;
  }

  /**
   * 重置牌组
   */
  reset(): void {
    this.initializeDeck();
  }

  /**
   * 检查特定牌是否已被使用
   */
  isCardUsed(card: Card): boolean {
    return this.usedCards.some(usedCard => 
      usedCard.rank === card.rank && usedCard.suit === card.suit
    );
  }

  /**
   * 强制标记牌为已使用（用于处理预设场景）
   */
  markCardAsUsed(card: Card): boolean {
    if (this.isCardUsed(card)) {
      console.warn(`⚠️ 牌 ${card.rank}${card.suit} 已被使用`);
      return false;
    }
    
    // 从可用牌中移除
    const index = this.availableCards.findIndex(availCard => 
      availCard.rank === card.rank && availCard.suit === card.suit
    );
    
    if (index !== -1) {
      this.availableCards.splice(index, 1);
      this.usedCards.push(card);
      return true;
    }
    
    console.error(`❌ 牌 ${card.rank}${card.suit} 不在可用牌组中`);
    return false;
  }

  /**
   * 批量标记牌为已使用
   */
  markCardsAsUsed(cards: Card[]): boolean {
    let allSuccess = true;
    for (const card of cards) {
      if (!this.markCardAsUsed(card)) {
        allSuccess = false;
      }
    }
    return allSuccess;
  }

  /**
   * 调试信息
   */
  getDebugInfo(): {
    usedCount: number;
    remainingCount: number;
    usedCards: string[];
    hasDuplicates: boolean;
  } {
    return {
      usedCount: this.usedCards.length,
      remainingCount: this.availableCards.length,
      usedCards: this.usedCards.map(card => `${card.rank}${card.suit}`),
      hasDuplicates: !this.validateNoDuplicates()
    };
  }

  /**
   * 从字符串创建安全的发牌场景
   */
  static createSafeScenario(
    heroCardsStr: string[],
    communityCardsStr: string[],
    playerCount: number = 6
  ): {
    deck: DeckManager;
    heroCards: [Card, Card];
    communityCards: Card[];
    otherPlayerCards: [Card, Card][];
    isValid: boolean;
    errors: string[];
  } {
    const deck = new DeckManager();
    const errors: string[] = [];
    
    try {
      // 转换字符串为Card对象
      const heroCards = heroCardsStr.map(cardStr => {
        const rank = cardStr.slice(0, -1) as Rank;
        const suitLetter = cardStr.slice(-1).toLowerCase();
        const suitMap: { [key: string]: Suit } = {
          'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades'
        };
        return { rank, suit: suitMap[suitLetter] };
      }).filter(card => card.suit) as [Card, Card];

      const communityCards = communityCardsStr.map(cardStr => {
        const rank = cardStr.slice(0, -1) as Rank;
        const suitLetter = cardStr.slice(-1).toLowerCase();
        const suitMap: { [key: string]: Suit } = {
          'h': 'hearts', 'd': 'diamonds', 'c': 'clubs', 's': 'spades'
        };
        return { rank, suit: suitMap[suitLetter] };
      }).filter(card => card.suit);

      // 标记英雄手牌为已使用
      if (!deck.markCardsAsUsed(heroCards)) {
        errors.push('英雄手牌有重复或无效牌');
      }

      // 标记公共牌为已使用
      if (!deck.markCardsAsUsed(communityCards)) {
        errors.push('公共牌有重复或无效牌');
      }

      // 为其他玩家发牌
      const otherPlayerCards: [Card, Card][] = [];
      for (let i = 0; i < playerCount - 1; i++) {
        try {
          const playerCards = deck.dealHoleCards();
          otherPlayerCards.push(playerCards);
        } catch (error) {
          errors.push(`为玩家${i + 1}发牌失败: ${error}`);
          break;
        }
      }

      // 验证无重复
      const isValid = deck.validateNoDuplicates() && errors.length === 0;

      return {
        deck,
        heroCards,
        communityCards,
        otherPlayerCards,
        isValid,
        errors
      };

    } catch (error) {
      errors.push(`场景创建失败: ${error}`);
      return {
        deck,
        heroCards: [{ rank: '2', suit: 'hearts' }, { rank: '3', suit: 'hearts' }],
        communityCards: [],
        otherPlayerCards: [],
        isValid: false,
        errors
      };
    }
  }
}