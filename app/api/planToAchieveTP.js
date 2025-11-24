
// ============================================
// 1. 基础工具
// ============================================

export async function fetchBinancePrice(symbol: string): Promise<number | null> {
  try {
    const pair = symbol.toUpperCase().endsWith('USDT') ? symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) { return null; }
}

interface StrategyParams {
  symbol: string;
  currentPrice?: number;
  position: {
    direction: 'long' | 'short';
    avgPrice: number;
    qty: number; // 杠杆后的名义总数
    leverage?: number; // 默认 10
  };
  account: {
    availableBalance: number;
    totalWalletBalance: number;
  };
  targetRoiPercent?: number; // 优先使用 ROI (e.g. 10%)
  targetProfitUSD?: number;  // 兼容固定金额
  conservativeMode?: boolean;
}

interface GridOrder {
  level: number;
  price: string;
  qty: string;
  margin: string;
  note: string;
}

interface Strategy {
  id: number;
  title: string;
  type: string;
  action: string;
  quantity: string;
  price: string;
  marginRequired: string;
  notionalValue: string;
  leverageUsed: number;
  
  targetPrice?: string;
  newLiquidationPrice?: string;
  stopLossPrice?: string;
  
  isGrid?: boolean;
  gridOrders?: GridOrder[];
  
  composition?: Array<{ action: string; qty: string; margin: string }>;
  
  note: string;
  evaluation: { status: string; label: string; reason: string };
}

// 计算所需数量 (通用公式)
function calculateRequiredQty(
  position: any,
  targetProfitUSD: number,
  addPrice: number,
  targetPrice: number
): number {
  const dir = position.direction === 'long' ? 1 : -1;
  let addQty = 0;
  
  // 逻辑: (Target - AvgOld)*OldQty + (Target - AddPrice)*AddQty = TargetProfit
  // 考虑方向系数
  if (position.direction === 'long') {
    const profitFromOld = (targetPrice - position.avgPrice) * position.qty;
    const remainder = targetProfitUSD - profitFromOld;
    const profitPerUnitNew = targetPrice - addPrice;
    if (profitPerUnitNew <= 0) return 0; 
    addQty = remainder / profitPerUnitNew;
  } else {
    const profitFromOld = (position.avgPrice - targetPrice) * position.qty;
    const remainder = targetProfitUSD - profitFromOld;
    const profitPerUnitNew = addPrice - targetPrice;
    if (profitPerUnitNew <= 0) return 0;
    addQty = remainder / profitPerUnitNew;
  }
  return addQty > 0 ? addQty : 0;
}

// 资金体检 (60% 安全线)
function evaluateStrategySuitability(
  marginReq: number,
  currentMarginUsed: number,
  account: any,
  type: string,
  liqPrice?: number,
  currentPrice?: number
) {
  const { availableBalance, totalWalletBalance } = account;
  
  if (marginReq > availableBalance) {
    return { status: 'INSUFFICIENT_FUNDS', label: '🚫 资金不足', reason: `需本金 $${marginReq.toFixed(0)}，余额不足。` };
  }

  const totalUsed = currentMarginUsed + marginReq;
  const utilization = totalUsed / totalWalletBalance;

  if (utilization > 0.6) {
    return { status: 'HIGH_RISK', label: '⚠️ 仓位过重', reason: `总占用 ${(utilization*100).toFixed(1)}% (>60%)，风险较高。` };
  }
  
  // 爆仓检查 (仅针对加仓)
  if (type === 'leverage_add' && liqPrice && currentPrice) {
    const dist = Math.abs(currentPrice - liqPrice) / currentPrice;
    if (dist < 0.03) return { status: 'HIGH_RISK', label: '☠️ 爆仓预警', reason: '爆仓价极度逼近。' };
  }

  return { status: 'RECOMMENDED', label: '✅ 推荐', reason: `资金占用 ${(utilization*100).toFixed(1)}% (安全)。` };
}

