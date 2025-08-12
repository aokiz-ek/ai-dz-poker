import { HandRange, Card } from '@/types/poker';
import { getHandCode, getAllStartingHands, rankValue } from './poker-utils';

export class HandRangeManager {
  // Parse range string like "AA-QQ, AKs, AKo, KQs+" into frequency map
  static parseRange(rangeString: string): HandRange {
    const range: HandRange = {};
    const allHands = getAllStartingHands();
    
    // Initialize all hands to 0
    allHands.forEach(hand => range[hand] = 0);
    
    // Split by comma and process each part
    const parts = rangeString.split(',').map(s => s.trim()).filter(s => s);
    
    parts.forEach(part => {
      this.parseRangePart(part, range);
    });
    
    return range;
  }

  // Parse individual range parts
  private static parseRangePart(part: string, range: HandRange): void {
    if (part.includes('-')) {
      // Handle ranges like "AA-QQ", "AKs-AJs"
      this.parseRangeSegment(part, range);
    } else if (part.endsWith('+')) {
      // Handle "plus" ranges like "AKs+", "99+"
      this.parsePlusRange(part, range);
    } else {
      // Single hand like "AA", "AKs"
      if (this.isValidHand(part)) {
        range[part] = 1;
      }
    }
  }

  // Parse range segments like "AA-QQ"
  private static parseRangeSegment(segment: string, range: HandRange): void {
    const [start, end] = segment.split('-').map(s => s.trim());
    
    if (this.isPairRange(start, end)) {
      this.addPairRange(start, end, range);
    } else if (this.isSuitedRange(start, end)) {
      this.addSuitedRange(start, end, range);
    } else if (this.isOffsuitRange(start, end)) {
      this.addOffsuitRange(start, end, range);
    }
  }

  // Parse "plus" ranges like "99+"
  private static parsePlusRange(plusRange: string, range: HandRange): void {
    const hand = plusRange.slice(0, -1); // Remove '+'
    
    if (this.isPair(hand)) {
      this.addPairPlusRange(hand, range);
    } else if (hand.endsWith('s')) {
      this.addSuitedPlusRange(hand, range);
    } else if (hand.endsWith('o')) {
      this.addOffsuitPlusRange(hand, range);
    }
  }

  // Add pair range like "AA-QQ"
  private static addPairRange(startPair: string, endPair: string, range: HandRange): void {
    const startRank = startPair[0];
    const endRank = endPair[0];
    const startValue = rankValue(startRank as any);
    const endValue = rankValue(endRank as any);
    
    for (let val = Math.max(startValue, endValue); val >= Math.min(startValue, endValue); val--) {
      const rank = Object.keys({ 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 })
        .find(key => rankValue(key as any) === val);
      if (rank) {
        range[`${rank}${rank}`] = 1;
      }
    }
  }

  // Add suited range like "AKs-AJs"
  private static addSuitedRange(startHand: string, endHand: string, range: HandRange): void {
    const highRank = startHand[0];
    const startLowRank = startHand[1];
    const endLowRank = endHand[1];
    
    const startValue = rankValue(startLowRank as any);
    const endValue = rankValue(endLowRank as any);
    
    for (let val = Math.max(startValue, endValue); val >= Math.min(startValue, endValue); val--) {
      const rank = Object.keys({ 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 })
        .find(key => rankValue(key as any) === val);
      if (rank) {
        range[`${highRank}${rank}s`] = 1;
      }
    }
  }

  // Add offsuit range like "AKo-AJo"
  private static addOffsuitRange(startHand: string, endHand: string, range: HandRange): void {
    const highRank = startHand[0];
    const startLowRank = startHand[1];
    const endLowRank = endHand[1];
    
    const startValue = rankValue(startLowRank as any);
    const endValue = rankValue(endLowRank as any);
    
    for (let val = Math.max(startValue, endValue); val >= Math.min(startValue, endValue); val--) {
      const rank = Object.keys({ 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 })
        .find(key => rankValue(key as any) === val);
      if (rank) {
        range[`${highRank}${rank}o`] = 1;
      }
    }
  }

