# 动态策略引擎文档 v2.0

## 概述

动态策略引擎是一个智能交易策略生成系统，能够：
- 实时获取 Binance 市场数据
- 根据当前持仓和目标盈利自动生成多种策略
- **新增：智能风险评估系统**
  - 评估账户资金充足性
  - 计算加仓后的新爆仓价
  - 分析资金使用比例
  - 提供风险等级标签
- 提供 5 种不同风险等级的策略方案
- 支持多种加密货币 (BTC, ETH, SOL, BNB) 等加密货币交易设计。

## 核心功能

### 1. 实时市场数据 (Real-time Market Data)

**工具**: `getBinanceMarketData`

从 Binance 公共 API 获取实时价格和市场统计数据。

**支持的币种**:
- BTC (Bitcoin)
- ETH (Ethereum)
- SOL (Solana)
- BNB (Binance Coin)
- XRP (Ripple)
- ADA (Cardano)

**数据包含**:
- 当前价格
- 24小时最高/最低价
- 24小时成交量
- 24小时价格变化百分比

**使用示例**:
```
用户: BTC现在多少钱？
助手: [自动调用 getBinanceMarketData 工具]
```

### 2. 盈利目标策略规划 (Profit Target Strategy Planning)

**工具**: `planToAchieveProfitTarget`

根据当前持仓和目标盈利，生成 5 种不同的策略方案。

#### 策略类型

##### 策略 1: 🔥 10x 杠杆加仓 (Leverage Add)
- **风险**: 高
- **资金效率**: 最高
- **适用场景**: 确信价格会反弹，想用最少资金达成目标
- **计算逻辑**: 利用 10x 杠杆，在当前价格附近加仓，只需价格小幅反弹即可达成目标

##### 策略 2: 🛡️ 买入现货 (Spot Buy)
- **风险**: 低
- **资金效率**: 低
- **适用场景**: 长期看好，不想承担爆仓风险
- **计算逻辑**: 使用 1:1 实盘资金买入，无杠杆，适合长期持有

##### 策略 3: ⚖️ 对冲策略 (Smart Hedge)
- **风险**: 中
- **资金效率**: 中
- **适用场景**: 不确定方向，想通过波动率赚钱
- **计算逻辑**: 开反向单，在价格继续逆向移动时通过对冲单盈利

##### 策略 4: 🍹 混合策略 (Mixed Action)
- **风险**: 中
- **资金效率**: 中
- **适用场景**: 想要平衡风险和收益
- **计算逻辑**: 50% 资金做加仓，50% 资金做对冲，双向操作

##### 策略 5: 🎯 盈利逼近目标 / 🎉 目标已达成
- **触发条件**: 当前盈利 >= 目标的 85%
- **建议**: 立即挂单止盈，不要继续加仓增加风险

#### 输入参数

```typescript
{
  symbol: 'BTC' | 'ETH' | 'SOL' | 'BNB',
  currentPrice?: number,  // 可选，不填会自动从 Binance 获取 (USD)
  position: {
    direction: 'long' | 'short',
    avgPrice: number,      // 持仓均价 (USD)
    qty: number,           // 持仓数量
    leverage: number,      // 杠杆倍数，默认 10x
    margin?: number        // 保证金 (USD)
  },
  targetProfitMYR: number,        // 目标盈利金额 (USD)
  conservativeMode?: boolean,      // 保守模式，默认 true
  maxAdditionalCapital?: number   // 最大追加资金限制 (USD)
}
```

**注意**: 所有价格和金额单位均为 **USD (美元)**，因为 Binance API 返回的是美元价格。

#### 新增：账户信息参数（可选）

```typescript
account?: {
  availableBalance: number;  // 可用 USDT 余额
  totalWalletBalance: number; // 总权益
}
```

如果提供账户信息，策略引擎会：
1. 检查资金是否充足
2. 计算资金使用比例
3. 评估 All-in 风险
4. 为每个策略添加风险标签

#### 新增：爆仓价参数（可选）

```typescript
position: {
  // ... 其他字段
  liquidationPrice?: number;  // 当前爆仓价 (USD)
}
```

如果提供当前爆仓价，引擎会估算加仓后的新爆仓价。

#### 风险评估标签

策略引擎会为每个策略添加评估标签：

