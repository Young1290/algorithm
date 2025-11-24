// ============================================
// 🔺 金字塔法则 (Pyramid Strategy)
// ============================================
// 特点：
// - 分批建仓，风险分散
// - 仓位分配：20% / 30% / 50% (越跌越买，但总量控制)
// - 价格梯队：现价 / -1.5% / -4.0%
// - 适合：长期持有、资金充裕、风险厌恶型投资者

export interface GridOrder {
  level: number;        // 批次 (1, 2, 3)
  price: string;        // 挂单价格
  qty: string;          // 数量
  margin: string;       // 所需保证金
  note: string;         // 说明
}

export interface PyramidPlan {
  orders: GridOrder[];
  avgPrice: number;     // 预期均价
  totalMargin: number;  // 总保证金
  totalNotional: number; // 总名义价值
}

/**
 * 创建金字塔分批计划
 * @param actionType - 'buy' (做多) 或 'sell' (做空)
 * @param basePrice - 基准价格（当前市价）
 * @param totalQty - 总计划数量
 * @param leverage - 杠杆倍数
 * @returns 金字塔分批计划
 */
export function createPyramidPlan(
  actionType: 'buy' | 'sell',
  basePrice: number,
  totalQty: number,
  leverage: number
): PyramidPlan {
  // 🔺 金字塔仓位分配：20% / 30% / 50%
  // 越跌越买，但每次加仓量递增（风险分散）
  const weights = [0.2, 0.3, 0.5];
  
  // 🔺 价格梯队设置
  // 买入 (Long): 现价 / -1.5% / -4.0% (越跌越买)
  // 卖出 (Short): 现价 / +1.5% / +4.0% (越涨越卖)
  const priceLevels = actionType === 'buy' 
    ? [0, 0.015, 0.04]      // 买入：向下分批
    : [0, 0.015, 0.04];     // 卖出：向上分批
    
  const gridOrders: GridOrder[] = [];
  let weightedSum = 0;
  let totalMargin = 0;
  let totalNotional = 0;

  for (let i = 0; i < 3; i++) {
    // 计算挂单价格
    const price = actionType === 'buy'
      ? basePrice * (1 - priceLevels[i])  // 买入：价格递减
      : basePrice * (1 + priceLevels[i]); // 卖出：价格递增
      
    // 计算该批次数量和保证金
    const stepQty = totalQty * weights[i];
    const stepNotional = stepQty * price;
    const stepMargin = stepNotional / leverage;
    
    // 生成批次说明
    let note = "";
    if (actionType === 'buy') {
      note = i === 0 ? "🔹 底仓 (20%)" : 
             i === 1 ? "🔸 支撑补单 (30%)" : 
                       "🔶 黄金坑 (50%)";
    } else {
      note = i === 0 ? "🔹 头仓 (20%)" : 
             i === 1 ? "🔸 阻力加空 (30%)" : 
                       "🔶 顶背离重仓 (50%)";
    }

    gridOrders.push({
      level: i + 1,
      price: price.toFixed(2),
      qty: stepQty.toFixed(4),
      margin: stepMargin.toFixed(2),
      note: note
    });

    weightedSum += stepNotional;
    totalMargin += stepMargin;
    totalNotional += stepNotional;
  }
  
  // 计算加权平均价格
  const estimatedAvgPrice = weightedSum / totalQty;
  
  return {
    orders: gridOrders,
    avgPrice: estimatedAvgPrice,
    totalMargin,
    totalNotional
  };
}

/**
 * 格式化金字塔订单表格
 */
export function formatPyramidOrders(orders: GridOrder[], actionType: 'buy' | 'sell'): string {
  const actionText = actionType === 'buy' ? '买入挂单' : '卖出挂单';
  
  let output = `\n**📊 金字塔分批计划**\n\n`;
  output += `| 批次 | ${actionText}价格 | 数量 (BTC) | 所需本金 | 说明 |\n`;
  output += `|------|----------------|-----------|---------|------|\n`;
  
  orders.forEach(order => {
    output += `| ${order.level} | $${order.price} | ${order.qty} | $${order.margin} | ${order.note} |\n`;
  });
  
  return output;
}
