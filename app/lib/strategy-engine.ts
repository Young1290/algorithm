
// ============================================
// 1. 外部数据源 (Binance API)
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
// 2. 核心接口定义
// ============================================

// 账户资金信息 (所有金额单位: USD)
interface Account {
  availableBalance: number;  // 账户里的闲置资金 (USD/USDT)
  totalWalletBalance: number; // 账户总权益 (余额 + 未结盈亏 + 占用保证金) (USD/USDT)
}

// 持仓信息 (价格单位: USD)
interface Position {
  direction: 'long' | 'short';
  avgPrice: number;          // 平均入场价格 (USD)
  qty: number;               // 注意：这里指的是交易所显示的“总持仓数量”（已杠杆，单位：币）
  leverage?: number;         // 默认 10x
}

interface StrategyParams {
  symbol: string;
  currentPrice?: number;      // 可选，不填则自动抓取 (USD)
  position: Position;
  account?: Account;          // 可选，提供后进行风控评估 (USD)
  targetProfitUSD: number;    // 目标盈利金额 (USD)
  conservativeMode?: boolean; // true: 等待价格更优时加仓; false: 现价加仓
}

interface StrategyEvaluation {
  status: 'RECOMMENDED' | 'HIGH_RISK' | 'INSUFFICIENT_FUNDS';
  label: string; // e.g., "✅ 推荐"
  reason: string;
}

interface Strategy {
  id: number;
  title: string;
  type: string;
  action: string;
  quantity: string;           // 建议操作数量 (币)
  price: string;              // 建议操作价格 (USD)
  
  // 资金数据 (所有金额单位: USD)
  marginRequired: string;     // 实际扣款/本金 (USD)
  notionalValue: string;      // 操控名义价值 (USD)
  leverageUsed: number;       // 使用的杠杆倍数
  
  targetPrice?: string;       // 预期离场/止盈价格 (USD)
  limitPrice?: string;        // 挂单价格 (USD, 针对 Strat 5)
  
  // 🔥 风险管理字段
  newLiquidationPrice?: string; // 加仓后的新强平价 (USD)
  stopLossPrice?: string;       // 建议止损价 (USD)
  
  note: string;
  description?: string;
  evaluation: StrategyEvaluation; // 风控评估结果
  
  // 混合策略专用
  composition?: Array<{ action: string; qty: string }>;
}

// ============================================
// 3. 辅助计算函数
// ============================================

// 🔥 计算全仓强平价 (基于余额抗单能力)
function calculateCrossLiquidationPrice(
  avgPrice: number,
  totalQty: number,
  walletBalance: number,
  direction: 'long' | 'short'
): number {
  // 逻辑：当 亏损额 = 钱包余额 时爆仓
  // 亏损额 = |Price - Avg| * Qty
  // 所以 |Price - Avg| = Balance / Qty
  // 允许跌幅 (Distance) = Balance / Qty
  
  const safetyDistance = walletBalance / totalQty;
  
  if (direction === 'long') {
    const liqPrice = avgPrice - safetyDistance;
    return liqPrice > 0 ? liqPrice : 0; // 价格不能为负
  } else {
    return avgPrice + safetyDistance;
  }
}

// 🔥 计算建议止损价 (默认 2.5% - 3% 波动)
function calculateStopLossPrice(
  avgPrice: number,
  direction: 'long' | 'short',
  riskPercent: number = 0.025 // 默认 2.5% (10x杠杆下亏损25%)
): number {
  if (direction === 'long') {
    return avgPrice * (1 - riskPercent);
  } else {
    return avgPrice * (1 + riskPercent);
  }
}

// 核心数学：计算达成目标所需的数量
// 所有价格和盈利单位: USD
function calculateRequiredQty(
  position: Position,
  targetProfitUSD: number,  // 目标盈利 (USD)
  addPrice: number,         // 加仓价格 (USD)
  targetPrice: number       // 目标离场价格 (USD)
): number {
  const dir = position.direction === 'long' ? 1 : -1;
  let addQty = 0;

  // 公式推导：
  // TotalPnL = (TargetPrice - NewAvg) * (OldQty + AddQty) * dir
  // 展开后求解 AddQty
  
  if (position.direction === 'long') {
    // Long: (Target - AvgOld)*OldQty + (Target - AddPrice)*AddQty = TargetProfit
    const profitFromOld = (targetPrice - position.avgPrice) * position.qty;
    const remainder = targetProfitUSD - profitFromOld;
    const profitPerUnitNew = targetPrice - addPrice;
    if (profitPerUnitNew <= 0) return Infinity; 
    addQty = remainder / profitPerUnitNew;
  } else {
    // Short: (AvgOld - Target)*OldQty + (AddPrice - Target)*AddQty = TargetProfit
    const profitFromOld = (position.avgPrice - targetPrice) * position.qty;
    const remainder = targetProfitUSD - profitFromOld;
    const profitPerUnitNew = addPrice - targetPrice;
    if (profitPerUnitNew <= 0) return Infinity;
    addQty = remainder / profitPerUnitNew;
  }
  
  return addQty;
}

