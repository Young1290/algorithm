# 风险评估系统使用指南

## 📋 概述

策略引擎 v2.0 新增了智能风险评估系统，能够：
- 评估账户资金充足性
- 计算加仓后的新爆仓价
- 分析资金使用比例
- 提供详细的风险警告

## 🎯 核心功能

### 1. 资金充足性检查

系统会检查每个策略所需资金是否超过可用余额。

**示例**：
```
可用余额: $5,000
策略所需: $15,000
结果: 🚫 资金不足
```

### 2. 资金使用比例分析

评估策略会占用多少比例的可用资金。

**风险等级**：
- < 50%: ✅ 推荐（安全）
- 50-80%: ℹ️ 中等风险
- > 80%: ⚠️ 资金紧张（高风险）
- 100%: 🚫 All-in（极高风险）

### 3. 爆仓价估算

对于杠杆加仓策略，系统会估算加仓后的新爆仓价。

**计算逻辑**：
```typescript
// Long 仓位
newLiqPrice = newAvgPrice * (1 - 1/leverage + 0.005)

// Short 仓位
newLiqPrice = newAvgPrice * (1 + 1/leverage - 0.005)
```

**风险判断**：
- 新爆仓价距现价 > 5%: ✅ 安全
- 新爆仓价距现价 3-5%: ⚠️ 注意
- 新爆仓价距现价 < 3%: ☠️ 爆仓预警

## 📊 使用方法

### 方法 1: 提供完整账户信息（推荐）

```
用户: 我持有 0.5 BTC，均价 $90,000，想赚 $10,000。
     我的账户可用余额是 $8,000，总权益 $50,000。
     当前爆仓价是 $81,000。
```

系统会调用：
```typescript
planToAchieveProfitTarget({
  symbol: 'BTC',
  position: {
    direction: 'long',
    avgPrice: 90000,
    qty: 0.5,
    leverage: 10,
    liquidationPrice: 81000
  },
  account: {
    availableBalance: 8000,
    totalWalletBalance: 50000
  },
  targetProfitMYR: 10000
})
```

**输出示例**：
```markdown
## 📊 策略引擎分析报告

### 1. 账户与持仓概况
> **当前价格**: $92,688
> **当前盈亏**: $1,344
> **目标差距**: $8,656 (86.6%)

### 2. 建议行动方案

#### ✅ 推荐 | 🔥 10x 杠杆加仓
> **💡 评估**: 资金充足，风险在可控范围内。

- **动作**: Long Buy
- **数量**: 0.0935 BTC
- **所需资金**: **$867.00**
- **执行价格**: $92,688
- **数据预测**: 新均价: $90,427 | 预估新爆仓价: $81,384
- **逻辑**: 价格反弹至 $94,078 即可达标。

---

#### ⚠️ 资金紧张 | 🛡️ 买入现货
> **⚠️ 警告**: 将占用 98% 可用资金，容错率极低。

- **动作**: Spot Buy
- **数量**: 0.0935 BTC
- **所需资金**: **$7,836.00**
- **执行价格**: $92,688
- **逻辑**: 使用 1:1 实盘资金，无爆仓风险。

---
```

### 方法 2: 不提供账户信息

```
用户: 我持有 0.5 BTC，均价 $90,000，想赚 $10,000。
```

系统会调用：
```typescript
planToAchieveProfitTarget({
  symbol: 'BTC',
  position: {
    direction: 'long',
    avgPrice: 90000,
    qty: 0.5,
    leverage: 10
  },
  targetProfitMYR: 10000
  // 没有 account 参数
})
```

**输出示例**：
```markdown
#### ℹ️ 未检测资金 | 🔥 10x 杠杆加仓
> **💡 评估**: 未提供账户余额，无法评估资金充足性。

- **动作**: Long Buy
- **数量**: 0.0935 BTC
- **所需资金**: **$867.00**
- **执行价格**: $92,688
- **逻辑**: 价格反弹至 $94,078 即可达标。
```

## 🚨 风险标签详解

### ✅ 推荐 (RECOMMENDED)

**条件**：
- 资金充足（所需 < 可用）
- 资金使用率 < 80%
- 爆仓价距离 > 3%（如适用）

**建议**: 可以执行，风险在可控范围内。

---

### ⚠️ 资金紧张 (HIGH_RISK)

**条件**：
- 资金使用率 > 80%
- 或爆仓价距现价 3-5%

**警告**: 
- 容错率低，市场波动可能导致爆仓
- 建议减少仓位或等待更好时机

---

### 🚫 资金不足 (INSUFFICIENT_FUNDS)

**条件**：
- 所需资金 > 可用余额

**警告**: 
- 无法执行此策略
- 需要充值或选择其他策略

---

### ☠️ 爆仓预警 (HIGH_RISK)

**条件**：
- 加仓后新爆仓价距现价 < 3%

**警告**: 
- 极度危险！
- 轻微波动即可能爆仓
- 强烈不建议执行

---

### ℹ️ 未检测资金 (RECOMMENDED)

**条件**：
- 用户未提供账户信息

**说明**: 
- 无法评估资金充足性
- 建议提供账户信息以获得更准确的风险评估

