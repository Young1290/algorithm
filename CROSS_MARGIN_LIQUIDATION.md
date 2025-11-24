# 全仓模式强平价计算说明

**更新时间**: 2025-11-21  
**版本**: v3.2  
**状态**: ✅ 已验证

---

## 🎯 全仓模式 (Cross Margin) 概述

全仓模式使用**账户总余额**来抵抗爆仓，而不是仅使用单个仓位的保证金。

### 特点：
- ✅ **风险分散**：所有可用余额都可用于维持仓位
- ✅ **抗风险能力强**：不容易爆仓
- ⚠️ **风险共担**：一个仓位爆仓会影响整个账户

---

## 📐 强平价计算公式

### 全仓模式强平价公式：

```
强平价 = 均价 ± (钱包总余额 / 总持仓量)
```

**多头 (Long)**:
```
强平价 = 均价 - (钱包总余额 / 总持仓量)
```

**空头 (Short)**:
```
强平价 = 均价 + (钱包总余额 / 总持仓量)
```

### 推导逻辑：

1. **爆仓条件**: 当亏损额 = 钱包总余额时触发强平
2. **亏损额计算**: `|当前价 - 均价| × 总持仓量`
3. **求解强平价**: 
   ```
   |强平价 - 均价| × 总持仓量 = 钱包总余额
   |强平价 - 均价| = 钱包总余额 / 总持仓量
   ```

---

## 💡 实际案例

### 案例：充足余额下的强平价

**场景**:
- 总资金: $2,000,000
- 原持仓: 3.1579 BTC @ $95,000
- 加仓: 15.0038 BTC @ $80,860.73 (金字塔平均)
- 方向: Long (多头)

**计算过程**:

```python
# 1. 计算新状态
新总量 = 3.1579 + 15.0038 = 18.1617 BTC
新均价 = (3.1579 × 95000 + 15.0038 × 80860.73) / 18.1617
      = $83,319.22

# 2. 计算安全距离
安全距离 = $2,000,000 / 18.1617 BTC
        = $110,121.85 per BTC

# 3. 计算强平价
强平价 = $83,319.22 - $110,121.85
      = -$26,802.63
```

**结果分析**:
- ❌ 强平价为负数 → 不可能达到
- ✅ 说明：余额充足，几乎不可能爆仓
- ✅ 除非 BTC 跌到负数（不可能），否则不会爆仓

---

## 🎨 显示优化

### 问题：
直接显示 `$0.00` 或 `-$26,802.63` 会让用户困惑

### 解决方案：
使用友好的格式化显示

```typescript
function formatLiquidationPrice(
  liqPrice: number, 
  avgPrice: number, 
  direction: 'long' | 'short'
): string {
  // 多头：如果强平价 < 均价的10%，说明余额充足
  if (direction === 'long' && liqPrice < avgPrice * 0.1) {
    return `极低 (~$${liqPrice.toFixed(2)}) - 余额充足`;
  }
  
  // 空头：如果强平价 > 均价的10倍，说明余额充足
  if (direction === 'short' && liqPrice > avgPrice * 10) {
    return `极高 (~$${liqPrice.toFixed(2)}) - 余额充足`;
  }
  
  return liqPrice.toFixed(2);
}
```

### 显示效果：

```markdown
- **新强平价**: **极低 (~$0.00) - 余额充足**
- **建议止损**: **$80,970.30**
- **详情**: 全仓模式下，使用总钱包余额 $2,000,000 抵抗爆仓。
```

---

## 📊 不同余额下的强平价对比

| 场景 | 总余额 | 持仓量 | 均价 | 强平价 | 说明 |
|------|--------|--------|------|--------|------|
| 充足余额 | $2,000,000 | 18.16 BTC | $83,319 | $0 (极低) | 几乎不会爆仓 |
| 中等余额 | $500,000 | 18.16 BTC | $83,319 | $55,812 | 有一定风险 |
| 紧张余额 | $100,000 | 18.16 BTC | $83,319 | $77,813 | 风险较高 |
| 危险余额 | $50,000 | 18.16 BTC | $83,319 | $80,566 | ⚠️ 接近当前价 |