// ============================================
// 🔥 主策略生成逻辑 v8.0
// ============================================

export async function generateStrategies(params: StrategyParams) {
  const { symbol, position, account, conservativeMode = true } = params;
  const currentPrice = params.currentPrice || await fetchBinancePrice(symbol) || 92000;
  const leverage = position.leverage || 10;

  // 1. 计算目标 (ROI 优先)
  const currentNotional = position.qty * position.avgPrice;
  const currentMarginUsed = currentNotional / leverage;
  
  let targetProfitUSD = 0;
  let targetDesc = "";
  
  if (params.targetRoiPercent) {
    targetProfitUSD = currentMarginUsed * (params.targetRoiPercent / 100);
    targetDesc = `本金 ${params.targetRoiPercent}% ($${targetProfitUSD.toFixed(2)})`;
  } else {
    targetProfitUSD = params.targetProfitUSD || 0;
    targetDesc = `固定金额 $${targetProfitUSD.toFixed(2)}`;
  }

  // 计算缺口
  const dir = position.direction === 'long' ? 1 : -1;
  const currentPnl = (currentPrice - position.avgPrice) * position.qty * dir;
  const gap = targetProfitUSD - currentPnl;

  // 临界点检查
  if (gap <= 0) {
     return { status: "TARGET_MET", currentStatus: { gap: "0.00", targetDescription: targetDesc }, strategies: [] };
  }

  const strategies: Strategy[] = [];

  // 设定价格参数
  const recoveryTargetPrice = position.direction === 'long' ? currentPrice * 1.012 : currentPrice * 0.988; // 1.2% 反弹
  
  // ======================================================
  // 策略 1: 智能分批加仓 (Smart Grid)
  // ======================================================
  // 假设均价在 -1.5% 处成交
  const avgGridBuyPrice = position.direction === 'long' ? currentPrice * 0.985 : currentPrice * 1.015;
  const totalGridQty = calculateRequiredQty(position, targetProfitUSD, avgGridBuyPrice, recoveryTargetPrice);
  
  if (totalGridQty > 0) {
    const marginGrid = (totalGridQty * avgGridBuyPrice) / leverage;
    
    // 估算全仓强平
    const finalTotalQty = position.qty + totalGridQty;
    const finalAvgPrice = ((position.qty * position.avgPrice) + (totalGridQty * avgGridBuyPrice)) / finalTotalQty;
    const safetyDist = account.totalWalletBalance / finalTotalQty;
    const newLiq = position.direction === 'long' ? finalAvgPrice - safetyDist : finalAvgPrice + safetyDist;

    const evalGrid = evaluateStrategySuitability(marginGrid, currentMarginUsed, account, 'leverage_add', newLiq, currentPrice);

    // 构建分批明细
    const step1P = currentPrice;
    const step2P = position.direction === 'long' ? currentPrice * 0.985 : currentPrice * 1.015;
    const step3P = position.direction === 'long' ? currentPrice * 0.96 : currentPrice * 1.04;
    
    strategies.push({
      id: 1,
      title: `🧱 智能分批建仓 (推荐)`,
      type: 'grid_dca',
      action: 'Batch Buy',
      isGrid: true,
      gridOrders: [
        { level: 1, price: step1P.toFixed(2), qty: (totalGridQty*0.2).toFixed(4), margin: ((totalGridQty*0.2*step1P)/leverage).toFixed(2), note: "底仓 (20%)" },
        { level: 2, price: step2P.toFixed(2), qty: (totalGridQty*0.3).toFixed(4), margin: ((totalGridQty*0.3*step2P)/leverage).toFixed(2), note: "补单 (30%)" },
        { level: 3, price: step3P.toFixed(2), qty: (totalGridQty*0.5).toFixed(4), margin: ((totalGridQty*0.5*step3P)/leverage).toFixed(2), note: "强撑 (50%)" }
      ],
      quantity: totalGridQty.toFixed(4),
      price: `Avg $${avgGridBuyPrice.toFixed(2)}`,
      marginRequired: marginGrid.toFixed(2),
      notionalValue: (totalGridQty * avgGridBuyPrice).toFixed(2),
      leverageUsed: leverage,
      targetPrice: recoveryTargetPrice.toFixed(2),
      newLiquidationPrice: newLiq > 0 ? newLiq.toFixed(2) : "0.00",
      note: `最稳健方案。越跌买得越多，利用资金深度拉低成本。`,
      evaluation: evalGrid
    });
  }

  // ======================================================
  // 策略 2: 现货双保险 (Spot Buy)
  // ======================================================
  // 逻辑：用现货的盈利来填补 gap。所需现货数量 = Gap / (TargetPrice - CurrentPrice)
  // 假设我们也只看 1.2% 的反弹
  const spotProfitPerUnit = Math.abs(recoveryTargetPrice - currentPrice);
  const qtySpot = gap / spotProfitPerUnit;
  const cashSpot = qtySpot * currentPrice; // 1x 全款
  
  const evalSpot = evaluateStrategySuitability(cashSpot, currentMarginUsed, account, 'spot_buy');
  
  strategies.push({
    id: 2,
    title: `🛡️ 现货双保险 (Spot)`,
    type: 'spot_buy',
    action: 'Spot Buy',
    quantity: qtySpot.toFixed(4),
    price: currentPrice.toFixed(2),
    marginRequired: cashSpot.toFixed(2),
    notionalValue: cashSpot.toFixed(2),
    leverageUsed: 1,
    targetPrice: recoveryTargetPrice.toFixed(2),
    newLiquidationPrice: "无 (现货)",
    note: `无爆仓风险。利用现货上涨的利润来覆盖合约的亏损。资金占用较大但最安心。`,
    evaluation: evalSpot
  });

  // ======================================================
  // 策略 3: 反向对冲 (Hedging)
  // ======================================================
  // 逻辑：假设趋势反转，价格继续向不利方向走 2%。我们开反向单赚这个钱。
  const hedgeDir = position.direction === 'long' ? 'short' : 'long';
  const hedgeTarget = position.direction === 'long' ? currentPrice * 0.98 : currentPrice * 1.02;
  const hedgeProfitPerUnit = Math.abs(hedgeTarget - currentPrice);
  
  if (hedgeProfitPerUnit > 0) {
    const qtyHedge = gap / hedgeProfitPerUnit;
    const marginHedge = (qtyHedge * currentPrice) / leverage;
    
    const evalHedge = evaluateStrategySuitability(marginHedge, currentMarginUsed, account, 'hedge');
    
    strategies.push({
      id: 3,
      title: `⚖️ 反向对冲 (Trend Reverse)`,
      type: 'hedge',
      action: hedgeDir === 'short' ? 'Open Short' : 'Open Long',
      quantity: qtyHedge.toFixed(4),
      price: currentPrice.toFixed(2),
      marginRequired: marginHedge.toFixed(2),
      notionalValue: (qtyHedge * currentPrice).toFixed(2),
      leverageUsed: leverage,
      targetPrice: hedgeTarget.toFixed(2),
      newLiquidationPrice: "🔒 已锁仓 (Locked)",
      note: `假设行情跌破位。在 $${hedgeTarget.toFixed(2)} 处通过空单利润填平亏损。`,
      evaluation: evalHedge
    });

    // ======================================================
    // 策略 4: 混合双打 (Mixed)
    // ======================================================
    // 逻辑：一半资金做分批(Strat 1 Step 1)，一半资金做对冲(Strat 3)
    if (strategies.some(s => s.id === 1)) {
       const halfGridQty = totalGridQty * 0.25; // 取 Strat 1 的 1/4 量作为尝试
       const halfHedgeQty = qtyHedge * 0.5;
       
       const mixMargin = ((halfGridQty * currentPrice) / leverage) + ((halfHedgeQty * currentPrice) / leverage);
       
       const evalMix = evaluateStrategySuitability(mixMargin, currentMarginUsed, account, 'mixed');
       
       strategies.push({
         id: 4,
         title: `🍹 混合策略 (Balanced)`,
         type: 'mixed',
         action: 'Mixed',
         composition: [
           { action: position.direction === 'long' ? 'Add Long' : 'Add Short', qty: halfGridQty.toFixed(4), margin: ((halfGridQty*currentPrice)/leverage).toFixed(0) },
           { action: hedgeDir === 'short' ? 'Open Short' : 'Open Long', qty: halfHedgeQty.toFixed(4), margin: ((halfHedgeQty*currentPrice)/leverage).toFixed(0) }
         ],
         quantity: "Combined",
         price: "Market",
         marginRequired: mixMargin.toFixed(2),
         notionalValue: ((halfGridQty + halfHedgeQty) * currentPrice).toFixed(2),
         leverageUsed: leverage,
         note: `震荡市首选。左手补仓降成本，右手开空吃回调。`,
         evaluation: evalMix
       });
    }
  }

  return {
    status: 'ACTIVE',
    symbol,
    currentStatus: {
      price: currentPrice,
      pnl: currentPnl.toFixed(2),
      marginUsed: currentMarginUsed.toFixed(2),
      targetDescription: targetDesc,
      gap: gap.toFixed(2)
    },
    strategies
  };
}

