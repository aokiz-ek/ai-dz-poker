import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'

interface TrainingConfig {
  gameFormat: 'cash' | 'tournament' | 'shortdeck' | 'sitgo'
  structure: 'regular' | 'ante' | 'straddle' | 'straddle_ante'
  tableSize: 9 | 8 | 6 | 2
  stackDepth: 200 | 100 | 50
  displayMode: 'actual' | 'blind'
  blindLevel: number
}

const GTOHall: React.FC = () => {
  const [selectedFormat, setSelectedFormat] = useState<'cash' | 'tournament' | 'shortdeck' | 'sitgo'>('cash')
  const [config, setConfig] = useState<TrainingConfig>({
    gameFormat: 'cash',
    structure: 'regular',
    tableSize: 6,
    stackDepth: 200,
    displayMode: 'actual',
    blindLevel: 2
  })

  const gameFormats = [
    { id: 'cash' as const, label: '常规桌', active: true },
    { id: 'tournament' as const, label: '锦标赛', active: false },
    { id: 'shortdeck' as const, label: '短牌', active: false },
    { id: 'sitgo' as const, label: 'sit&go', active: false }
  ]

  const structures = [
    { id: 'regular' as const, label: '常规' },
    { id: 'ante' as const, label: '前注(0.5bb)' },
    { id: 'straddle_ante' as const, label: '强抓+前注(0.5bb)' },
    { id: 'straddle' as const, label: '强抓' }
  ]

  const tableSizes = [
    { id: 9, label: '9人' },
    { id: 8, label: '8人' },
    { id: 6, label: '6人' },
    { id: 2, label: '单挑' }
  ]

  const stackDepths = [
    { id: 200, label: '200' },
    { id: 100, label: '100' },
    { id: 50, label: '50' }
  ]

  const displayModes = [
    { id: 'actual' as const, label: '实际级别' },
    { id: 'blind' as const, label: '盲注显示' }
  ]

  const featureButtons = [
    {
      id: 'learn',
      label: '学习策略',
      icon: '🎓',
      color: 'bg-training-control-save',
      description: '学习GTO策略和理论知识'
    },
    {
      id: 'practice',
      label: '练习模式',
      icon: '▶️',
      color: 'bg-training-control-analyze',
      description: '实时训练和决策练习'
    },
    {
      id: 'save',
      label: '保存策略',
      icon: '📁',
      color: 'bg-training-control-save',
      description: '保存和管理自定义策略'
    },
    {
      id: 'data',
      label: '练习数据',
      icon: '📊',
      color: 'bg-training-control-analyze',
      description: '查看训练数据和统计分析'
    }
  ]

  return (
    <>
      <Head>
        <title>GTO策略大厅 - AI策略决策训练系统</title>
        <meta name="description" content="配置和启动GTO策略决策训练系统" />
      </Head>

      <div className="min-h-screen bg-poker-bg-dark">
        {/* Mobile Header */}
        <div className="md:hidden bg-poker-bg-card border-b border-poker-border-default">
          <div className="flex items-center justify-between p-4">
            <Link href="/" className="p-2 -ml-2 text-poker-text-secondary hover:text-poker-secondary transition-colors">
              <span className="text-xl">←</span>
            </Link>
            <h1 className="text-lg font-semibold text-poker-text-primary">GTO策略大厅</h1>
            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block bg-poker-bg-card border-b border-poker-border-default">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="p-2 -ml-2 text-poker-text-secondary hover:text-poker-secondary transition-colors">
                <span className="text-xl">←</span>
              </Link>
              <h1 className="text-2xl font-bold text-poker-text-primary">GTO策略大厅</h1>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 md:px-6">
          {/* Game Format Tabs */}
          <div className="mb-8">
            <div className="flex space-x-1 bg-poker-bg-card p-1 rounded-xl border border-poker-border-default">
              {gameFormats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`
                    flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                    ${selectedFormat === format.id
                      ? 'bg-poker-secondary text-poker-bg-dark shadow-md'
                      : 'text-poker-text-secondary hover:text-poker-text-primary hover:bg-poker-bg-elevated'
                    }
                    ${!format.active ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  disabled={!format.active}
                >
                  {format.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hot Categories */}
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-red-900/20 to-red-800/20 border border-red-800/30 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-red-400 text-lg">🔥</span>
                  <span className="text-red-400 font-semibold">热门</span>
                </div>
                <p className="text-poker-text-secondary text-sm">最受欢迎的训练场景</p>
              </div>
              
              <div className="bg-gradient-to-r from-poker-bg-elevated to-poker-bg-card border border-poker-border-default rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-poker-secondary text-lg">📚</span>
                  <span className="text-poker-secondary font-semibold">其他(仅翻前)</span>
                </div>
                <p className="text-poker-text-secondary text-sm">翻前策略专项训练</p>
              </div>
            </div>
          </div>

          {/* Configuration Sections */}
          <div className="space-y-8 mb-10">
            {/* Structure */}
            <div>
              <h3 className="text-lg font-semibold text-poker-text-primary mb-4 border-b border-poker-border-default pb-2">
                结构
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {structures.map((structure) => (
                  <button
                    key={structure.id}
                    onClick={() => setConfig({...config, structure: structure.id})}
                    className={`
                      p-3 rounded-lg text-sm font-medium transition-all duration-200
                      ${config.structure === structure.id
                        ? 'bg-poker-secondary text-poker-bg-dark border-2 border-poker-secondary'
                        : 'bg-poker-bg-card text-poker-text-secondary border-2 border-poker-border-default hover:border-poker-secondary hover:text-poker-text-primary'
                      }
                    `}
                  >
                    {structure.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Size */}
            <div>
              <h3 className="text-lg font-semibold text-poker-text-primary mb-4 border-b border-poker-border-default pb-2">
                人数
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tableSizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setConfig({...config, tableSize: size.id as any})}
                    className={`
                      p-3 rounded-lg text-sm font-medium transition-all duration-200
                      ${config.tableSize === size.id
                        ? 'bg-poker-secondary text-poker-bg-dark border-2 border-poker-secondary'
                        : 'bg-poker-bg-card text-poker-text-secondary border-2 border-poker-border-default hover:border-poker-secondary hover:text-poker-text-primary'
                      }
                    `}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stack Depth */}
            <div>
              <h3 className="text-lg font-semibold text-poker-text-primary mb-4 border-b border-poker-border-default pb-2">
                后手
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {stackDepths.map((depth) => (
                  <button
                    key={depth.id}
                    onClick={() => setConfig({...config, stackDepth: depth.id as any})}
                    className={`
                      p-3 rounded-lg text-sm font-medium transition-all duration-200
                      ${config.stackDepth === depth.id
                        ? 'bg-poker-secondary text-poker-bg-dark border-2 border-poker-secondary'
                        : 'bg-poker-bg-card text-poker-text-secondary border-2 border-poker-border-default hover:border-poker-secondary hover:text-poker-text-primary'
                      }
                    `}
                  >
                    {depth.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-poker-text-muted">rake:5% 0.6bb Cap</p>
            </div>

            {/* Display Mode */}
            <div>
              <h3 className="text-lg font-semibold text-poker-text-primary mb-4 border-b border-poker-border-default pb-2">
                记分牌显示
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {displayModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setConfig({...config, displayMode: mode.id})}
                    className={`
                      p-3 rounded-lg text-sm font-medium transition-all duration-200
                      ${config.displayMode === mode.id
                        ? 'bg-poker-secondary text-poker-bg-dark border-2 border-poker-secondary'
                        : 'bg-poker-bg-card text-poker-text-secondary border-2 border-poker-border-default hover:border-poker-secondary hover:text-poker-text-primary'
                      }
                    `}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-poker-text-secondary">盲注级别: {config.blindLevel}/2</span>
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => setConfig({...config, blindLevel: Math.max(1, config.blindLevel - 1)})}
                      className="w-8 h-8 rounded-full bg-poker-bg-elevated border border-poker-border-default flex items-center justify-center text-poker-text-secondary hover:text-poker-secondary transition-colors"
                    >
                      −
                    </button>
                    <span className="text-xl font-mono text-poker-text-primary w-8 text-center">{config.blindLevel}</span>
                    <button 
                      onClick={() => setConfig({...config, blindLevel: config.blindLevel + 1})}
                      className="w-8 h-8 rounded-full bg-poker-bg-elevated border border-poker-border-default flex items-center justify-center text-poker-text-secondary hover:text-poker-secondary transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-poker-text-secondary">后手: {config.stackDepth}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featureButtons.map((feature) => {
              const ButtonComponent = feature.id === 'practice' ? Link : 'button'
              const buttonProps = feature.id === 'practice' ? { href: '/training-simulator' } : {}
              
              return (
                <ButtonComponent
                  key={feature.id}
                  {...buttonProps}
                  className={`
                    ${feature.color} p-6 rounded-xl text-white
                    flex items-center space-x-4
                    transition-all duration-200 hover:scale-105 hover:shadow-lg
                    focus:outline-none focus:ring-2 focus:ring-poker-secondary focus:ring-opacity-50
                    ${feature.id === 'practice' ? 'cursor-pointer' : 'cursor-default opacity-75'}
                  `}
                >
                  <span className="text-3xl flex-shrink-0">{feature.icon}</span>
                  <div className="text-left flex-1">
                    <h4 className="text-lg font-semibold">{feature.label}</h4>
                    <p className="text-sm opacity-90 mt-1">{feature.description}</p>
                    {feature.id === 'practice' && (
                      <div className="inline-flex items-center mt-2 text-sm font-medium opacity-100">
                        <span>立即开始训练</span>
                        <span className="ml-1 text-lg">→</span>
                      </div>
                    )}
                  </div>
                </ButtonComponent>
              )
            })}
          </div>
        </div>

        {/* Bottom Navigation Spacer for Mobile */}
        <div className="h-20 md:hidden" />
      </div>
    </>
  )
}

export default GTOHall