---

## 🔥 策略中的强平价计算

### 策略1：继续加仓（金字塔法则）

```typescript
// 计算加仓后的新状态
const newTotalQty = position.qty + qtyPyramid;
const newAvgPrice = (
  (position.qty * position.avgPrice) + 
  (qtyPyramid * pyramidPlan.avgPrice)
) / newTotalQty;

// 全仓强平价计算
const newLiqPrice = account 
  ? calculateCrossLiquidationPrice(
      newAvgPrice, 
      newTotalQty, 
      account.totalWalletBalance,  // 🔥 使用总钱包余额
      position.direction
    )
  : estimateNewLiquidationPrice(position, qtyPyramid, pyramidPlan.avgPrice, leverage);

// 格式化显示
newLiquidationPrice: formatLiquidationPrice(newLiqPrice, newAvgPrice, position.direction)
```

---

## ✅ 验证测试

### 测试结果：

```
======================================================================
🔥 全仓强平价测试
======================================================================

策略 1: 🔥 继续加仓 (10x) - 金字塔法则
  新强平价: 极低 (~$0.00) - 余额充足
  建议止损: $80,970.30

  说明: 采用金字塔法则，分 3 批建仓（20%/30%/50%），在不同价格点位
        逐步加仓，有效降低平均成本，同时控制单次风险。
        全仓模式下，使用总钱包余额 $2,000,000 抵抗爆仓。

======================================================================
```

### 验证要点：

✅ **计算正确**: 强平价 = 均价 - (余额 / 持仓量)  
✅ **全仓模式**: 使用 `account.totalWalletBalance`  
✅ **显示友好**: 负数或极低值显示为"极低 - 余额充足"  
✅ **说明清晰**: 明确标注使用全仓模式和总余额

---

## 🎯 与逐仓模式对比

| 特性 | 全仓模式 (Cross) | 逐仓模式 (Isolated) |
|------|-----------------|-------------------|
| **保证金来源** | 账户总余额 | 单个仓位保证金 |
| **强平价计算** | 基于总余额 | 基于仓位保证金 |
| **抗风险能力** | 🟢 强 | 🟡 中 |
| **风险隔离** | 🔴 否 | 🟢 是 |
| **适用场景** | 资金充裕、长期持有 | 风险控制、多仓位 |

---

## 📝 代码实现

### 核心函数：

```typescript
// 全仓强平价计算
function calculateCrossLiquidationPrice(
  avgPrice: number,
  totalQty: number,
  walletBalance: number,
  direction: 'long' | 'short'
): number {
  const safetyDistance = walletBalance / totalQty;
  
  if (direction === 'long') {
    const liqPrice = avgPrice - safetyDistance;
    return liqPrice > 0 ? liqPrice : 0;
  } else {
    return avgPrice + safetyDistance;
  }
}

// 强平价格式化
function formatLiquidationPrice(
  liqPrice: number, 
  avgPrice: number, 
  direction: 'long' | 'short'
): string {
  if (direction === 'long' && liqPrice < avgPrice * 0.1) {
    return `极低 (~$${liqPrice.toFixed(2)}) - 余额充足`;
  }
  if (direction === 'short' && liqPrice > avgPrice * 10) {
    return `极高 (~$${liqPrice.toFixed(2)}) - 余额充足`;
  }
  return liqPrice.toFixed(2);
}
```

---

## 🚀 未来优化

1. **动态风险提示**
   - 根据强平价与当前价的距离，给出风险等级
   - 例如：距离 < 5% → 🔴 高风险

2. **多仓位支持**
   - 考虑多个仓位的总体风险
   - 计算组合强平价

3. **实时监控**
   - 价格接近强平价时发出警告
   - 建议减仓或追加保证金

---

*最后更新: 2025-11-21*  
*维护者: AI Assistant*  
*状态: ✅ 已验证并投入使用*
