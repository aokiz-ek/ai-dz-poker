"use client"

import React from 'react'
import { ActionType, GameStage } from '@/types/poker'
import { formatStack } from '@/lib/poker-utils'

interface DetailedActionRecord {
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

// 兼容旧接口
interface PlayerActionDisplay extends DetailedActionRecord {}

export type { DetailedActionRecord }

interface ActionHistoryProps {
  actions: PlayerActionDisplay[]
  currentPlayer?: string
}

const ActionHistory: React.FC<ActionHistoryProps> = ({ actions, currentPlayer }) => {
  const getActionColor = (action: ActionType, category?: string) => {
    if (category === 'game_event') {
      return '#10B981' // 绿色表示游戏事件
    } else if (category === 'system_action') {
      return '#6B7280' // 灰色表示系统操作
    }
    
    switch (action) {
      case 'fold':
        return '#8B5CF6'
      case 'check':
        return '#3B82F6'
      case 'call':
        return '#10B981'
      case 'bet':
      case 'raise':
        return '#F59E0B'
      case 'all-in':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }
  
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'game_event': return '🎲'
      case 'system_action': return '⚙️'
      case 'player_action': return '👤'
      default: return '👤'
    }
  }

  const getActionText = (action: ActionType, amount?: number, category?: string) => {
    // 系统操作和游戏事件的特殊处理
    if (category === 'game_event') {
      switch (action) {
        case 'bet': return '盲注'
        default: return action
      }
    }
    
    switch (action) {
      case 'fold':
        return '弃牌'
      case 'check':
        return '过牌'
      case 'call':
        return '跟注'
      case 'bet':
        return '投入'
      case 'raise':
        return '加注'
      case 'all-in':
        return '全下'
      default:
        return action
    }
  }
  
  // 为缺少字段的旧记录提供默认值
  const normalizeAction = (action: PlayerActionDisplay, index: number): DetailedActionRecord => {
    return {
      ...action,
      sequenceId: action.sequenceId || index,
      street: action.street || 'preflop',
      potSizeBefore: action.potSizeBefore || 0,
      potSizeAfter: action.potSizeAfter || 0,
      stackBefore: action.stackBefore || 0,
      stackAfter: action.stackAfter || 0,
      actionCategory: action.actionCategory || 'player_action'
    }
  }

  // 显示最近8个操作（增加显示数量）
  const recentActions = actions.slice(-8).map(normalizeAction)

  return (
    <div className="bg-black/30 backdrop-blur-lg rounded-xl border border-white/10 p-3">
      <div className="flex flex-wrap gap-2 justify-center">
        {recentActions.map((actionDisplay, index) => (
          <div 
            key={`action-${actionDisplay.sequenceId}-${actionDisplay.timestamp}`}
            className="flex items-center space-x-1.5 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10 hover:bg-black/50 transition-colors"
            title={actionDisplay.description || `${actionDisplay.playerName} ${getActionText(actionDisplay.action, actionDisplay.amount, actionDisplay.actionCategory)}`}
          >
            {/* 操作类型图标 */}
            <span className="text-xs">
              {getCategoryIcon(actionDisplay.actionCategory)}
            </span>
            
            {/* 玩家位置 */}
            <span className="text-white text-sm font-medium">
              {getPositionText(actionDisplay.position)}
            </span>
            
            {/* 街道标识 */}
            {actionDisplay.street !== 'preflop' && (
              <span className="text-xs px-1.5 py-0.5 bg-white/10 rounded text-white/70">
                {getStreetText(actionDisplay.street)}
              </span>
            )}
            
            {/* 操作文本 */}
            <span 
              className="text-sm font-semibold"
              style={{ color: getActionColor(actionDisplay.action, actionDisplay.actionCategory) }}
            >
              {getActionText(actionDisplay.action, actionDisplay.amount, actionDisplay.actionCategory)}
            </span>
            
            {/* 显示金额（如果有的话） */}
            {actionDisplay.amount && actionDisplay.amount > 0 && (
              <span className="text-white/80 text-sm font-medium">
                {formatStack(actionDisplay.amount)}
              </span>
            )}
            
            {/* 底池变化提示（hover时显示） */}
            {actionDisplay.potSizeBefore !== actionDisplay.potSizeAfter && (
              <span className="text-xs text-green-400">
                →{formatStack(actionDisplay.potSizeAfter)}
              </span>
            )}
          </div>
        ))}
        
        {/* 如果没有操作记录 */}
        {recentActions.length === 0 && (
          <div className="text-white/60 text-sm flex items-center space-x-2">
            <span>🎯</span>
            <span>牌局即将开始...</span>
          </div>
        )}
      </div>
    </div>
  )

  function getPositionText(position: string): string {
    const positionMap: { [key: string]: string } = {
      'utg': 'UTG',
      'UTG': 'UTG',
      'mp': '中位',
      'MP': '中位',
      'co': '后位',
      'CO': '后位',
      'button': '庄位',
      'BTN': '庄位',
      'sb': '小盲',
      'SB': '小盲',
      'bb': '大盲',
      'BB': '大盲'
    }
    return positionMap[position] || position
  }
  
  function getStreetText(street: GameStage): string {
    const streetMap: { [key in GameStage]: string } = {
      'preflop': '翻前',
      'flop': '翻牌',
      'turn': '转牌', 
      'river': '河牌',
      'showdown': '摊牌'
    }
    return streetMap[street] || street
  }
}

export default ActionHistory