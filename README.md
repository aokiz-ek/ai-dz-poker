# 🎯 AI 策略决策 GTO 训练系统 | AI Strategic Decision GTO Training System

**Language / 语言**: [English](#english) | [中文](#中文)

[![Deploy with Vercel](https://vercel.com/button)](https://ai-dz-poker-rkc2.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)

> **🌐 Live Demo**: [https://ai-dz-poker-rkc2.vercel.app](https://ai-dz-poker-rkc2.vercel.app)

---

## English

A professional Strategic Decision Game Theory Optimal (GTO) training platform that provides real-time strategy analysis, scenario-based training, and advanced data visualization.

## 🎯 Core Features

### 1. GTO Strategy Heatmap
- **Hand Range Visualization**: 13x13 grid displaying GTO strategies for all starting hands
- **Dynamic Filtering**: Filter by pocket pairs, suited, and offsuit hands
- **Detailed Analysis**: Hover to view specific action frequencies (Raise/Call/Fold) for each hand
- **Data Export**: Support for CSV format strategy data export

### 2. Real-time Training Mode
- **Interactive Training Table**: Complete strategic decision game interface
- **Instant Feedback**: Get GTO analysis and scoring after each decision
- **Positional Strategy**: Professional strategy recommendations for different positions (UTG, CO, BTN, SB, BB)
- **Progress Tracking**: Real-time statistics for average score and hand count

### 3. Scenario-based Training
- **Multiple Training Scenarios**: 6 carefully designed training scenarios
- **Difficulty Levels**: Beginner, Intermediate, and Advanced levels
- **Smart Recommendations**: Suggest appropriate training scenarios based on player performance
- **Learning Objectives**: Each scenario has clear learning focus points

## 🏗️ Technical Architecture

### Frontend Technology Stack
- **React 18** + **TypeScript**: Modern component development
- **Next.js 14**: Full-stack framework with SSR support
- **Tailwind CSS**: Rapid responsive styling development
- **Component Design**: Reusable UI component system

### Core Modules

#### 1. Game Engine (`src/lib/strategy-engine.ts`)
```typescript
class PokerEngine {
  // Complete poker rules implementation
  createDeck(): Card[]           // Shuffle and deal cards
  processAction(): boolean       // Process player actions
  dealCommunityCards(): void     // Deal community cards
  isBettingRoundComplete(): boolean // Check if betting round is complete
}
```

#### 2. GTO Strategy Engine (`src/lib/gto-strategy.ts`)
```typescript
class GtoStrategyEngine {
  // Position-based GTO strategy recommendations
  getGtoRecommendation(): GtoStrategy    // Get GTO recommendation
  analyzeAction(): ActionAnalysis        // Analyze player action
  getHandRanking(): number               // Hand strength ranking
}
```

#### 3. Hand Range Management (`src/lib/hand-ranges.ts`)
```typescript
class HandRangeManager {
  // Hand range parsing and management
  parseRange(rangeString: string): HandRange     // Parse range string
  getRangeStats(): RangeStatistics               // Get range statistics
  isInRange(): boolean                           // Check if hand is in range
}
```

#### 4. Training Scenario System (`src/lib/training-scenarios.ts`)
```typescript
class TrainingScenarioManager {
  // Training scenario management and generation
  getAllScenarios(): TrainingScenario[]          // Get all scenarios
  getRecommendedScenarios(): TrainingScenario[]  // Smart scenario recommendations
  generateScenarioHand(): ScenarioSetup          // Generate scenario setup
}
```

### UI Component System

#### Table Components
- **PokerTable**: Main poker table interface
- **PlayerSeat**: Player seat display
- **CommunityCards**: Community cards area
- **ActionButtons**: Action button group

#### Analysis Components
- **GtoHeatmap**: Strategy heatmap
- **GtoFeedback**: Instant feedback modal
- **ScenarioSelector**: Scenario selector

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to start using the application.

### Build for Production
```bash
npm run build
npm start
```

## 📊 Training Scenarios

### Beginner Scenarios
1. **Button vs Big Blind (Deep Stack)**: Deep stack button position training
2. **Under The Gun (6-max)**: UTG position tight range practice

### Intermediate Scenarios
3. **Cutoff Steal Attempt**: CO position steal strategy
4. **Middle Position 3-Bet Defense**: Middle position 3-bet defense

### Advanced Scenarios
5. **Small Blind vs Big Blind**: Complex blind vs blind decisions
6. **Tournament Bubble Play**: Tournament bubble strategy

## 🎨 Interface Features

### Professional Table Design
- Realistic poker table layout
- Smooth animation effects
- Intuitive information display

### Smart Feedback System
- 0-100 point scoring system
- Detailed decision analysis
- Color-coded strategy frequencies

### Data Visualization
- Heatmap color coding
- Real-time statistics charts
- Progress tracking panels

## 🔮 Future Roadmap

### Phase 2 Features
- [ ] Postflop GTO strategies
- [ ] Diversified AI opponents
- [ ] Hand history replay
- [ ] Additional training scenarios

### Phase 3 Features
- [ ] Multiplayer online battles
- [ ] Leaderboard system
- [ ] Data analytics dashboard
- [ ] Custom scenario editor

### Phase 4 Features
- [ ] Cloud GTO Solver integration
- [ ] Mobile application
- [ ] Video tutorial integration
- [ ] Community features

## 🛠️ Development Notes

### Project Structure
```
src/
├── components/          # React components
│   ├── Card.tsx        # Poker card component
│   ├── PokerTable.tsx  # Poker table component
│   ├── GtoFeedback.tsx # Feedback component
│   └── ...
├── lib/                # Core logic
│   ├── poker-engine.ts # Game engine
│   ├── gto-strategy.ts # GTO strategy
│   └── ...
├── types/              # TypeScript type definitions
└── pages/              # Next.js pages
```

### Code Standards
- TypeScript strict mode
- ESLint code checking
- Prettier code formatting
- Component-based development

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Issues and Pull Requests are welcome to improve the project!

---

## 中文

专业的策略决策游戏理论最优策略(GTO)训练平台，提供实时策略分析、场景化训练和专业数据可视化。

## 🎯 核心功能

### 1. GTO 策略热力图
- **手牌范围可视化**: 13x13 网格展示所有起手牌的 GTO 策略
- **动态筛选**: 支持按对子、同花、非同花筛选
- **详细分析**: 悬停查看每手牌的具体行动频率（Raise/Call/Fold）
- **数据导出**: 支持 CSV 格式导出策略数据

### 2. 实时训练模式
- **交互式训练界面**: 完整的策略决策游戏界面
- **即时反馈**: 每次决策后获得 GTO 分析和评分
- **位置策略**: 针对不同位置（UTG, CO, BTN, SB, BB）的专业策略建议
- **进度跟踪**: 实时统计平均得分和手数

### 3. 场景化训练
- **多种训练场景**: 6 个精心设计的训练场景
- **难度分级**: 初级、中级、高级三个难度等级
- **智能推荐**: 根据玩家表现推荐合适的训练场景
- **学习目标**: 每个场景都有明确的学习重点

## 🏗️ 技术架构

### 前端技术栈
- **React 18** + **TypeScript**: 现代化组件开发
- **Next.js 14**: 全栈框架，支持 SSR
- **Tailwind CSS**: 快速响应式样式开发
- **组件化设计**: 可复用的 UI 组件系统

### 核心模块

#### 1. 策略引擎 (`src/lib/strategy-engine.ts`)
```typescript
class PokerEngine {
  // 完整的策略决策规则实现
  createDeck(): Card[]           // 洗牌发牌
  processAction(): boolean       // 处理玩家行动
  dealCommunityCards(): void     // 发放公共牌
  isBettingRoundComplete(): boolean // 判断决策轮结束
}
```

#### 2. GTO 策略引擎 (`src/lib/gto-strategy.ts`)
```typescript
class GtoStrategyEngine {
  // 基于位置的 GTO 策略推荐
  getGtoRecommendation(): GtoStrategy    // 获取 GTO 建议
  analyzeAction(): ActionAnalysis        // 分析玩家行动
  getHandRanking(): number               // 手牌强度排名
}
```

#### 3. 手牌范围管理 (`src/lib/hand-ranges.ts`)
```typescript
class HandRangeManager {
  // 手牌范围解析和管理
  parseRange(rangeString: string): HandRange     // 解析范围字符串
  getRangeStats(): RangeStatistics               // 获取范围统计
  isInRange(): boolean                           // 判断手牌是否在范围内
}
```

#### 4. 训练场景系统 (`src/lib/training-scenarios.ts`)
```typescript
class TrainingScenarioManager {
  // 训练场景管理和生成
  getAllScenarios(): TrainingScenario[]          // 获取所有场景
  getRecommendedScenarios(): TrainingScenario[]  // 智能推荐场景
  generateScenarioHand(): ScenarioSetup          // 生成场景设置
}
```

### UI 组件系统

#### 牌桌组件
- **PokerTable**: 主牌桌界面
- **PlayerSeat**: 玩家席位显示
- **CommunityCards**: 公共牌区域
- **ActionButtons**: 行动按钮组

#### 分析组件
- **GtoHeatmap**: 策略热力图
- **GtoFeedback**: 即时反馈模态框
- **ScenarioSelector**: 场景选择器

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:3000` 开始使用。

### 构建生产版本
```bash
npm run build
npm start
```

## 📊 训练场景详解

### 初级场景
1. **Button vs Big Blind (Deep Stack)**: 深资源按钮位训练
2. **Under The Gun (6-max)**: UTG 位置紧手范围练习

### 中级场景
3. **Cutoff Steal Attempt**: CO 位置偷盲策略
4. **Middle Position 3-Bet Defense**: 中位 3-bet 防守

### 高级场景
5. **Small Blind vs Big Blind**: 盲位对抗复杂决策
6. **Tournament Bubble Play**: 锦标赛泡沫期策略

## 🎨 界面特色

### 专业训练界面设计
- 真实感训练界面布局
- 流畅的动画效果
- 直观的信息展示

### 智能反馈系统
- 0-100 分评分制度
- 详细的决策分析
- 彩色编码的策略频率

### 数据可视化
- 热力图颜色编码
- 实时统计图表
- 进度跟踪面板

## 🔮 功能规划

### ✅ 第一阶段功能 (已完成)
- ✅ **13×13 GTO策略热力图** - 完整翻前策略可视化
- ✅ **6个专业训练场景** - 从初级到高级的系统化训练
- ✅ **实时GTO分析** - 每次决策的即时反馈和评分
- ✅ **成就系统** - 激励机制和进度追踪
- ✅ **专业UI设计** - 现代化用户界面

### 🚀 第二阶段功能 (开发中)
- 🔄 **翻后GTO策略引擎** - 支持Flop/Turn/River完整策略计算
- 🔄 **AI对手多样化** - 4种性格迥异的AI对手 (新手/紧凶/松凶/适应性)
- 🔄 **手牌历史回放** - 完整牌局回放和深度分析
- 🔄 **智能训练系统** - 个性化场景推荐和学习路径
- 🔄 **本地存储优化** - 75MB本地存储，数据压缩，离线可用

### 📋 第三阶段功能 (规划中)
- 🔲 **多人在线对战** - 实时多人游戏，智能匹配系统
- 🔲 **云端数据同步** - 跨设备数据同步和备份
- 🔲 **高级数据分析** - 大数据驱动的深度统计分析
- 🔲 **社区功能** - 策略分享、讨论区、直播功能

### 🔮 第四阶段功能 (远期规划)
- 🔲 **自研GTO Solver** - 完全自主的GTO计算引擎
- 🔲 **移动原生应用** - iOS/Android原生应用
- 🔲 **AR/VR训练** - 沉浸式训练体验
- 🔲 **企业培训解决方案** - B2B专业培训服务

## 📚 项目文档

### 🎯 核心文档
- **[第二阶段功能实现方案](docs/第二阶段功能实现方案.md)** - 详细的功能设计和技术方案
- **[技术规范文档](docs/技术规范文档.md)** - 完整的技术规范和开发标准
- **[开发工作流程](docs/开发工作流程.md)** - 12周开发计划和任务分解
- **[项目路线图](docs/项目路线图.md)** - 完整的项目发展规划

### 📋 技术文档
- **[系统架构图](系统架构图.md)** - 系统架构设计和演进路线
- **[CFR算法说明](CFR.md)** - 核心算法实现参考

## 🎯 技术特色

### 🔧 第二阶段技术亮点
- **本地优先策略**: 核心功能完全本地化，2秒启动，100ms查询响应
- **智能存储管理**: IndexedDB + 数据压缩，75MB存储空间，60%+压缩率
- **AI对手引擎**: 4种性格AI，支持个性化学习和动态难度调整
- **翻后GTO算法**: 完整四条街道策略计算，支持复杂决策分析
- **云端扩展预留**: 完整的云端迁移接口，支持未来平滑升级

### 📊 性能指标
- **启动时间**: < 2秒 (目标)
- **查询响应**: < 100ms  
- **AI决策**: < 150ms
- **离线可用**: 100%核心功能
- **存储效率**: 75MB总容量，60%+压缩率

## 🛠️ 开发说明

### 项目结构
```
src/
├── components/          # React 组件
│   ├── Card.tsx        # 扑克牌组件
│   ├── PokerTable.tsx  # 牌桌组件
│   ├── GtoFeedback.tsx # 反馈组件
│   └── ...
├── lib/                # 核心逻辑
│   ├── poker-engine.ts # 游戏引擎
│   ├── gto-strategy.ts # GTO 策略
│   └── ...
├── types/              # TypeScript 类型定义
└── pages/              # Next.js 页面
```

### 代码规范
- TypeScript 严格模式
- ESLint 代码检查
- Prettier 代码格式化
- 组件化开发

## 📝 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目！

---

**AI Poker GTO 训练系统** - 让每一个决策都更接近最优解 🎯

