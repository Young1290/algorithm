# 强平价和止损价功能更新

**更新时间**: 2025-11-20  
**版本**: v2.1  
**状态**: ✅ 已完成并测试

---

## 📋 更新内容

### 1. 新增字段到 Strategy 接口

```typescript
interface Strategy {
  // ... 原有字段 ...
  
  // 🔥 风险管理字段
  newLiquidationPrice?: string; // 加仓后的新强平价 (USD)
  stopLossPrice?: string;       // 建议止损价 (USD)
}
```

### 2. 新增核心计算函数

#### calculateCrossLiquidationPrice
计算全仓强平价（基于余额抗单能力）

```typescript
function calculateCrossLiquidationPrice(
  avgPrice: number,
  totalQty: number,
  walletBalance: number,
  direction: 'long' | 'short'
): number
```

**逻辑**:
- 当 亏损额 = 钱包余额 时爆仓
- 亏损额 = |Price - Avg| × Qty
- 允许跌幅 (Distance) = Balance / Qty
- Long: 强平价 = 均价 - Distance
- Short: 强平价 = 均价 + Distance

#### calculateStopLossPrice
计算建议止损价（默认 2.5% - 3% 波动）

```typescript
function calculateStopLossPrice(
  avgPrice: number,
  direction: 'long' | 'short',
  riskPercent: number = 0.025
): number
```

**逻辑**:
- Long: 止损价 = 均价 × (1 - riskPercent)
- Short: 止损价 = 均价 × (1 + riskPercent)
- 10x杠杆下，2.5%价格波动 = 25%本金亏损

---

## 🎯 各策略的风险管理

### Strategy 1: 🔥 10x 杠杆加仓

**强平价计算**:
```typescript
const newTotalQty = position.qty + qtyLev;
const newAvgPrice = ((position.qty * position.avgPrice) + (qtyLev * addPrice)) / newTotalQty;

const newLiqPrice = calculateCrossLiquidationPrice(
  newAvgPrice, 
  newTotalQty, 
  account.totalWalletBalance, 
  position.direction
);
```

**止损价计算**:
```typescript
const newStopLoss = calculateStopLossPrice(newAvgPrice, position.direction, 0.025);
// 2.5% 波动 = 25% 本金亏损（10x杠杆）
```

**示例输出**:
```
- **新强平价**: **$68,991.88**
- **建议止损**: **$87,776.08**
```

---

### Strategy 2: 🛡️ 买入现货 (Spot)

**强平价**: 无（现货不会爆仓）

**止损价计算**:
```typescript
const newStopLossSpot = calculateStopLossPrice(newAvgPriceSpot, position.direction, 0.05);
// 现货给 5% 宽容度
```

**示例输出**:
```
- **新强平价**: **$无 (现货)**
- **建议止损**: **$85,525.42**
```

---

### Strategy 3: ⚖️ 对冲策略 (10x)

**强平价**: 已锁仓（对冲后风险被锁定）

**止损价计算**:
```typescript
const hedgeStopLoss = calculateStopLossPrice(currentPrice, hedgeDir, 0.02);
// 对冲单给 2% 宽容度
```

**示例输出**:
```
- **新强平价**: **$🔒 已锁仓 (Risk Locked)**
- **建议止损**: **$92,161.31**
```

---

### Strategy 4: 🍹 混合策略 (10x)

**强平价**: 动态（介于加仓和对冲之间）

**止损价计算**:
```typescript
const mixNewAvgPrice = ((position.qty * position.avgPrice) + (mixAddQty * addPrice)) / (position.qty + mixAddQty);
const mixStopLoss = calculateStopLossPrice(mixNewAvgPrice, position.direction, 0.03);
// 混合策略给 3% 宽容度
```

**示例输出**:
```
- **新强平价**: **$📊 动态 (Dynamic)**
- **建议止损**: **$87,426.15**
```

---

## 📊 输出格式更新

在 `formatStrategyOutput` 函数中添加：

```typescript
// 🔥 新增：强平价与止损价展示
if (s.newLiquidationPrice) {
  output += `- **新强平价**: **$${s.newLiquidationPrice}**\n`;
}
if (s.stopLossPrice) {
  output += `- **建议止损**: **$${s.stopLossPrice}**\n`;
}
```

---

## 🧪 测试结果

### 测试用例 1: 百分比盈利

**输入**:
```
我总资金为2,000,000，已经在90,000买了300,000的仓位，92,000买了500,000的仓位。现在我想要盈利20%。
```

**输出**:
```json
{
  "id": 1,
  "title": "🔥 10x 杠杆加仓",
  "newLiquidationPrice": "68991.88",
  "stopLossPrice": "87776.08",
  "note": "利用 10x 杠杆降低均价。新均价 $90026.75。"
}
```

**验证**:
- ✅ 强平价计算正确（基于全仓余额 $2,000,000）
- ✅ 止损价计算正确（新均价的 2.5% 下方）
- ✅ 所有策略都包含风险管理字段

---

## 📐 计算示例

### 场景: Long 仓位加仓

**当前状态**:
- 持仓: 8.77 BTC @ $91,250 (平均价)
- 总权益: $2,000,000
- 方向: Long

**加仓后**:
- 新增: 86.31 BTC @ $89,902
- 新总量: 95.08 BTC
- 新均价: $90,027

**强平价计算**:
```
safetyDistance = $2,000,000 / 95.08 BTC = $21,036 per BTC
强平价 = $90,027 - $21,036 = $68,991 ✅
```

**止损价计算**:
```
止损价 = $90,027 × (1 - 0.025) = $87,776 ✅
```

---

## 🎯 风险提示

### 强平价说明

1. **全仓模式**: 使用总权益计算，更准确反映实际风险
2. **保守估算**: 实际强平价可能略有不同（取决于交易所规则）
3. **动态变化**: 每次加仓/减仓后都会重新计算

### 止损价建议

| 策略类型 | 止损幅度 | 本金亏损（10x） | 适用场景 |
|---------|---------|----------------|---------|
| 杠杆加仓 | 2.5% | 25% | 激进交易 |
| 对冲策略 | 2.0% | 20% | 对冲单 |
| 混合策略 | 3.0% | 30% | 平衡风险 |
| 现货买入 | 5.0% | 5% | 长期持有 |

---

## 📝 文件修改清单

### 修改的文件:
- ✅ `/app/lib/strategy-engine.ts`
  - 添加 `newLiquidationPrice` 和 `stopLossPrice` 字段到 Strategy 接口
  - 添加 `calculateCrossLiquidationPrice` 函数
  - 添加 `calculateStopLossPrice` 函数
  - 更新所有策略生成逻辑
  - 更新输出格式化函数

### 删除的文件:
- ✅ `/app/api/getLiquidationPrice.ts` (临时参考文件)

---

## 🚀 下一步

### 可选优化:

1. **爆仓预警增强**
   - 当强平价距离现价 < 5% 时，显示 ☠️ 警告
   - 在风控评估中加入爆仓距离检查

2. **止损价优化**
   - 根据市场波动率动态调整止损幅度
   - 提供多档止损建议（保守/平衡/激进）

3. **可视化**
   - 在UI中显示价格区间图
   - 标注当前价、止盈价、止损价、强平价

---

## ✅ 完成状态

- [x] 添加强平价计算函数
- [x] 添加止损价计算函数
- [x] 更新 Strategy 接口
- [x] 更新所有策略生成逻辑
- [x] 更新输出格式
- [x] 测试验证
- [x] 文档编写

**状态**: ✅ 已完成并集成到主分支

---

*最后更新: 2025-11-20*  
*维护者: AI Assistant*