  // Add pair plus range like "99+"
  private static addPairPlusRange(pair: string, range: HandRange): void {
    const rank = pair[0];
    const startValue = rankValue(rank as any);
    
    for (let val = 14; val >= startValue; val--) {
      const pairRank = Object.keys({ 'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 })
        .find(key => rankValue(key as any) === val);
      if (pairRank) {
        range[`${pairRank}${pairRank}`] = 1;
      }
    }
  }

  // Add suited plus range like "AKs+"
  private static addSuitedPlusRange(hand: string, range: HandRange): void {
    const highRank = hand[0];
    const lowRank = hand[1];
    const startValue = rankValue(lowRank as any);
    const highValue = rankValue(highRank as any);
    
    for (let val = highValue - 1; val >= startValue; val--) {
      const rank = Object.keys({ 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 })
        .find(key => rankValue(key as any) === val);
      if (rank) {
        range[`${highRank}${rank}s`] = 1;
      }
    }
  }

  // Add offsuit plus range like "AKo+"
  private static addOffsuitPlusRange(hand: string, range: HandRange): void {
    const highRank = hand[0];
    const lowRank = hand[1];
    const startValue = rankValue(lowRank as any);
    const highValue = rankValue(highRank as any);
    
    for (let val = highValue - 1; val >= startValue; val--) {
      const rank = Object.keys({ 'K': 13, 'Q': 12, 'J': 11, 'T': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 })
        .find(key => rankValue(key as any) === val);
      if (rank) {
        range[`${highRank}${rank}o`] = 1;
      }
    }
  }

  // Helper functions
  private static isPair(hand: string): boolean {
    return hand.length === 2 && hand[0] === hand[1];
  }

  private static isPairRange(start: string, end: string): boolean {
    return this.isPair(start) && this.isPair(end);
  }

  private static isSuitedRange(start: string, end: string): boolean {
    return start.endsWith('s') && end.endsWith('s') && start[0] === end[0];
  }

  private static isOffsuitRange(start: string, end: string): boolean {
    return start.endsWith('o') && end.endsWith('o') && start[0] === end[0];
  }

  private static isValidHand(hand: string): boolean {
    const allHands = getAllStartingHands();
    return allHands.includes(hand);
  }

  // Get range statistics
  static getRangeStats(range: HandRange): {
    totalCombos: number;
    selectedCombos: number;
    percentage: number;
    pairs: number;
    suited: number;
    offsuit: number;
  } {
    let selectedCombos = 0;
    let pairs = 0;
    let suited = 0;
    let offsuit = 0;

    Object.entries(range).forEach(([hand, frequency]) => {
      if (frequency > 0) {
        const combos = this.getHandCombinations(hand);
        selectedCombos += combos * frequency;
        
        if (hand.length === 2) pairs += combos * frequency;
        else if (hand.endsWith('s')) suited += combos * frequency;
        else if (hand.endsWith('o')) offsuit += combos * frequency;
      }
    });

    return {
      totalCombos: 1326, // Total Texas Hold'em combinations
      selectedCombos,
      percentage: (selectedCombos / 1326) * 100,
      pairs,
      suited,
      offsuit,
    };
  }

  // Get number of combinations for a specific hand
  private static getHandCombinations(hand: string): number {
    if (hand.length === 2 && hand[0] === hand[1]) {
      // Pocket pairs: 6 combinations (4 choose 2)
      return 6;
    } else if (hand.endsWith('s')) {
      // Suited: 4 combinations
      return 4;
    } else if (hand.endsWith('o')) {
      // Offsuit: 12 combinations
      return 12;
    }
    return 0;
  }

  // Convert range to readable string
  static rangeToString(range: HandRange): string {
    const activeHands = Object.entries(range)
      .filter(([_, frequency]) => frequency > 0)
      .map(([hand, _]) => hand);
    
    return activeHands.join(', ');
  }

  // Check if specific cards are in range
  static isInRange(card1: Card, card2: Card, range: HandRange): boolean {
    const handCode = getHandCode(card1, card2);
    return range[handCode] > 0;
  }

  // Merge two ranges
  static mergeRanges(range1: HandRange, range2: HandRange): HandRange {
    const merged: HandRange = {};
    const allHands = getAllStartingHands();
    
    allHands.forEach(hand => {
      merged[hand] = Math.max(range1[hand] || 0, range2[hand] || 0);
    });
    
    return merged;
  }

  // Get common preflop ranges
  static getPresetRanges(): Record<string, HandRange> {
    return {
      'Tight (15%)': this.parseRange('AA-99, AKs, AKo, AQs, AJs, ATs, KQs, KJs, QJs, JTs'),
      'Standard (20%)': this.parseRange('AA-77, AKs-A9s, AKo, AQo, AJo, KQs, KJs, KTs, QJs, QTs, JTs, T9s'),
      'Loose (30%)': this.parseRange('AA-55, AKs-A7s, AKo-ATo, KQs-K9s, KQo, KJo, QJs-Q9s, QJo, JTs-J9s, JTo, T9s, T8s, 98s, 87s, 76s'),
      'Very Loose (40%)': this.parseRange('AA-22, AKs-A2s, AKo-A8o, KQs-K2s, KQo-K9o, QJs-Q2s, QJo-Q9o, JTs-J2s, JTo-J9o, T9s-T2s, T9o, 98s-92s, 98o, 87s-82s, 87o, 76s-72s, 76o, 65s-62s, 54s-52s, 43s-42s, 32s'),
      'Button (45%)': this.parseRange('AA-22, AKs-A2s, AKo-A5o, KQs-K5s, KQo-K9o, QJs-Q8s, QJo-QTo, JTs-J8s, JTo, T9s-T8s, T9o, 98s-97s, 98o, 87s-86s, 87o, 76s-75s, 76o, 65s-64s, 54s-53s, 43s'),
    };
  }
}