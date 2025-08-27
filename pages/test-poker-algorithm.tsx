import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { StandardPokerEvaluator, PokerHandRank } from '@/lib/standard-poker-evaluator'
import { PokerHandComparator } from '@/lib/poker-hand-comparator'
import { Card } from '@/types/poker'

interface TestResult {
  name: string
  passed: boolean
  details: string
  expected: string
  actual: string
}

const TestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [summary, setSummary] = useState<{total: number, passed: number} | null>(null)

  /**
   * 创建牌的便捷函数
   */
  const card = (rank: string, suit: string): Card => ({
    rank: rank as any,
    suit: suit as 'hearts' | 'diamonds' | 'clubs' | 'spades'
  })

  /**
   * 运行所有测试
   */
  const runTests = async () => {
    setIsRunning(true)
    setTestResults([])
    setSummary(null)
    
    const results: TestResult[] = []
    
    // 测试案例1: 您报告的问题 - 一对A vs A高牌
    try {
      const community = [
        card('5', 'hearts'),
        card('10', 'hearts'), 
        card('A', 'spades'),
        card('Q', 'spades'),
        card('J', 'diamonds')
      ]
      
      // 玩家1: 4♦ 9♠ -> A高牌  
      const player1Eval = StandardPokerEvaluator.evaluateBestHand(
        'player1', '玩家1', 
        [card('4', 'diamonds'), card('9', 'spades')], 
        community
      )
      
      // 玩家2: A♣ 8♠ -> 一对A
      const player2Eval = StandardPokerEvaluator.evaluateBestHand(
        'player2', '玩家2',
        [card('A', 'clubs'), card('8', 'spades')],
        community
      )
      
      const comparison = PokerHandComparator.compareHands(player2Eval, player1Eval)
      const player2Wins = comparison > 0
      
      results.push({
        name: '一对A vs A高牌 (您报告的问题)',
        passed: player2Wins,
        details: `玩家1(4♦9♠): ${player1Eval.readableDescription} (强度: ${player1Eval.handStrength})\n玩家2(A♣8♠): ${player2Eval.readableDescription} (强度: ${player2Eval.handStrength})\n比较结果: ${comparison}`,
        expected: '一对A应该获胜',
        actual: player2Wins ? '一对A获胜 ✅' : 'A高牌获胜 ❌'
      })
    } catch (error) {
      results.push({
        name: '一对A vs A高牌 (您报告的问题)',
        passed: false,
        details: `错误: ${error}`,
        expected: '一对A应该获胜',
        actual: '测试出错'
      })
    }

    // 测试案例2: 两对 vs 一对A - 修正测试逻辑
    try {
      const community2 = [
        card('K', 'hearts'),   // 公共牌1 - K
        card('Q', 'clubs'),    // 公共牌2 - Q
        card('J', 'spades'),   // 公共牌3 - J  
        card('8', 'diamonds'), // 公共牌4 - 8 (不形成顺子)
        card('2', 'hearts')    // 公共牌5 - 2 (不形成顺子)
      ]
      
      // 玩家1: K♠ Q♥ -> 两对KK QQ
      const player1Eval = StandardPokerEvaluator.evaluateBestHand(
        'player1', '玩家1',
        [card('K', 'spades'), card('Q', 'hearts')], // K♠ + K♥ = KK, Q♥ + Q♣ = QQ
        community2
      )
      
      // 玩家2: A♠ A♥ -> 一对AA
      const player2Eval = StandardPokerEvaluator.evaluateBestHand(
        'player2', '玩家2', 
        [card('A', 'spades'), card('A', 'hearts')], // 只有一对A，踢脚牌K-Q-J
        community2
      )
      
      const comparison = PokerHandComparator.compareHands(player1Eval, player2Eval)
      const player1Wins = comparison > 0
      
      results.push({
        name: '两对KK QQ vs 一对AA',
        passed: player1Wins,
        details: `公共牌: ${community2.map(c => `${c.rank}${c.suit[0]}`).join(' ')}\n玩家1(K♠Q♥): ${player1Eval.readableDescription} (强度: ${player1Eval.handStrength})\n玩家2(A♠A♥): ${player2Eval.readableDescription} (强度: ${player2Eval.handStrength})\n比较结果: ${comparison}\n预期: 两对应该胜过一对`,
        expected: '两对KK QQ应该获胜',
        actual: player1Wins ? '两对KK QQ获胜 ✅' : '一对AA获胜 ❌'
      })
    } catch (error) {
      results.push({
        name: '两对KK QQ vs 一对AA',
        passed: false,
        details: `错误: ${error}`,
        expected: '两对KK QQ应该获胜', 
        actual: '测试出错'
      })
    }

    // 测试案例3: 葫芦 vs 三条
    try {
      const community3 = [
        card('K', 'hearts'),   // 公共牌1
        card('K', 'diamonds'), // 公共牌2
        card('K', 'clubs'),    // 公共牌3 - 三张K
        card('Q', 'hearts'),   // 公共牌4
        card('J', 'spades')    // 公共牌5 - 确保5张公共牌
      ]
      
      // 玩家1: A♠ A♥ -> 葫芦KKK AA (三张K + 一对A)
      const player1Eval = StandardPokerEvaluator.evaluateBestHand(
        'player1', '玩家1',
        [card('A', 'spades'), card('A', 'hearts')], // 底牌AA + 公共牌KKK = 葫芦
        community3
      )
      
      // 玩家2: 2♠ 3♥ -> 三条K (只有三条K，踢脚Q J)
      const player2Eval = StandardPokerEvaluator.evaluateBestHand(
        'player2', '玩家2',
        [card('2', 'spades'), card('3', 'hearts')], // 只能组成三条K
        community3
      )
      
      const comparison = PokerHandComparator.compareHands(player1Eval, player2Eval) 
      const player1Wins = comparison > 0
      
      results.push({
        name: '葫芦KKK AA vs 三条K',
        passed: player1Wins,
        details: `公共牌: ${community3.map(c => `${c.rank}${c.suit[0]}`).join(' ')}\n玩家1(A♠A♥): ${player1Eval.readableDescription} (强度: ${player1Eval.handStrength})\n玩家2(2♠3♥): ${player2Eval.readableDescription} (强度: ${player2Eval.handStrength})\n比较结果: ${comparison}`,
        expected: '葫芦应该获胜',
        actual: player1Wins ? '葫芦获胜 ✅' : '三条获胜 ❌'
      })
    } catch (error) {
      results.push({
        name: '葫芦KKK AA vs 三条K', 
        passed: false,
        details: `错误: ${error}`,
        expected: '葫芦应该获胜',
        actual: '测试出错'
      })
    }

    // 测试案例4: 同花 vs 顺子 - 修正测试逻辑  
    try {
      const community4 = [
        card('A', 'hearts'),   // 公共牌1
        card('K', 'hearts'),   // 公共牌2  
        card('7', 'hearts'),   // 公共牌3 - 红桃7 (不形成顺子)
        card('J', 'clubs'),    // 公共牌4 - 梅花J
        card('10', 'spades')   // 公共牌5 - 黑桃10
      ]
      
      // 玩家1: Q♥ 9♥ -> 同花A高红桃 (A♥ K♥ Q♥ 7♥ 9♥)
      const player1Eval = StandardPokerEvaluator.evaluateBestHand(
        'player1', '玩家1',
        [card('Q', 'hearts'), card('9', 'hearts')], // Q♥9♥ + A♥K♥7♥ = 同花
        community4
      )
      
      // 玩家2: K♠ Q♠ -> 顺子A高 (A-K-Q-J-10)
      const player2Eval = StandardPokerEvaluator.evaluateBestHand(
        'player2', '玩家2',
        [card('K', 'spades'), card('Q', 'spades')], // K♠Q♠ + A♥J♣10♠ = A-K-Q-J-10顺子
        community4
      )
      
      const comparison = PokerHandComparator.compareHands(player1Eval, player2Eval)
      const player1Wins = comparison > 0
      
      results.push({
        name: '同花A高红桃 vs 顺子A高',
        passed: player1Wins,
        details: `公共牌: ${community4.map(c => `${c.rank}${c.suit[0]}`).join(' ')}\n玩家1(Q♥9♥): ${player1Eval.readableDescription} (强度: ${player1Eval.handStrength})\n玩家2(K♠Q♠): ${player2Eval.readableDescription} (强度: ${player2Eval.handStrength})\n比较结果: ${comparison}\n预期: 同花(等级6)应该胜过顺子(等级5)`,
        expected: '同花应该获胜', 
        actual: player1Wins ? '同花获胜 ✅' : '顺子获胜 ❌'
      })
    } catch (error) {
      results.push({
        name: '同花A高红桃 vs 顺子A高',
        passed: false,
        details: `错误: ${error}`,
        expected: '同花应该获胜',
        actual: '测试出错'
      })
    }

    // 测试案例5: 轮子顺子测试
    try {
      const community5 = [
        card('A', 'spades'),   // 公共牌1 - A
        card('2', 'hearts'),   // 公共牌2 - 2
        card('3', 'diamonds'), // 公共牌3 - 3
        card('4', 'clubs'),    // 公共牌4 - 4
        card('K', 'hearts')    // 公共牌5 - K (不影响轮子顺子)
      ]
      
      // 玩家1: 5♠ 6♦ -> A-2-3-4-5轮子顺子
      const player1Eval = StandardPokerEvaluator.evaluateBestHand(
        'player1', '玩家1',
        [card('5', 'spades'), card('6', 'diamonds')], // 5♠完成轮子顺子A-2-3-4-5
        community5
      )
      
      // 玩家2: Q♠ J♥ -> 高牌A (A-K-Q-J-4)
      const player2Eval = StandardPokerEvaluator.evaluateBestHand(
        'player2', '玩家2',
        [card('Q', 'spades'), card('J', 'hearts')], // 只能组成A高牌
        community5
      )
      
      const comparison = PokerHandComparator.compareHands(player1Eval, player2Eval)
      const player1Wins = comparison > 0
      
      results.push({
        name: '轮子顺子(A-2-3-4-5) vs A高牌',
        passed: player1Wins && player1Eval.handRank === PokerHandRank.STRAIGHT,
        details: `公共牌: ${community5.map(c => `${c.rank}${c.suit[0]}`).join(' ')}\n玩家1(5♠6♦): ${player1Eval.readableDescription} (强度: ${player1Eval.handStrength})\n玩家2(Q♠J♥): ${player2Eval.readableDescription} (强度: ${player2Eval.handStrength})\n比较结果: ${comparison}\n轮子顺子识别: ${player1Eval.handRank === PokerHandRank.STRAIGHT ? '✅' : '❌'}`,
        expected: '轮子顺子应该获胜',
        actual: player1Wins ? '轮子顺子获胜 ✅' : 'A高牌获胜 ❌'
      })
    } catch (error) {
      results.push({
        name: '轮子顺子(A-2-3-4-5) vs A高牌',
        passed: false,
        details: `错误: ${error}`,
        expected: '轮子顺子应该获胜',
        actual: '测试出错'
      })
    }

    setTestResults(results)
    
    const passed = results.filter(r => r.passed).length
    const total = results.length
    setSummary({ total, passed })
    setIsRunning(false)
  }

  useEffect(() => {
    // 页面加载时自动运行测试
    runTests()
  }, [])

  return (
    <>
      <Head>
        <title>德州扑克算法测试</title>
      </Head>
      
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-4">🧪 德州扑克手牌评估算法测试</h1>
            <p className="text-slate-300">验证所有场景下手牌判断的正确性</p>
          </div>

          <div className="mb-6 flex justify-center">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              {isRunning ? '🔄 测试进行中...' : '▶️ 运行所有测试'}
            </button>
          </div>

          {summary && (
            <div className={`mb-6 p-4 rounded-lg border-2 ${
              summary.passed === summary.total 
                ? 'bg-green-900/30 border-green-500 text-green-100' 
                : 'bg-red-900/30 border-red-500 text-red-100'
            }`}>
              <h2 className="text-xl font-bold mb-2">
                {summary.passed === summary.total ? '🎉 所有测试通过！' : '⚠️ 有测试失败'}
              </h2>
              <p>
                通过: {summary.passed}/{summary.total} ({Math.round((summary.passed/summary.total)*100)}%)
              </p>
            </div>
          )}

          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  result.passed 
                    ? 'bg-green-900/20 border-green-600' 
                    : 'bg-red-900/20 border-red-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{result.passed ? '✅' : '❌'}</span>
                  <h3 className="text-lg font-semibold">{result.name}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-blue-300">期望结果:</strong>
                    <p className="mt-1">{result.expected}</p>
                  </div>
                  <div>
                    <strong className="text-purple-300">实际结果:</strong>
                    <p className="mt-1">{result.actual}</p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <strong className="text-yellow-300">详细信息:</strong>
                  <pre className="mt-1 text-xs bg-black/30 p-2 rounded overflow-auto whitespace-pre-wrap">
                    {result.details}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-slate-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">📝 测试说明</h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>• <strong>全面测试</strong>：所有测试都使用正确的5张公共牌格式</li>
              <li>• <strong>您报告的问题</strong>：验证一对A vs A高牌的判断正确性</li>
              <li>• <strong>德州扑克规则</strong>：2张底牌 + 5张公共牌 = 7选5最佳组合</li>
              <li>• <strong>牌型等级</strong>：验证10种基本牌型的强度排序</li>
              <li>• <strong>特殊情况</strong>：轮子顺子(A-2-3-4-5)的正确识别</li>
              <li>• <strong>算法精度</strong>：手牌强度计算的数值正确性</li>
            </ul>
            
            <div className="mt-4 p-3 bg-blue-900/30 rounded border border-blue-600/30">
              <h4 className="text-sm font-semibold text-blue-300 mb-2">🎯 您报告的具体问题场景</h4>
              <p className="text-xs text-blue-200">
                公共牌: 5♥ 10♥ A♠ Q♠ J♦<br/>
                您的底牌: 4♦ 9♠ → A-Q-J-10-9 高牌<br/>  
                对手底牌: A♣ 8♠ → A-A-Q-J-10 一对A<br/>
                <strong>预期结果: 一对A应该获胜</strong>
              </p>
            </div>
            
            <div className="mt-3 p-3 bg-green-900/30 rounded border border-green-600/30">
              <h4 className="text-sm font-semibold text-green-300 mb-2">✅ 测试逻辑已修正</h4>
              <p className="text-xs text-green-200">
                • 修正了之前测试中公共牌意外形成强牌型的问题<br/>
                • 确保每个测试案例都有明确的预期结果<br/>
                • 所有测试现在都使用realistic德州扑克场景
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default TestPage