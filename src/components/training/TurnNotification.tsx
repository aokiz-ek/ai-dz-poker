"use client"

import React, { useEffect, useState } from 'react'

interface TurnNotificationProps {
  isPlayerTurn: boolean
  playerName: string
  isHero: boolean
}

const TurnNotification: React.FC<TurnNotificationProps> = ({ isPlayerTurn, playerName, isHero }) => {
  const [showNotification, setShowNotification] = useState(false)
  const [soundEffect, setSoundEffect] = useState('')

  useEffect(() => {
    if (isPlayerTurn) {
      setShowNotification(true)
      // 模拟声音效果
      if (isHero) {
        setSoundEffect('🔔 轮到您了！')
      } else {
        setSoundEffect('🎯 对手行动中...')
      }

      // 1.5秒后自动隐藏 - 减半显示时间
      const timer = setTimeout(() => {
        setShowNotification(false)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [isPlayerTurn, isHero])

  if (!showNotification || !isPlayerTurn) return null

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div className={`
        backdrop-blur-xl rounded-2xl p-6 border-2 shadow-2xl animate-bounce
        ${isHero 
          ? 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-yellow-400/50' 
          : 'bg-gradient-to-br from-blue-400/20 to-purple-500/20 border-blue-400/50'
        }
      `}>
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">
            {isHero ? '👑' : '🎯'}
          </div>
          <div className={`text-lg font-bold mb-2 ${
            isHero ? 'text-yellow-300' : 'text-blue-300'
          }`}>
            {isHero ? '你的回合!' : `${playerName} 行动中`}
          </div>
          <div className={`text-sm ${
            isHero ? 'text-yellow-200' : 'text-blue-200'
          }`}>
            {soundEffect}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TurnNotification