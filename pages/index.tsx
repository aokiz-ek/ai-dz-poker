import Head from 'next/head'
import ProfessionalStrategyMatrix from '@/components/ProfessionalStrategyMatrix'

export default function Home() {
  return (
    <>
      <Head>
        <title>AI 策略决策 GTO - 策略决策 GTO 训练系统</title>
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
              专业策略决策平台
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              AI 策略决策 GTO
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Training</span>
            </h1>
            
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              专业策略决策理论最优策略分析和训练平台
              提供实时反馈和全面的手牌范围可视化。
            </p>
            
            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto mb-8">
              <div 
                onClick={() => window.location.href = '/gto-hall'}
                className="group bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl relative"
              >
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                  NEW
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center text-white text-xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                    🏛️
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">GTO策略大厅</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    完整训练配置和场景选择
                  </p>
                  <div className="inline-flex items-center text-red-600 font-medium text-sm group-hover:text-red-700">
                    <span>配置训练</span>
                    <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

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
            </div>


            {/* Feature Tags */}
            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
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