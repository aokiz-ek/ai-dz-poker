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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
              <div 
                onClick={() => window.location.hash = '#matrix'}
                className="group bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center text-white text-xl mx-auto mb-3 group-hover:scale-110 transition-transform">
                    📊
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">策略矩阵</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    专业 13×13 热力图可视化
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">实战训练</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    实时场景化训练
                  </p>
                  <div className="inline-flex items-center text-indigo-600 font-medium text-sm group-hover:text-indigo-700">
                    <span>开始训练</span>
                    <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Tags */}
            <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>GTO 算法</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                <span>实时分析</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                <span>6 种训练场景</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                <span>数据可视化</span>
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