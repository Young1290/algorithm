
// ============================================
// 1. 基础工具与接口
// ============================================

export async function fetchBinancePrice(symbol: string): Promise<number | null> {
  try {
    const pair = symbol.toUpperCase().endsWith('USDT') ? symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) { return null; }
}

// ... (接口定义 Account, Position 等保持不变) ...
// ... (保留 evaluateStrategySuitability 函数) ...

// ============================================
// 🧱 通用核心：分批计划生成器 (Grid Generator)
// ============================================

function createGridPlan(
  actionType: 'buy' | 'sell', // 买入还是卖出
  basePrice: number,          // 现价
  totalQty: number,           // 总计划数量
  leverage: number            // 杠杆
) {
  // 仓位分配: 20% / 30% / 50%
  const weights = [0.2, 0.3, 0.5];
  
  // 价格梯队
  // 买入: 越跌越买 (现价, -1.5%, -4.0%)
  // 卖出: 越涨越卖 (现价, +1.5%, +4.0%) -> 哪怕是对冲，逢高空也是更优解
  const levels = actionType === 'buy' 
    ? [0, 0.015, 0.04] 
    : [0, 0.015, 0.04]; 
    
  const gridOrders = [];
  let weightedSum = 0;
  let totalMargin = 0;
  let totalNotional = 0;

  for (let i = 0; i < 3; i++) {
    const price = actionType === 'buy'
      ? basePrice * (1 - levels[i])
      : basePrice * (1 + levels[i]); // 卖出时价格越高越好
      
    const stepQty = totalQty * weights[i];
    const stepMargin = (stepQty * price) / leverage;
    
    let note = "";
    if (actionType === 'buy') {
       note = i === 0 ? "底仓 (20%)" : (i === 1 ? "支撑补单 (30%)" : "黄金坑 (50%)");
    } else {
       note = i === 0 ? "头仓 (20%)" : (i === 1 ? "阻力加空 (30%)" : "顶背离重仓 (50%)");
    }

    gridOrders.push({
      level: i + 1,
      price: price.toFixed(2),
      qty: stepQty.toFixed(4),
      margin: stepMargin.toFixed(2),
      note: note
    });

    weightedSum += (stepQty * price);
    totalMargin += stepMargin;
    totalNotional += (stepQty * price);
  }
  
  // 计算预期均价
  const estimatedAvgPrice = weightedSum / totalQty;
  
  return {
    orders: gridOrders,
    avgPrice: estimatedAvgPrice,
    totalMargin,
    totalNotional
  };
}

// 计算所需数量 (无上限数学版)
function calculateRequiredQty(
  position: any,
  targetProfitUSD: number,
  avgEntryPrice: number, // 预估均价
  targetPrice: number
): number {
  const dir = position.direction === 'long' ? 1 : -1;
  let qty = 0;
  
  if (position.direction === 'long') {
    // (Target - AvgEntry) * QtyNew = Gap - (Target - CurrentAvg) * QtyOld
    const profitOld = (targetPrice - position.avgPrice) * position.qty;
    const gap = targetProfitUSD - profitOld;
    const profitPerUnit = targetPrice - avgEntryPrice;
    if (profitPerUnit > 0) qty = gap / profitPerUnit;
  } else {
    // Short: (AvgEntry - Target) * QtyNew ...
    const profitOld = (position.avgPrice - targetPrice) * position.qty;
    const gap = targetProfitUSD - profitOld;
    const profitPerUnit = avgEntryPrice - targetPrice;
    if (profitPerUnit > 0) qty = gap / profitPerUnit;
  }
  return qty > 0 ? qty : 0;
}


// ============================================
// 🔥 主策略生成逻辑 v9.0 (全员分批)
// ============================================