// 估算新爆仓价 (简易模型)
// 价格单位: USD
function estimateNewLiquidationPrice(
  position: Position,
  addQty: number,    // 加仓数量 (币)
  addPrice: number,  // 加仓价格 (USD)
  leverage: number   // 杠杆倍数
): number {
  // 计算混合后的新均价
  const totalQty = position.qty + addQty;
  const newAvgPrice = ((position.qty * position.avgPrice) + (addQty * addPrice)) / totalQty;
  
  // 粗略估算爆仓线 (10x -> 10% 波动)
  // 保守起见，我们假设维持保证金率后，大约 9.5% 的反向波动会爆仓
  const buffer = (1 / leverage) - 0.005; 
  
  if (position.direction === 'long') {
    return newAvgPrice * (1 - buffer);
  } else {
    return newAvgPrice * (1 + buffer);
  }
}

// 🔥 核心风控引擎：60% 水位线检查
function evaluateStrategySuitability(
  strategyMargin: number,
  currentMarginUsed: number,
  account: Account | undefined,
  strategyType: string,
  currentPrice: number,
  newLiquidationPrice?: number
): StrategyEvaluation {
  // 如果没有账户信息，跳过资金检查
  if (!account) {
    return {
      status: 'RECOMMENDED',
      label: 'ℹ️ 未检测资金',
      reason: '未提供账户信息，无法评估资金充足性。'
    };
  }
  
  const { availableBalance, totalWalletBalance } = account;
  
  // 1. 余额硬性检查
  if (strategyMargin > availableBalance) {
    return {
      status: 'INSUFFICIENT_FUNDS',
      label: '🚫 资金不足',
      reason: `需本金 $${strategyMargin.toLocaleString()}，可用余额仅 $${availableBalance.toLocaleString()}。`
    };
  }

  // 2. 60% 保守派水位线检查
  // 总占用 = 当前已用 + 策略新增
  const totalUsedMargin = currentMarginUsed + strategyMargin;
  const utilizationRate = totalUsedMargin / totalWalletBalance;
  
  if (utilizationRate > 0.60) {
    return {
      status: 'HIGH_RISK',
      label: '⚠️ 超过安全水位',
      reason: `执行后总仓位占用 ${(utilizationRate * 100).toFixed(1)}% 资金 (>60%)，风险较高。`
    };
  }

  // 3. 爆仓价逼近检查 (针对加仓)
  if (strategyType === 'leverage_add' && newLiquidationPrice) {
    const dist = Math.abs(currentPrice - newLiquidationPrice) / currentPrice;
    if (dist < 0.03) { // 3% 极度危险区
      return {
        status: 'HIGH_RISK',
        label: '☠️ 爆仓预警',
        reason: `爆仓价将逼近现价 ${(dist * 100).toFixed(1)}%，极易归零。`
      };
    }
  }

  return {
    status: 'RECOMMENDED',
    label: '✅ 推荐 (安全)',
    reason: `总资金占用 ${(utilizationRate * 100).toFixed(1)}%，处于 60% 安全线内。`
  };
}

// ============================================
// 4. 主逻辑：策略生成器
// ============================================

