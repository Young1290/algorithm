// engine-strategy.ts
// Dynamic Strategy Engine for Bitcoin Trading
// Integrates real-time price data, strategy calculations, and risk assessment

// ============================================
// 1. Binance API Integration (保持不变)
// ============================================

export async function fetchBinancePrice(symbol: string): Promise<number | null> {
  try {
    const pair = symbol.toUpperCase().endsWith('USDT') 
      ? symbol.toUpperCase() 
      : `${symbol.toUpperCase()}USDT`;
    
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
    const data = await response.json();
    
    if (!data.price) throw new Error('Price not found');
    return parseFloat(data.price);
  } catch (error) {
    console.error("Failed to fetch Binance price:", error);
    return null;
  }
}

export async function fetchBinance24hStats(symbol: string) {
  try {
    const pair = symbol.toUpperCase().endsWith('USDT') 
      ? symbol.toUpperCase() 
      : `${symbol.toUpperCase()}USDT`;
    
    const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`);
    const data = await response.json();
    
    return {
      price: parseFloat(data.lastPrice),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      volume24h: parseFloat(data.volume),
      priceChange24h: parseFloat(data.priceChange),
      priceChangePercent24h: parseFloat(data.priceChangePercent)
    };
  } catch (error) {
    console.error("Failed to fetch 24h stats:", error);
    return null;
  }
}

// ============================================
// 2. Interfaces & Types (新增 Account 和 Evaluation 字段)
// ============================================

interface Account {
  availableBalance: number; // 可用 USDT
  totalWalletBalance: number; // 总权益
}

interface Position {
  direction: 'long' | 'short';
  avgPrice: number;
  qty: number;
  leverage: number;
  margin?: number;
  liquidationPrice?: number; // 新增：当前强平价
}

interface StrategyParams {
  symbol: string;
  currentPrice: number;
  position: Position;
  account?: Account; // 新增：账户资金信息 (可选，如果不传则无法评估资金)
  targetProfitUSD: number;
  conservativeMode?: boolean;
  maxAdditionalCapital?: number;
}

interface StrategyEvaluation {
  status: 'RECOMMENDED' | 'HIGH_RISK' | 'INSUFFICIENT_FUNDS' | 'INEFFICIENT';
  label: string; // 例如 "✅ 推荐"
  reason: string;
}

interface Strategy {
  id: number;
  title: string;
  type: string;
  action: string;
  quantity?: string;
  price?: string;
  requiredCapital?: string;
  targetPrice?: string;
  limitPrice?: string;
  note: string;
  risk: string;
  composition?: Array<{ action: string; qty: string }>;
  description?: string;
  evaluation?: StrategyEvaluation; // 新增：策略评估结果
}

// ============================================
// 3. Helper Functions (新增风险评估逻辑)
// ============================================

export function calculateRequiredQty(
  position: Position,
  targetProfitUSD: number,
  addPrice: number,
  targetPrice: number
): number {
  let addQty = 0;
  
  if (position.direction === 'long') {
    const profitFromOld = (targetPrice - position.avgPrice) * position.qty;
    const remainder = targetProfitUSD - profitFromOld;
    const profitPerUnitNew = targetPrice - addPrice;
    
    if (profitPerUnitNew <= 0) return Infinity;
    addQty = remainder / profitPerUnitNew;
  } else {
    // Short
    const profitFromOld = (position.avgPrice - targetPrice) * position.qty;
    const remainder = targetProfitUSD - profitFromOld;
    const profitPerUnitNew = addPrice - targetPrice;
    
    if (profitPerUnitNew <= 0) return Infinity;
    addQty = remainder / profitPerUnitNew;
  }
  
  return addQty;
}

// 估算加仓后的新强平价 (简化模型)
function estimateNewLiquidationPrice(
  position: Position,
  addQty: number,
  addPrice: number,
  newAvgPrice: number
): number {
  // 这是一个近似计算，实际强平价取决于维持保证金率(MMR)
  // 基础公式: LiqPrice = EntryPrice * (1 - 1/Leverage + MMR) [Long]
  // 我们用简化的距离比例来估算
  const leverage = position.leverage || 10;
  const totalQty = position.qty + addQty;
  
  if (position.direction === 'long') {
    // Long: 爆仓价在均价下方
    return newAvgPrice * (1 - (1 / leverage) + 0.005); // 0.005 是缓冲
  } else {
    // Short: 爆仓价在均价上方
    return newAvgPrice * (1 + (1 / leverage) - 0.005);
  }
}

// 核心评估函数
function evaluateStrategySuitability(
  requiredCapital: number,
  account: Account | undefined,
  strategyType: string,
  currentPrice: number,
  newLiquidationPrice?: number
): StrategyEvaluation {
  // 1. 如果没有账户信息，默认不做资金检查，但在报告中注明
  if (!account) {
    return {
      status: 'RECOMMENDED',
      label: 'ℹ️ 未检测资金',
      reason: '未提供账户余额，无法评估资金充足性。'
    };
  }

  // 2. 资金不足检查
  if (requiredCapital > account.availableBalance) {
    return {
      status: 'INSUFFICIENT_FUNDS',
      label: '🚫 资金不足',
      reason: `需 $${requiredCapital.toFixed(2)}，可用仅 $${account.availableBalance.toFixed(2)}`
    };
  }

  // 3. 资金占比过高检查 (All-in 风险)
  const capitalUsagePct = requiredCapital / account.availableBalance;
  if (capitalUsagePct > 0.8) {
    return {
      status: 'HIGH_RISK',
      label: '⚠️ 资金紧张',
      reason: `将占用 ${Math.round(capitalUsagePct * 100)}% 可用资金，容错率极低。`
    };
  }

  // 4. 爆仓风险检查 (针对加仓)
  if (strategyType === 'leverage_add' && newLiquidationPrice) {
    const dist = Math.abs(currentPrice - newLiquidationPrice) / currentPrice;
    // 如果新爆仓价距离现价小于 3%，极度危险
    if (dist < 0.03) {
      return {
        status: 'HIGH_RISK',
        label: '☠️ 爆仓预警',
        reason: `加仓后爆仓价 ($${newLiquidationPrice.toFixed(2)}) 极度逼近现价，风险极高。`
      };
    }
  }

  return {
    status: 'RECOMMENDED',
    label: '✅ 推荐',
    reason: '资金充足，风险在可控范围内。'
  };
}

// ============================================
// 4. Main Logic: Generate Strategies
// ============================================

export function generateStrategies(params: StrategyParams) {
  const { symbol, currentPrice, position, account, targetProfitUSD, conservativeMode = true } = params;
  const leverage = position.leverage || 10;
  
  // Calculate current P&L
  const dir = position.direction === 'long' ? 1 : -1;
  const currentPnl = (currentPrice - position.avgPrice) * position.qty * dir;
  const pnlDiff = targetProfitUSD - currentPnl;
  
  // Strategy 5: Target Met or Near Target (Check first)
  if (pnlDiff <= 0 || currentPnl >= targetProfitUSD * 0.85) {
    const actionType = pnlDiff <= 0 ? "TARGET_MET" : "NEAR_TARGET";
    const closePrice = position.direction === 'long' 
      ? position.avgPrice + (targetProfitUSD / position.qty)
      : position.avgPrice - (targetProfitUSD / position.qty);

    return {
      status: actionType,
      currentPnl: currentPnl.toFixed(2),
      targetPnl: targetProfitUSD,
      gap: pnlDiff.toFixed(2),
      strategies: [{
        id: 5,
        title: pnlDiff <= 0 ? "🎉 目标已达成" : "🎯 盈利逼近目标",
        type: 'limit_close',
        action: `Limit Close`,
        limitPrice: closePrice.toFixed(2),
        description: pnlDiff <= 0 
          ? `当前盈利已覆盖目标。建议立即止盈。`
          : `当前盈利已达目标的 ${(currentPnl/targetProfitUSD*100).toFixed(1)}%。建议在 $${closePrice.toFixed(2)} 挂单。`,
        note: '无需额外资金',
        risk: 'Low',
        evaluation: { status: 'RECOMMENDED', label: '✅ 推荐', reason: '锁定利润最佳时机' }
      }]
    };
  }

  const strategies: Strategy[] = [];
  const addPrice = conservativeMode ? currentPrice * 0.995 : currentPrice;
  const recoveryTargetPrice = position.direction === 'long' 
    ? currentPrice * 1.015 
    : currentPrice * 0.985;

  // --- Strategy 1: 10x Leverage Add ---
  const qtyLev = calculateRequiredQty(position, targetProfitUSD, addPrice, recoveryTargetPrice);
  
  if (qtyLev > 0 && isFinite(qtyLev)) {
    const marginRequired = (qtyLev * addPrice) / leverage;
    
    // 计算新均价和新爆仓价用于评估
    const newTotalQty = position.qty + qtyLev;
    const newAvgPrice = ((position.qty * position.avgPrice) + (qtyLev * addPrice)) / newTotalQty;
    const newLiqPrice = estimateNewLiquidationPrice(position, qtyLev, addPrice, newAvgPrice);
    
    const evaluation = evaluateStrategySuitability(marginRequired, account, 'leverage_add', currentPrice, newLiqPrice);

    strategies.push({
      id: 1,
      title: `🔥 ${leverage}x 杠杆加仓`,
      type: 'leverage_add',
      action: position.direction === 'long' ? 'Long Buy' : 'Short Sell',
      quantity: qtyLev.toFixed(4),
      price: addPrice.toFixed(2),
      requiredCapital: marginRequired.toFixed(2),
      note: `价格反弹至 $${recoveryTargetPrice.toFixed(2)} 即可达标。`,
      risk: 'High',
      description: `新均价: $${newAvgPrice.toFixed(2)} | 预估新爆仓价: $${newLiqPrice.toFixed(2)}`,
      evaluation // 注入评估结果
    });
  }

  // --- Strategy 2: Spot Buy ---
  const qtySpot = calculateRequiredQty(position, targetProfitUSD, addPrice, recoveryTargetPrice);
  
  if (qtySpot > 0 && isFinite(qtySpot)) {
    const cashRequired = qtySpot * addPrice; // Spot uses 100% cash
    const evaluation = evaluateStrategySuitability(cashRequired, account, 'spot_buy', currentPrice);

    strategies.push({
      id: 2,
      title: `🛡️ 买入现货`,
      type: 'spot_buy',
      action: 'Spot Buy',
      quantity: qtySpot.toFixed(4),
      price: addPrice.toFixed(2),
      requiredCapital: cashRequired.toFixed(2),
      note: `使用 1:1 实盘资金，无爆仓风险。`,
      risk: 'Low',
      evaluation
    });
  }

  // --- Strategy 3: Hedging ---
  const hedgeDir = position.direction === 'long' ? 'short' : 'long';
  const hedgeTargetPrice = hedgeDir === 'short' ? currentPrice * 0.98 : currentPrice * 1.02;
  const priceDelta = Math.abs(currentPrice - hedgeTargetPrice);
  
  // 只有当 priceDelta 足够大才生成策略，防止除以0
  if (priceDelta > 0) {
    const qtyHedge = pnlDiff / priceDelta;
    const hedgeMargin = (qtyHedge * currentPrice) / leverage;
    const evaluation = evaluateStrategySuitability(hedgeMargin, account, 'hedge', currentPrice);

    strategies.push({
      id: 3,
      title: `⚖️ 对冲策略`,
      type: 'hedge',
      action: hedgeDir === 'short' ? `Open Short (${leverage}x)` : `Open Long (${leverage}x)`,
      quantity: qtyHedge.toFixed(4),
      requiredCapital: hedgeMargin.toFixed(2),
      targetPrice: hedgeTargetPrice.toFixed(2),
      note: `利用反向波动在 $${hedgeTargetPrice.toFixed(2)} 赚回差额。`,
      risk: 'Medium',
      evaluation
    });

    // --- Strategy 4: Mixed Action ---
    // 只有在 Strategy 1 和 3 都存在时才生成混合策略
    if (strategies.some(s => s.id === 1)) {
       const mixAddQty = qtyLev / 2;
       const mixHedgeQty = qtyHedge / 2;
       const mixCapital = (mixAddQty * addPrice / leverage) + (mixHedgeQty * currentPrice / leverage);
       const evaluationMix = evaluateStrategySuitability(mixCapital, account, 'mixed', currentPrice);

       strategies.push({
        id: 4,
        title: `🍹 混合策略`,
        type: 'mixed',
        action: 'Combined',
        composition: [
          { action: position.direction === 'long' ? 'Add Long' : 'Add Short', qty: mixAddQty.toFixed(4) },
          { action: hedgeDir === 'short' ? 'Open Short' : 'Open Long', qty: mixHedgeQty.toFixed(4) }
        ],
        requiredCapital: mixCapital.toFixed(2),
        note: `半仓补单，半仓对冲，平衡风险。`,
        risk: 'Medium',
        evaluation: evaluationMix
      });
    }
  }

  return {
    status: 'ACTIVE',
    symbol,
    currentStatus: {
      price: currentPrice,
      pnl: currentPnl.toFixed(2),
      gap: pnlDiff.toFixed(2),
      gapPercent: ((pnlDiff / targetProfitUSD) * 100).toFixed(1)
    },
    strategies
  };
}

// ============================================
// 5. Format Strategy Output (展示评估标签)
// ============================================

export function formatStrategyOutput(result: any): string {
  const { currentStatus, strategies } = result;
  
  let output = `## 📊 策略引擎分析报告\n\n`;
  
  if (currentStatus) {
    output += `### 1. 账户与持仓概况\n`;
    output += `> **当前价格**: $${currentStatus.price}\n`;
    output += `> **当前盈亏**: $${currentStatus.pnl}\n`;
    output += `> **目标差距**: $${currentStatus.gap} (${currentStatus.gapPercent}%)\n\n`;
  }
  
  output += `### 2. 建议行动方案\n\n`;
  
  strategies.forEach((strategy: Strategy) => {
    // 提取评估标签
    const evalLabel = strategy.evaluation ? strategy.evaluation.label : '';
    const evalReason = strategy.evaluation ? strategy.evaluation.reason : '';
    
    // 标题带上标签 (例如: ✅ 推荐 | 🔥 10x 杠杆加仓)
    output += `#### ${evalLabel} | ${strategy.title}\n`;
    
    // 如果有评估原因，且不是推荐状态，高亮显示原因
    if (strategy.evaluation && strategy.evaluation.status !== 'RECOMMENDED') {
       output += `> **⚠️ 警告**: ${evalReason}\n\n`;
    } else if (evalReason) {
       output += `> **💡 评估**: ${evalReason}\n\n`;
    }

    output += `- **动作**: ${strategy.action}\n`;
    if (strategy.quantity) output += `- **数量**: ${strategy.quantity} ${result.symbol}\n`;
    if (strategy.requiredCapital) output += `- **所需资金**: **$${strategy.requiredCapital}**\n`;
    if (strategy.price) output += `- **执行价格**: $${strategy.price}\n`;
    
    if (strategy.description) {
      output += `- **数据预测**: ${strategy.description}\n`;
    }
    
    output += `- **逻辑**: ${strategy.note}\n`;
    output += `\n---\n`;
  });
  
  return output;
}