## 💡 最佳实践

### 1. 始终提供账户信息

提供完整的账户信息可以获得：
- 更准确的风险评估
- 资金使用比例分析
- 个性化的策略建议

### 2. 关注风险标签

- ✅ 推荐：可以执行
- ⚠️ 资金紧张：谨慎执行
- 🚫 资金不足：不要执行
- ☠️ 爆仓预警：绝对不要执行

### 3. 留有安全边际

建议策略：
- 单次使用 < 30% 可用资金
- 保留至少 20% 作为应急资金
- 避免 All-in

### 4. 监控爆仓价

- 定期检查当前爆仓价
- 加仓前评估新爆仓价
- 确保爆仓价距现价 > 5%

### 5. 分批执行

对于大额策略：
- 分 2-3 次执行
- 每次观察市场反应
- 降低单次风险

## 📈 实战案例

### 案例 1: 资金充足，风险可控

**用户输入**：
```
持仓: 1 BTC @ $90,000 (Long, 10x)
目标: 赚 $5,000
账户: 可用 $10,000
```

**系统评估**：
```
策略 1: 10x 加仓
- 所需: $450
- 使用率: 4.5%
- 标签: ✅ 推荐
```

**建议**: 执行，风险极低。

---

### 案例 2: 资金紧张

**用户输入**：
```
持仓: 0.5 BTC @ $90,000 (Long, 10x)
目标: 赚 $10,000
账户: 可用 $1,000
```

**系统评估**：
```
策略 1: 10x 加仓
- 所需: $867
- 使用率: 86.7%
- 标签: ⚠️ 资金紧张
```

**建议**: 谨慎执行，建议充值或降低目标。

---

### 案例 3: 爆仓预警

**用户输入**：
```
持仓: 2 BTC @ $95,000 (Long, 20x)
当前价: $92,000
爆仓价: $90,250
目标: 回本
```

**系统评估**：
```
策略 1: 20x 加仓
- 新爆仓价: $91,500
- 距现价: 0.5%
- 标签: ☠️ 爆仓预警
```

**建议**: 绝对不要执行！考虑止损或对冲。

---

### 案例 4: 资金不足

**用户输入**：
```
持仓: 0.1 BTC @ $90,000 (Long, 10x)
目标: 赚 $50,000
账户: 可用 $500
```

**系统评估**：
```
策略 2: 现货买入
- 所需: $46,000
- 可用: $500
- 标签: 🚫 资金不足
```

**建议**: 无法执行，需要充值或大幅降低目标。

## ⚙️ 技术细节

### 爆仓价计算公式

```typescript
function estimateNewLiquidationPrice(
  position: Position,
  addQty: number,
  addPrice: number,
  newAvgPrice: number
): number {
  const leverage = position.leverage || 10;
  
  if (position.direction === 'long') {
    // Long: 爆仓价在均价下方
    return newAvgPrice * (1 - (1 / leverage) + 0.005);
  } else {
    // Short: 爆仓价在均价上方
    return newAvgPrice * (1 + (1 / leverage) - 0.005);
  }
}
```

### 风险评估逻辑

```typescript
function evaluateStrategySuitability(
  requiredCapital: number,
  account: Account | undefined,
  strategyType: string,
  currentPrice: number,
  newLiquidationPrice?: number
): StrategyEvaluation {
  // 1. 无账户信息
  if (!account) {
    return {
      status: 'RECOMMENDED',
      label: 'ℹ️ 未检测资金',
      reason: '未提供账户余额，无法评估资金充足性。'
    };
  }

  // 2. 资金不足
  if (requiredCapital > account.availableBalance) {
    return {
      status: 'INSUFFICIENT_FUNDS',
      label: '🚫 资金不足',
      reason: `需 $${requiredCapital.toFixed(2)}，可用仅 $${account.availableBalance.toFixed(2)}`
    };
  }

  // 3. 资金占比过高
  const capitalUsagePct = requiredCapital / account.availableBalance;
  if (capitalUsagePct > 0.8) {
    return {
      status: 'HIGH_RISK',
      label: '⚠️ 资金紧张',
      reason: `将占用 ${Math.round(capitalUsagePct * 100)}% 可用资金，容错率极低。`
    };
  }

  // 4. 爆仓风险
  if (strategyType === 'leverage_add' && newLiquidationPrice) {
    const dist = Math.abs(currentPrice - newLiquidationPrice) / currentPrice;
    if (dist < 0.03) {
      return {
        status: 'HIGH_RISK',
        label: '☠️ 爆仓预警',
        reason: `加仓后爆仓价 ($${newLiquidationPrice.toFixed(2)}) 极度逼近现价，风险极高。`
      };
    }
  }

  // 5. 推荐
  return {
    status: 'RECOMMENDED',
    label: '✅ 推荐',
    reason: '资金充足，风险在可控范围内。'
  };
}
```

## 🔗 相关文档

- [策略引擎文档](./STRATEGY_ENGINE.md)
- [使用示例](./USAGE_EXAMPLES.md)
- [快速参考](./QUICK_REFERENCE.md)

---

**版本**: v2.0  
**更新日期**: 2025-11-20  
**状态**: ✅ 已完成