export async function generateStrategies(params: StrategyParams) {
  const { symbol, position, account, targetProfitUSD, conservativeMode = true } = params;
  
  // 1. 获取/确认价格
  const currentPrice = params.currentPrice || await fetchBinancePrice(symbol);
  if (!currentPrice) return { error: "无法获取市场价格" };

  const leverage = position.leverage || 10; // 系统默认杠杆

  // 2. 解析当前持仓 (Input Interpretation)
  // 用户输入的是 Leveraged Qty (名义总数)
  const currentNotional = position.qty * position.avgPrice; // 名义价值
  const currentMarginUsed = currentNotional / leverage;     // 倒推当前占用保证金

  // 3. 计算当前 PnL
  const dir = position.direction === 'long' ? 1 : -1;
  const currentPnl = (currentPrice - position.avgPrice) * position.qty * dir;
  const pnlDiff = targetProfitUSD - currentPnl;

  // ------------------------------------------------------
  // Strategy 5: 临界点检查 (Priority Check)
  // ------------------------------------------------------
  if (pnlDiff <= 0 || currentPnl >= targetProfitUSD * 0.85) {
    const closePrice = position.direction === 'long' 
      ? position.avgPrice + (targetProfitUSD / position.qty)
      : position.avgPrice - (targetProfitUSD / position.qty);

    const isMet = pnlDiff <= 0;
    return {
      status: isMet ? "TARGET_MET" : "NEAR_TARGET",
      currentStatus: {
        price: currentPrice,
        pnl: currentPnl.toFixed(2),
        marginUsed: currentMarginUsed.toFixed(2)
      },
      strategies: [{
        id: 5,
        title: isMet ? "🎉 目标已达成" : "🎯 盈利逼近目标",
        type: 'limit_close',
        action: 'Limit Close',
        quantity: position.qty.toFixed(4),
        price: currentPrice.toFixed(2),
        limitPrice: closePrice.toFixed(2),
        marginRequired: '0.00',
        notionalValue: '0.00',
        leverageUsed: 0,
        note: '无需资金。',
        description: isMet ? '目标已覆盖，建议立即止盈。' : `已达目标85%，建议在 $${closePrice.toFixed(2)} 挂单离场。`,
        evaluation: { status: 'RECOMMENDED', label: '✅ 最佳方案', reason: '锁定利润' }
      }]
    };
  }

  const strategies: Strategy[] = [];
  
  // 设定加仓价格：保守模式下给予 0.5% 的缓冲
  const addPrice = conservativeMode 
    ? (position.direction === 'long' ? currentPrice * 0.995 : currentPrice * 1.005) 
    : currentPrice;
  
  // 设定反弹目标：加仓后，我们期望价格回到哪里就能回本？
  // 这是一个中间值，比完全回本容易，比现价远一点 (1.5% 波动)
  const recoveryTargetPrice = position.direction === 'long' ? currentPrice * 1.015 : currentPrice * 0.985;

  // ------------------------------------------------------
  // Strategy 1: 10x 杠杆加仓 (Aggressive)
  // ------------------------------------------------------
  const qtyLev = calculateRequiredQty(position, targetProfitUSD, addPrice, recoveryTargetPrice);
  
  if (qtyLev > 0 && isFinite(qtyLev)) {
    const notionalVal = qtyLev * addPrice;
    const marginReq = notionalVal / leverage; // 10x
    
    // 🔥 计算加仓后的混合状态
    const newTotalQty = position.qty + qtyLev;
    const newAvgPrice = ((position.qty * position.avgPrice) + (qtyLev * addPrice)) / newTotalQty;
    
    // 🔥 计算新强平价 (基于全仓余额)
    const newLiqPrice = account 
      ? calculateCrossLiquidationPrice(newAvgPrice, newTotalQty, account.totalWalletBalance, position.direction)
      : estimateNewLiquidationPrice(position, qtyLev, addPrice, leverage);
    
    // 🔥 计算建议止损价 (2.5% 波动)
    const newStopLoss = calculateStopLossPrice(newAvgPrice, position.direction, 0.025);
    
    const evaluation = evaluateStrategySuitability(
      marginReq, currentMarginUsed, account, 'leverage_add', currentPrice, newLiqPrice
    );

    strategies.push({
      id: 1,
      title: `🔥 10x 杠杆加仓`,
      type: 'leverage_add',
      action: position.direction === 'long' ? 'Buy Long' : 'Sell Short',
      quantity: qtyLev.toFixed(4),
      price: addPrice.toFixed(2),
      marginRequired: marginReq.toFixed(2),
      notionalValue: notionalVal.toFixed(2),
      leverageUsed: leverage,
      targetPrice: recoveryTargetPrice.toFixed(2),
      // 🔥 新增风险管理字段
      newLiquidationPrice: newLiqPrice.toFixed(2),
      stopLossPrice: newStopLoss.toFixed(2),
      note: `利用 10x 杠杆降低均价。新均价 $${newAvgPrice.toFixed(2)}。`,
      description: `价格微弹至 $${recoveryTargetPrice.toFixed(2)} 即可达标。`,
      evaluation
    });
  }

  // ------------------------------------------------------
  // Strategy 2: 现货买入 (Conservative)
  // ------------------------------------------------------
  const qtySpot = calculateRequiredQty(position, targetProfitUSD, addPrice, recoveryTargetPrice);
  
  if (qtySpot > 0 && isFinite(qtySpot)) {
    const notionalVal = qtySpot * addPrice;
    const marginReq = notionalVal; // 1x (全额)
    
    // 🔥 现货混合均价和止损
    const newTotalQtySpot = position.qty + qtySpot;
    const newAvgPriceSpot = ((position.qty * position.avgPrice) + notionalVal) / newTotalQtySpot;
    // 现货虽然不爆仓，但我们依然计算"如果跌到这里，总资产会大幅缩水"的止损点
    const newStopLossSpot = calculateStopLossPrice(newAvgPriceSpot, position.direction, 0.05); // 现货给 5% 宽容度
    
    const evaluation = evaluateStrategySuitability(
      marginReq, currentMarginUsed, account, 'spot_buy', currentPrice
    );

    strategies.push({
      id: 2,
      title: `🛡️ 买入现货 (Spot)`,
      type: 'spot_buy',
      action: 'Spot Buy',
      quantity: qtySpot.toFixed(4),
      price: addPrice.toFixed(2),
      marginRequired: marginReq.toFixed(2),
      notionalValue: notionalVal.toFixed(2),
      leverageUsed: 1,
      // 🔥 现货无强平，但有止损建议
      newLiquidationPrice: "无 (现货)",
      stopLossPrice: newStopLossSpot.toFixed(2),
      note: `无爆仓风险，双保险策略。新均价 $${newAvgPriceSpot.toFixed(2)}。`,
      description: `需全额支付资金，适合长期看好。`,
      evaluation
    });
  }

  // ------------------------------------------------------
  // Strategy 3: 10x 对冲 (Hedging)
  // ------------------------------------------------------
  const hedgeDir = position.direction === 'long' ? 'short' : 'long';
  const hedgeTargetPrice = hedgeDir === 'short' ? currentPrice * 0.98 : currentPrice * 1.02;
  const priceDelta = Math.abs(currentPrice - hedgeTargetPrice);
  
  if (priceDelta > 0) {
    // 计算需多少量才能在 priceDelta 波动中赚回 Gap
    // 简化逻辑：Gap / Delta
    const qtyHedge = pnlDiff / priceDelta;
    const notionalVal = qtyHedge * currentPrice;
    const marginReq = notionalVal / leverage;

    const evaluation = evaluateStrategySuitability(
      marginReq, currentMarginUsed, account, 'hedge', currentPrice
    );

    // 🔥 对冲单的止损价
    const hedgeStopLoss = calculateStopLossPrice(currentPrice, hedgeDir, 0.02); // 对冲单给 2% 宽容度
    
    strategies.push({
      id: 3,
      title: `⚖️ 对冲策略 (10x)`,
      type: 'hedge',
      action: hedgeDir === 'short' ? 'Open Short' : 'Open Long',
      quantity: qtyHedge.toFixed(4),
      price: currentPrice.toFixed(2),
      marginRequired: marginReq.toFixed(2),
      notionalValue: notionalVal.toFixed(2),
      leverageUsed: leverage,
      targetPrice: hedgeTargetPrice.toFixed(2),
      // 🔥 对冲策略的风险管理
      newLiquidationPrice: "🔒 已锁仓 (Risk Locked)",
      stopLossPrice: hedgeStopLoss.toFixed(2),
      note: `反向开单，利用波动赚取差价。`,
      evaluation
    });

    // ------------------------------------------------------
    // Strategy 4: 混合策略 (Mixed)
    // ------------------------------------------------------
    // 仅当 Strat 1 和 Strat 3 都存在时计算
    if (strategies.some(s => s.id === 1)) {
      const mixAddQty = qtyLev / 2;
      const mixHedgeQty = qtyHedge / 2;
      
      const valAdd = mixAddQty * addPrice;
      const valHedge = mixHedgeQty * currentPrice;
      
      const marginMix = (valAdd / leverage) + (valHedge / leverage); // 都是 10x
      const notionalMix = valAdd + valHedge;

      const evaluationMix = evaluateStrategySuitability(
        marginMix, currentMarginUsed, account, 'mixed', currentPrice
      );

      // 🔥 混合策略的强平价介于加仓和对冲之间
      const mixNewAvgPrice = ((position.qty * position.avgPrice) + (mixAddQty * addPrice)) / (position.qty + mixAddQty);
      const mixStopLoss = calculateStopLossPrice(mixNewAvgPrice, position.direction, 0.03); // 3% 宽容度
      
      strategies.push({
        id: 4,
        title: `🍹 混合策略 (10x)`,
        type: 'mixed',
        action: 'Mixed',
        quantity: (mixAddQty + mixHedgeQty).toFixed(4),
        price: currentPrice.toFixed(2),
        marginRequired: marginMix.toFixed(2),
        notionalValue: notionalMix.toFixed(2),
        leverageUsed: leverage,
        // 🔥 混合策略的风险管理
        newLiquidationPrice: "📊 动态 (Dynamic)",
        stopLossPrice: mixStopLoss.toFixed(2),
        note: `半仓加仓 + 半仓对冲，平衡风险。`,
        composition: [
          { action: position.direction === 'long' ? 'Buy Long' : 'Sell Short', qty: mixAddQty.toFixed(4) },
          { action: hedgeDir === 'short' ? 'Open Short' : 'Open Long', qty: mixHedgeQty.toFixed(4) }
        ],
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
      leverageInfo: {
        inputQtyIsLeveraged: true,
        totalNotional: currentNotional.toFixed(2), // 用户输入的大数
        estimatedMargin: currentMarginUsed.toFixed(2) // 系统推算的本金
      }
    },
    strategies
  };
}

// ============================================
// 5. 输出格式化 (Markdown Report)
// ============================================

export function formatStrategyOutput(result: any): string {
  const { currentStatus, strategies, symbol } = result;
  
  let output = `## 📊 策略引擎分析报告 (10x 模式)\n\n`;
  
  if (currentStatus) {
    const marginNum = parseFloat(currentStatus.leverageInfo.estimatedMargin);
    const notionalNum = parseFloat(currentStatus.leverageInfo.totalNotional);
    
    output += `### 1. 账户持仓诊断\n`;
    output += `> **当前市价**: $${currentStatus.price}\n`;
    output += `> **当前盈亏**: $${currentStatus.pnl}\n`;
    output += `> **持仓总量 (名义)**: $${notionalNum.toLocaleString()} (您输入的持仓)\n`;
    output += `> **占用本金 (估算)**: $${marginNum.toLocaleString()} (10x 倒推)\n`;
    output += `\n`;
  }
  
  output += `### 2. 建议行动方案 (基于 60% 风控线)\n\n`;
  
  strategies.forEach((s: Strategy) => {
    const label = s.evaluation?.label || '';
    const reason = s.evaluation?.reason || '';
    
    output += `#### ${label} | ${s.title}\n`;
    
    // 风控提示框
    if (s.evaluation && s.evaluation.status !== 'RECOMMENDED') {
       output += `> **⚠️ 风控警告**: ${reason}\n\n`;
    } else {
       output += `> **💡 风控评估**: ${reason}\n\n`;
    }

    // 核心数据展示
    if (s.type === 'mixed' && s.composition) {
      output += `- **组合动作**:\n`;
      s.composition.forEach(c => output += `  - ${c.action}: ${c.qty} ${symbol}\n`);
    } else {
      output += `- **动作**: ${s.action} ${s.quantity} ${symbol}\n`;
    }
    
    if (s.marginRequired) {
      const margin = parseFloat(s.marginRequired).toLocaleString();
      const notional = parseFloat(s.notionalValue).toLocaleString();
      
      output += `- **所需本金 (Margin)**: **$${margin}**`;
      if (s.leverageUsed > 1) {
        output += ` (10x 杠杆)\n`;
        output += `- *操控名义价值*: $${notional}\n`;
      } else {
        output += ` (全额现货)\n`;
      }
    }
    
    if (s.targetPrice) {
      output += `- **执行价格**: $${s.price}\n`;
      output += `- **止盈目标**: **$${s.targetPrice}**\n`;
    }
    
    // 新增：强平价与止损价展示
    if (s.newLiquidationPrice) {
      output += `- **新强平价**: **$${s.newLiquidationPrice}**\n`;
    }
    if (s.stopLossPrice) {
      output += `- **建议止损**: **$${s.stopLossPrice}**\n`;
    }
    if (s.description) output += `- **详情**: ${s.description}\n`;
    
    output += `\n---\n`;
  });
  
  return output;
}