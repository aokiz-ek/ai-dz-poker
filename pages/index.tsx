import Head from 'next/head'
import ProfessionalStrategyMatrix from '@/components/ProfessionalStrategyMatrix'

export default function Home() {
  return (
    <>
      <Head>
        <title>AI Poker GTO - 扑克 GTO 训练系统</title>
        <meta name="description" content="GTO 训练和策略分析平台" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className=" bg-gradient-to-br from-gray-50 to-slate-100">
        <div className="mx-auto px-4 py-8">
          {/* Modern Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-6">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></div>
              专业扑克策略平台
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              AI Poker GTO
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Training</span>
            </h1>
            
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              专业博弈论最优策略分析和训练平台
              提供实时反馈和全面的手牌范围可视化。
            </p>
            
            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto mb-8">
              <div 
                onClick={() => window.location.hash = '#matrix'}
                className="group bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-white text-xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                    📊
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">GTO策略矩阵</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    专业13×13手牌范围热力图可视化
                  </p>
                  <div className="inline-flex items-center text-emerald-600 font-medium text-sm group-hover:text-emerald-700">
                    <span>立即分析</span>
                    <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => window.location.href = '/training'}
                className="group bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                    🎯
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">翻后GTO训练</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    6个专业训练场景 + AI对手
                  </p>
                  <div className="inline-flex items-center text-indigo-600 font-medium text-sm group-hover:text-indigo-700">
                    <span>开始训练</span>
                    <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => window.location.href = '/replay'}
                className="group bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl relative"
              >
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                  NEW
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white text-xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                    🎬
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">手牌回放分析</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Phase 2.2 - 完整回放 + GTO分析
                  </p>
                  <div className="inline-flex items-center text-purple-600 font-medium text-sm group-hover:text-purple-700">
                    <span>体验回放</span>
                    <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => window.location.href = '/achievements'}
                className="group bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                    🏆
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">成就中心</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    追踪学习进度和解锁成就徽章
                  </p>
                  <div className="inline-flex items-center text-yellow-600 font-medium text-sm group-hover:text-yellow-700">
                    <span>查看成就</span>
                    <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => window.location.href = '/sync'}
                className="group bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl relative"
              >
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                  Phase 2.3
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                    ☁️
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">云端同步</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Phase 2.3 - 多设备数据同步
                  </p>
                  <div className="inline-flex items-center text-cyan-600 font-medium text-sm group-hover:text-cyan-700">
                    <span>同步设置</span>
                    <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 2.2 新功能亮点 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl shadow-lg p-6 mb-4 max-w-5xl mx-auto">
              <div className="text-center mb-4">
                <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-full mb-2">
                  <span className="animate-pulse mr-2">🚀</span>
                  Phase 2.2 智能功能已上线
                </div>
                <h3 className="text-lg font-semibold text-gray-900">✨ 全新回放分析系统</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 bg-white/80 rounded-lg p-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white text-sm">🎬</div>
                  <div>
                    <div className="font-medium text-gray-900">完整回放系统</div>
                    <div className="text-sm text-gray-600">逐步重现每个决策</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/80 rounded-lg p-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm">📈</div>
                  <div>
                    <div className="font-medium text-gray-900">实时GTO分析</div>
                    <div className="text-sm text-gray-600">策略偏差 + 胜率追踪</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/80 rounded-lg p-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm">🎯</div>
                  <div>
                    <div className="font-medium text-gray-900">智能推荐</div>
                    <div className="text-sm text-gray-600">个性化学习路径</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 2.3 新功能亮点 */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl shadow-lg p-6 mb-4 max-w-5xl mx-auto">
              <div className="text-center mb-4">
                <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium rounded-full mb-2">
                  <span className="animate-pulse mr-2">🚀</span>
                  Phase 2.3 云端准备已上线
                </div>
                <h3 className="text-lg font-semibold text-gray-900">☁️ 多设备数据同步</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 bg-white/80 rounded-lg p-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-sm">☁️</div>
                  <div>
                    <div className="font-medium text-gray-900">云端同步</div>
                    <div className="text-sm text-gray-600">Firebase/Supabase支持</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/80 rounded-lg p-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white text-sm">🔄</div>
                  <div>
                    <div className="font-medium text-gray-900">智能同步策略</div>
                    <div className="text-sm text-gray-600">自动/手动/智能模式</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/80 rounded-lg p-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white text-sm">🛡️</div>
                  <div>
                    <div className="font-medium text-gray-900">冲突解决</div>
                    <div className="text-sm text-gray-600">多版本冲突自动处理</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 传统功能亮点展示 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-6 mb-8 max-w-5xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">🔥 核心功能体系</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm">🧠</div>
                    <div>
                      <div className="font-medium text-gray-900">智能AI对手系统</div>
                      <div className="text-sm text-gray-600">4种AI角色，从新手到专家</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-white text-sm">📊</div>
                    <div>
                      <div className="font-medium text-gray-900">手牌评估引擎</div>
                      <div className="text-sm text-gray-600">精准的翻后强度分析</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white text-sm">💾</div>
                    <div>
                      <div className="font-medium text-gray-900">本地存储系统</div>
                      <div className="text-sm text-gray-600">智能缓存 + 75%压缩率</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white text-sm">🎯</div>
                    <div>
                      <div className="font-medium text-gray-900">动态场景生成</div>
                      <div className="text-sm text-gray-600">基于弱点的针对性训练</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white text-sm">⚡</div>
                    <div>
                      <div className="font-medium text-gray-900">实时分析反馈</div>
                      <div className="text-sm text-gray-600">GTO偏离度 + 改进建议</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-sm">🏆</div>
                    <div>
                      <div className="font-medium text-gray-900">成就系统</div>
                      <div className="text-sm text-gray-600">进度追踪 + 激励机制</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Tags */}
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1 px-2 py-1 bg-cyan-100 rounded-full border border-cyan-300">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                <span className="text-cyan-700 font-medium">云端同步</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full border border-purple-300">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-purple-700 font-medium">手牌回放分析</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>翻后GTO算法</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                <span>智能AI对手</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                <span>动态场景生成</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                <span>成就系统</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                <span>本地存储</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                <span>实时分析反馈</span>
              </div>
            </div>
          </div>

          <div id="matrix">
            <ProfessionalStrategyMatrix />
          </div>
        </div>
      </main>
    </>
  )
}