export async function generateStrategies(params: any) {
  const { symbol, position, account, conservativeMode = true } = params;
  const currentPrice = params.currentPrice || await fetchBinancePrice(symbol) || 92000;
  const leverage = position.leverage || 10;

  // 1. ROI 目标计算
  const currentMarginUsed = (position.qty * position.avgPrice) / leverage;
  let targetProfitUSD = 0;
  let targetDesc = "";
  
  if (params.targetRoiPercent) {
    targetProfitUSD = currentMarginUsed * (params.targetRoiPercent / 100);
    targetDesc = `本金 ${params.targetRoiPercent}% ($${targetProfitUSD.toFixed(2)})`;
  } else {
    targetProfitUSD = params.targetProfitUSD || 0;
    targetDesc = `固定金额 $${targetProfitUSD.toFixed(2)}`;
  }
  
  // Gap 计算
  const dir = position.direction === 'long' ? 1 : -1;
  const currentPnl = (currentPrice - position.avgPrice) * position.qty * dir;
  const gap = targetProfitUSD - currentPnl;

  if (gap <= 0) return { status: "TARGET_MET", currentStatus: { gap: "0.00", targetDescription: targetDesc }, strategies: [] };

  const strategies = [];
  
  // 设定反弹目标 (1.2% 波动)
  const recoveryTargetLong = currentPrice * 1.012;
  const recoveryTargetShort = currentPrice * 0.988;
  const targetPrice = position.direction === 'long' ? recoveryTargetLong : recoveryTargetShort;

  // ======================================================
  // 策略 1: 10x 智能分批 (Smart Grid Add)
  // ======================================================
  // 预估买入均价 (假设分批成交)
  const estBuyPrice = position.direction === 'long' ? currentPrice * 0.985 : currentPrice * 1.015;
  const qtyGrid = calculateRequiredQty(position, targetProfitUSD, estBuyPrice, targetPrice);
  
  if (qtyGrid > 0) {
    const action = position.direction === 'long' ? 'buy' : 'sell';
    const plan = createGridPlan(action, currentPrice, qtyGrid, leverage);
    
    // 风控计算... (省略部分重复代码，直接生成对象)
    const evalGrid = evaluateStrategySuitability(plan.totalMargin, currentMarginUsed, account, 'leverage_add');
    
    strategies.push({
      id: 1,
      title: `🧱 10x 智能分批 (同向补仓)`,
      type: 'grid_dca',
      action: 'Batch ' + (action==='buy'?'Buy':'Sell'),
      isGrid: true,
      gridOrders: plan.orders, // 注入分批订单
      
      quantity: qtyGrid.toFixed(4),
      price: `Avg $${plan.avgPrice.toFixed(2)}`,
      marginRequired: plan.totalMargin.toFixed(2),
      notionalValue: plan.totalNotional.toFixed(2),
      leverageUsed: leverage,
      targetPrice: targetPrice.toFixed(2),
      newLiquidationPrice: "Dynamic",
      note: `利用金字塔分批拉低均价，安全解套。`,
      evaluation: evalGrid
    });
  }

  // ======================================================
  // 策略 2: 现货分批 (Spot Grid) - 🆕 升级!
  // ======================================================
  // 现货一定是买入 (Long)
  const qtySpot = calculateRequiredQty(position, targetProfitUSD, estBuyPrice, targetPrice); // 数量逻辑同上
  
  if (qtySpot > 0) {
    // 现货杠杆 = 1
    const planSpot = createGridPlan('buy', currentPrice, qtySpot, 1);
    const evalSpot = evaluateStrategySuitability(planSpot.totalMargin, currentMarginUsed, account, 'spot_buy');
    
    strategies.push({
      id: 2,
      title: `🛡️ 现货分批囤币 (Spot Grid)`,
      type: 'grid_spot',
      action: 'Batch Spot Buy',
      isGrid: true,
      gridOrders: planSpot.orders, // 现货也分批！
      
      quantity: qtySpot.toFixed(4),
      price: `Avg $${planSpot.avgPrice.toFixed(2)}`,
      marginRequired: planSpot.totalMargin.toFixed(2),
      notionalValue: planSpot.totalNotional.toFixed(2),
      leverageUsed: 1,
      targetPrice: targetPrice.toFixed(2),
      newLiquidationPrice: "无",
      note: `资金量大时的最佳选择。分批买入现货，无惧插针。`,
      evaluation: evalSpot
    });
  }

  // ======================================================
  // 策略 3: 对冲分批 (Hedge Grid) - 🆕 升级!
  // ======================================================
  const hedgeDir = position.direction === 'long' ? 'short' : 'long'; // 反向
  // 对冲目标: 假设价格往反方向走 1.5% - 2%
  const hedgeTarget = position.direction === 'long' ? currentPrice * 0.98 : currentPrice * 1.02;
  const hedgeEstPrice = position.direction === 'long' ? currentPrice * 1.005 : currentPrice * 0.995; // 稍微反弹点再开空
  
  const profitPerUnitHedge = Math.abs(hedgeTarget - hedgeEstPrice);
  const qtyHedge = profitPerUnitHedge > 0 ? gap / profitPerUnitHedge : 0;
  
  if (qtyHedge > 0) {
    // 如果我是多头，对冲就是开空(sell)
    const actionHedge = hedgeDir === 'short' ? 'sell' : 'buy';
    const planHedge = createGridPlan(actionHedge, currentPrice, qtyHedge, leverage);
    const evalHedge = evaluateStrategySuitability(planHedge.totalMargin, currentMarginUsed, account, 'hedge');

    strategies.push({
      id: 3,
      title: `⚖️ 智能分批对冲 (Hedge Grid)`,
      type: 'grid_hedge',
      action: 'Batch ' + (actionHedge==='sell'?'Short':'Long'),
      isGrid: true,
      gridOrders: planHedge.orders, // 对冲单也分批！
      
      quantity: qtyHedge.toFixed(4),
      price: `Avg $${planHedge.avgPrice.toFixed(2)}`,
      marginRequired: planHedge.totalMargin.toFixed(2),
      leverageUsed: leverage,
      targetPrice: hedgeTarget.toFixed(2),
      newLiquidationPrice: "Locked",
      note: `不要在现价全额对冲。逢高分批开空，成本更优，抗风险更强。`,
      evaluation: evalHedge
    });
  }

  // Mixed 策略因过于复杂，保持市价操作，或建议手动执行上述 Grid 的组合
  
  return { status: 'ACTIVE', symbol, currentStatus: { /*...*/ }, strategies };
}

// ============================================
// 输出格式化 (兼容所有 Grid 显示)
// ============================================
export function formatStrategyOutput(result: any): string {
  // ... (Header) ...
  result.strategies.forEach((s: any) => {
    // ...
    if (s.isGrid && s.gridOrders) {
       // 表格表头根据类型稍微变化文案
       const typeText = s.type === 'grid_hedge' ? '对冲挂单' : '买入挂单';
       output += `| 步骤 | ${typeText} | 数量 | 本金 |\n`;
       // ... (渲染表格) ...
    }
    // ...
  });
  return output;
}