| 标签 | 状态 | 说明 |
|-----|------|------|
| ✅ 推荐 | RECOMMENDED | 资金充足，风险可控 |
| ⚠️ 资金紧张 | HIGH_RISK | 资金使用率 > 80% |
| 🚫 资金不足 | INSUFFICIENT_FUNDS | 可用余额不足 |
| ☠️ 爆仓预警 | HIGH_RISK | 新爆仓价距现价 < 3% |
| ℹ️ 未检测资金 | RECOMMENDED | 未提供账户信息 |

#### 输出示例（带风险评估）

```markdown
## 📊 策略引擎分析报告

### 1. 账户与持仓概况
> **当前价格**: $95000
> **当前盈亏**: $-5000
> **目标差距**: $15000 (150%)

### 2. 建议行动方案

#### ✅ 推荐 | 🔥 10x 杠杆加仓
> **💡 评估**: 资金充足，风险在可控范围内。

- **动作**: Long Buy
- **数量**: 0.1579 BTC
- **所需资金**: **$1492.68**
- **执行价格**: $94525
- **数据预测**: 新均价: $93200 | 预估新爆仓价: $84180
- **逻辑**: 价格反弹至 $96425 即可达标。

---

#### 🚫 资金不足 | 🛡️ 买入现货
> **⚠️ 警告**: 需 $14925.00，可用仅 $5000.00

- **动作**: Spot Buy
- **数量**: 0.1579 BTC
- **所需资金**: **$14925.00**
- **执行价格**: $94525
- **逻辑**: 使用 1:1 实盘资金，无爆仓风险。

---

[... 其他策略 ...]
```

## 使用场景

### 场景 1: 查询当前价格
```
用户: BTC现在多少钱？
系统: [调用 getBinanceMarketData]
      当前价格: $95,234
      24h涨跌: +2.34%
```

### 场景 2: 制定回本策略
```
用户: 我在 102313、83888、78888 买入 BTC，金额分别是 30万、30万、100万。
     现在亏了 5万，我想赚回 10万，有什么策略？
     
系统: [调用 planToAchieveProfitTarget]
      生成 5 种策略，包括加仓、现货、对冲等方案
```

### 场景 3: 动态价格策略
```
用户: 我持有 0.5 BTC，均价 90000，想赚 20000，但不知道现在价格多少
系统: [自动调用 getBinanceMarketData 获取价格]
      [然后调用 planToAchieveProfitTarget 生成策略]
```

## 技术架构

### 文件结构
```
app/
├── api/
│   ├── chat+api.ts              # 主 API 路由，集成所有工具
│   ├── planToAchieveTP.js       # 原始策略逻辑（已整合）
│   └── getBinanceData.js        # 原始数据获取（已整合）
└── lib/
    └── strategy-engine.ts       # 统一的策略引擎模块
```

### 核心模块

#### `strategy-engine.ts`
- `fetchBinancePrice()`: 获取实时价格
- `fetchBinance24hStats()`: 获取24小时统计数据
- `calculateRequiredQty()`: 计算所需仓位
- `generateStrategies()`: 生成策略方案
- `formatStrategyOutput()`: 格式化输出

#### `chat+api.ts`
- 集成 DeepSeek AI 模型
- 定义工具接口
- 处理用户请求
- 调用策略引擎

## API 端点

### Binance Public API
- **价格查询**: `https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT`
- **24h统计**: `https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT`

### 注意事项
- 使用 Binance 公共 API，无需 API key
- 有速率限制，建议合理使用
- 价格数据仅供参考，实际交易以交易所为准

## 风险提示

⚠️ **重要提示**:
1. 本系统仅提供策略建议，不构成投资建议
2. 加密货币交易风险极高，可能导致全部本金损失
3. 杠杆交易风险更高，请谨慎使用
4. 策略计算基于数学模型，实际市场可能不同
5. 请根据自身风险承受能力做出决策

## 未来扩展

### 计划功能
- [ ] 支持更多交易所 (OKX, Bybit)
- [ ] 历史价格分析
- [ ] 波动率计算
- [ ] 风险评估模型
- [ ] 自动止损/止盈建议
- [ ] 仓位管理优化
- [ ] 多币种组合策略

## 更新日志

### v1.0.0 (2025-11-20)
- ✅ 集成 Binance 实时价格 API
- ✅ 实现 5 大策略生成引擎
- ✅ 支持自动价格获取
- ✅ 多语言支持 (中文/英文)
- ✅ 集成到 DeepSeek AI 助手
