# 货币单位更新说明 (Currency Update)

## 📝 更新日期
2025-11-20

## 🔄 更新内容

### 从 MYR 改为 USD

所有价格和金额单位已从 **MYR (马来西亚林吉特)** 统一更新为 **USD (美元)**。

### 原因

Binance API 返回的价格数据是以 **USD (美元)** 为单位，为了保持一致性和准确性，整个系统统一使用 USD。

## ✅ 更新的文件

### 1. 代码文件

#### `app/api/chat+api.ts`
- ✅ 所有工具的输入参数描述
- ✅ 市场数据显示格式
- ✅ 系统提示中添加货币说明

**更新内容**:
- `Entry price for this trade in MYR` → `Entry price for this trade in USD`
- `Ringgit amount invested` → `USD amount invested`
- `Target profit amount in MYR/USDT` → `Target profit amount in USD`
- 所有显示输出添加 "USD" 标签

#### `app/lib/strategy-engine.ts`
- ✅ 策略输出格式化函数
- ✅ 所有价格和金额显示

**更新内容**:
- `${currentStatus.pnl} MYR` → `$${currentStatus.pnl} USD`
- `${strategy.requiredCapital} MYR` → `$${strategy.requiredCapital} USD`
- 所有价格显示添加 "$" 符号和 "USD" 标签

### 2. 文档文件

#### `docs/STRATEGY_ENGINE.md`
- ✅ 输入参数说明
- ✅ 输出示例
- ✅ 添加货币单位注意事项

#### 其他文档
- `docs/USAGE_EXAMPLES.md` - 待更新
- `docs/QUICK_REFERENCE.md` - 待更新
- `docs/IMPLEMENTATION_SUMMARY.md` - 待更新

## 💡 使用示例

### 更新前 (MYR)
```
用户: 我在 RM102,313 买入 BTC
系统: 当前盈亏: 5000 MYR
```

### 更新后 (USD)
```
用户: 我在 $102,313 买入 BTC
系统: 当前盈亏: $5000 USD
```

## 🔍 关键变化

### 1. 价格输入
- **之前**: RM102,313 (马来西亚林吉特)
- **现在**: $102,313 USD (美元)

### 2. 金额显示
- **之前**: 所需资金: 1492.68 MYR
- **现在**: 所需资金: $1492.68 USD

### 3. 市场数据
- **之前**: 现价: $95,234
- **现在**: 现价: $95,234 USD

### 4. 系统提示
添加了明确说明：
- 英文: "ALL prices and amounts are in USD (United States Dollars)"
- 中文: "所有价格和金额都使用美元 (USD)"

## 📊 影响范围

### 受影响的功能
1. ✅ 仓位分析 (`analyzeTradePosition`)
2. ✅ 目标价格计算 (`calculateTargetPrices`)
3. ✅ 仓位调整建议 (`suggestPositionAdjustment`)
4. ✅ 市场数据查询 (`getBinanceMarketData`)
5. ✅ 策略规划 (`planToAchieveProfitTarget`)

### 不受影响的功能
- 数量计算 (BTC 数量)
- 百分比计算
- 杠杆倍数
- 方向判断 (long/short)

## 🎯 用户注意事项

### 重要提示
⚠️ **所有价格和金额现在都是 USD (美元)**

### 使用建议
1. 输入价格时使用美元单位
2. 查看结果时注意 "USD" 标签
3. 如需转换为其他货币，请自行计算汇率

### 示例对话

**正确** ✅:
```
用户: 我在 $90,000 买入 0.5 BTC，想赚 $10,000
系统: [生成策略，所有金额显示为 USD]
```

**不正确** ❌:
```
用户: 我在 RM90,000 买入 0.5 BTC
系统: [可能产生混淆，因为系统期望 USD]
```

## 🔄 汇率转换

如果你习惯使用 MYR (马来西亚林吉特)，可以使用以下方式转换：

### MYR → USD
```
USD = MYR ÷ 汇率
例如: RM4.50 = $1 USD
RM90,000 = $20,000 USD
```

### USD → MYR
```
MYR = USD × 汇率
例如: $1 USD = RM4.50
$20,000 USD = RM90,000
```

**注意**: 汇率会实时变化，请使用最新汇率。

## 📱 API 数据源

### Binance API
- **端点**: `https://api.binance.com/api/v3/ticker/price`
- **返回格式**: `{ "symbol": "BTCUSDT", "price": "95234.50" }`
- **货币单位**: USD (USDT)

### 数据一致性
- ✅ Binance 返回 USD 价格
- ✅ 系统使用 USD 计算
- ✅ 输出显示 USD 标签
- ✅ 完全一致，无需转换

## 🚀 后续计划

### 短期
- [ ] 更新所有文档中的示例
- [ ] 添加货币转换工具（可选）
- [ ] 更新测试用例

### 长期
- [ ] 支持多货币显示
- [ ] 自动汇率转换
- [ ] 用户自定义货币偏好

## ❓ 常见问题

### Q1: 为什么改用 USD？
A: Binance API 返回的是 USD 价格，使用 USD 可以避免转换误差，保持数据一致性。

### Q2: 可以使用其他货币吗？
A: 目前系统统一使用 USD。如需其他货币，请自行转换。

### Q3: 旧的 MYR 数据怎么办？
A: 需要按当前汇率转换为 USD 后再输入系统。

### Q4: 会影响计算准确性吗？
A: 不会。使用 USD 反而提高了准确性，因为直接使用 Binance 的原始数据。

### Q5: 如何快速转换货币？
A: 可以使用在线汇率转换器，或者记住大致汇率（如 1 USD ≈ 4.5 MYR）。

## 📞 支持

如有任何问题或建议，请查看：
- [完整文档](./STRATEGY_ENGINE.md)
- [使用示例](./USAGE_EXAMPLES.md)
- [快速参考](./QUICK_REFERENCE.md)

---

**更新完成** ✅  
所有价格和金额现在统一使用 **USD (美元)**！