// ============================================
// 3. 输出格式化
// ============================================

export function formatStrategyOutput(result: any): string {
  const { currentStatus, strategies, symbol } = result;
  let output = `## 📊 策略引擎分析报告 (ROI 模式)\n\n`;
  
  if (currentStatus) {
    output += `### 1. 账户与目标\n`;
    output += `> **已投本金**: $${parseFloat(currentStatus.marginUsed).toLocaleString()}\n`;
    output += `> **当前浮亏**: $${currentStatus.pnl}\n`;
    output += `> **目标设定**: **${currentStatus.targetDescription}**\n`;
    output += `> **需赚取额**: **$${currentStatus.gap}**\n\n`;
  }
  
  output += `### 2. 可选策略菜单\n\n`;
  
  strategies.forEach((s: Strategy) => {
    const label = s.evaluation?.label || '';
    output += `#### ${label} | ${s.title}\n`;
    
    if (s.isGrid && s.gridOrders) {
       // Grid 表格展示
       output += `> **核心逻辑**: ${s.note}\n\n`;
       output += `| 步骤 | 挂单价格 | 数量 | 本金 (10x) |\n| :--- | :--- | :--- | :--- |\n`;
       s.gridOrders.forEach(o => output += `| S${o.level} | $${o.price} | ${o.qty} | $${parseFloat(o.margin).toLocaleString()} |\n`);
       output += `\n- **总预备本金**: **$${parseFloat(s.marginRequired).toLocaleString()}**\n`;
       output += `- **离场目标**: 反弹至 **$${s.targetPrice}**\n`;
    } else if (s.composition) {
       // Mixed 展示
       output += `> **核心逻辑**: ${s.note}\n`;
       s.composition.forEach(c => output += `- ${c.action}: ${c.qty} ${symbol} (本金 $${c.margin})\n`);
       output += `- **总需本金**: **$${parseFloat(s.marginRequired).toLocaleString()}**\n`;
    } else {
       // 普通展示 (Spot / Hedge)
       output += `> **核心逻辑**: ${s.note}\n`;
       output += `- **动作**: ${s.action} ${s.quantity} ${symbol}\n`;
       output += `- **总需本金**: **$${parseFloat(s.marginRequired).toLocaleString()}**`;
       output += s.leverageUsed === 1 ? ` (全额现货)\n` : ` (10x 杠杆)\n`;
       if (s.targetPrice) output += `- **目标价格**: $${s.targetPrice}\n`;
    }

    if (s.newLiquidationPrice) output += `- **强平参考**: ${s.newLiquidationPrice}\n`;
    output += `\n---\n`;
  });
  
  return output;
}