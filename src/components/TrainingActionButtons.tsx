"use client"

import React, { useState } from 'react'
import { ActionType } from '@/types/poker'
import { formatStack } from '@/lib/poker-utils'

interface TrainingActionButtonsProps {
  validActions: ActionType[]
  currentBet: number
  playerStack: number
  potSize: number
  minRaise: number
  onAction: (action: { type: ActionType, amount?: number }) => void
  isWaitingForAction: boolean
}

const TrainingActionButtons: React.FC<TrainingActionButtonsProps> = ({
  validActions,
  currentBet,
  playerStack,
  potSize,
  minRaise,
  onAction,
  isWaitingForAction
}) => {
  const [raiseAmount, setRaiseAmount] = useState(minRaise)
  const [showRaiseInput, setShowRaiseInput] = useState(false)

  if (!isWaitingForAction || validActions.length === 0) {
    return null
  }

  const handleAction = (actionType: ActionType, amount?: number) => {
    onAction({ type: actionType, amount })
    setShowRaiseInput(false)
  }

  const getCallAmount = () => {
    return currentBet
  }

  const getRaiseAmount = () => {
    return Math.max(minRaise, currentBet * 2)
  }

  const renderActionButton = (actionType: ActionType) => {
    switch (actionType) {
      case 'fold':
        return (
          <button
            key="fold"
            onClick={() => handleAction('fold')}
            className="
              min-w-20 h-12 px-4
              bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 
              text-white font-semibold rounded-xl
              border-2 border-gray-400/30 hover:border-gray-300/50
              transition-all duration-200 active:scale-95
              shadow-lg hover:shadow-xl
              flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-gray-400
              text-sm
              touch-manipulation
              backdrop-blur-sm
            "
          >
            弃牌
          </button>
        )

      case 'check':
        return (
          <button
            key="check"
            onClick={() => handleAction('check')}
            className="
              min-w-20 h-12 px-4
              bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 
              text-white font-semibold rounded-xl
              border-2 border-blue-400/40 hover:border-blue-300/60
              transition-all duration-200 active:scale-95
              shadow-lg hover:shadow-xl
              flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-blue-400
              text-sm
              touch-manipulation
              backdrop-blur-sm
            "
          >
            过牌
          </button>
        )

      case 'call':
        const callAmount = getCallAmount()
        return (
          <button
            key="call"
            onClick={() => handleAction('call', callAmount)}
            className="
              min-w-24 h-12 px-4
              bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 
              text-white font-semibold rounded-xl
              border-2 border-green-400/40 hover:border-green-300/60
              transition-all duration-200 active:scale-95
              shadow-lg hover:shadow-xl
              flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-green-400
              text-sm
              touch-manipulation
              backdrop-blur-sm
            "
          >
            <span>跟注 {formatStack(callAmount)}</span>
          </button>
        )

      case 'bet':
      case 'raise':
        const minRaiseAmount = minRaise
        const potRaise = Math.max(minRaiseAmount, potSize)
        const twoXRaise = Math.max(minRaiseAmount, currentBet * 2)
        const threeXRaise = Math.max(minRaiseAmount, currentBet * 3)
        
        return (
          <div key="raise" className="flex gap-2">
            {/* 标准加注 */}
            <button
              onClick={() => handleAction(actionType, minRaiseAmount)}
              className="
                min-w-20 h-12 px-3
                bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 
                text-white font-semibold rounded-xl
                border-2 border-orange-400/40 hover:border-orange-300/60
                transition-all duration-200 active:scale-95
                shadow-lg hover:shadow-xl
                flex items-center justify-center
                focus:outline-none focus:ring-2 focus:ring-red-400
                text-xs
                touch-manipulation
                backdrop-blur-sm
              "
            >
              加注 {formatStack(minRaiseAmount)}
            </button>
            
            {/* 底池大小加注 */}
            {potRaise !== minRaiseAmount && potRaise <= playerStack && (
              <button
                onClick={() => handleAction(actionType, potRaise)}
                className="
                  min-w-18 h-12 px-2
                  bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 
                  text-white font-semibold rounded-xl
                  border-2 border-red-400/40 hover:border-red-300/60
                  transition-all duration-200 active:scale-95
                  shadow-lg hover:shadow-xl
                  flex items-center justify-center
                  focus:outline-none focus:ring-2 focus:ring-red-400
                  text-xs
                  touch-manipulation
                  backdrop-blur-sm
                "
              >
                底池 {formatStack(potRaise)}
              </button>
            )}
            
            {/* 2倍加注 */}
            {twoXRaise !== minRaiseAmount && twoXRaise !== potRaise && twoXRaise <= playerStack && (
              <button
                onClick={() => handleAction(actionType, twoXRaise)}
                className="
                  min-w-16 h-12 px-2
                  bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 
                  text-white font-semibold rounded-xl
                  border-2 border-red-500/40 hover:border-red-400/60
                  transition-all duration-200 active:scale-95
                  shadow-lg hover:shadow-xl
                  flex items-center justify-center
                  focus:outline-none focus:ring-2 focus:ring-red-400
                  text-xs
                  touch-manipulation
                  backdrop-blur-sm
                "
              >
                2x {formatStack(twoXRaise)}
              </button>
            )}
          </div>
        )

      case 'all-in':
        return (
          <button
            key="all-in"
            onClick={() => handleAction('all-in', playerStack)}
            className="
              min-w-20 h-12 px-4
              bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 
              text-white font-semibold rounded-xl
              border-2 border-purple-400/40 hover:border-purple-300/60
              transition-all duration-200 active:scale-95
              shadow-lg hover:shadow-xl
              flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-purple-400
              text-sm
              touch-manipulation
              backdrop-blur-sm
            "
          >
            全下
          </button>
        )

      default:
        return null
    }
  }

  return (
    <div className="w-full">
      {/* Centered Horizontal Scrollable Action Buttons */}
      <div className="overflow-x-auto scrollbar-hide px-4">
        <div className="flex space-x-3 justify-center min-w-max items-center min-h-[48px]">
          {validActions.map(action => renderActionButton(action))}
        </div>
      </div>
    </div>
  )
}

export default TrainingActionButtons