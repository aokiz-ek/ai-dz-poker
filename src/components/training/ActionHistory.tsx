"use client"

import React from 'react'
import { ActionType } from '@/types/poker'
import { formatStack } from '@/lib/poker-utils'

interface PlayerActionDisplay {
  playerId: string
  playerName: string
  action: ActionType
  amount?: number
  position: string
  timestamp: number
}

interface ActionHistoryProps {
  actions: PlayerActionDisplay[]
  currentPlayer?: string
}

const ActionHistory: React.FC<ActionHistoryProps> = ({ actions, currentPlayer }) => {
  const getActionColor = (action: ActionType) => {
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

  const getActionText = (action: ActionType, amount?: number) => {
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

  // 显示最近6个操作（适合水平布局）
  const recentActions = actions.slice(-6)

  return (
    <div className="bg-black/30 backdrop-blur-lg rounded-xl border border-white/10 p-3">
      <div className="flex flex-wrap gap-2 justify-center">
        {recentActions.map((actionDisplay, index) => (
          <div 
            key={`action-${actionDisplay.timestamp}-${index}`}
            className="flex items-center space-x-1 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10"
          >
            {/* 玩家位置 */}
            <span className="text-white text-sm font-medium">
              {getPositionText(actionDisplay.position)}
            </span>
            
            {/* 操作文本 */}
            <span 
              className="text-sm font-semibold"
              style={{ color: getActionColor(actionDisplay.action) }}
            >
              {getActionText(actionDisplay.action, actionDisplay.amount)}
            </span>
            
            {/* 显示金额（如果有的话） */}
            {actionDisplay.amount && actionDisplay.amount > 0 && (
              <span className="text-white/80 text-sm">
                {formatStack(actionDisplay.amount)}
              </span>
            )}
          </div>
        ))}
        
        {/* 如果没有操作记录 */}
        {recentActions.length === 0 && (
          <div className="text-white/60 text-sm">
            暂无操作记录
          </div>
        )}
      </div>
    </div>
  )

  function getPositionText(position: string): string {
    const positionMap: { [key: string]: string } = {
      'utg': 'UTG',
      'mp': '中位', 
      'co': '后位',
      'button': '庄位',
      'sb': '小盲',
      'bb': '大盲'
    }
    return positionMap[position.toLowerCase()] || position
  }
}

export default ActionHistory