// ============================================
// 🎲 马丁格尔法则 (Martingale Strategy)
// ============================================
// 特点：
// - 一次性加仓，快速拉低均价
// - 风险高，收益快
// - 适合：短期交易、资金充裕、风险承受能力强的投资者
// - 警告：可能导致快速爆仓，需谨慎使用

export interface MartingalePlan {
  addPrice: number;      // 加仓价格
  addQty: number;        // 加仓数量
  marginRequired: number; // 所需保证金
  notionalValue: number;  // 名义价值
  newAvgPrice: number;    // 新均价
  newTotalQty: number;    // 新总持仓
}

/**
 * 计算马丁格尔加仓计划
 * @param position - 当前持仓信息
 * @param targetProfitUSD - 目标盈利金额
 * @param addPrice - 计划加仓价格
 * @param targetPrice - 目标退出价格
 * @param leverage - 杠杆倍数
 * @returns 马丁格尔加仓计划
 */
export function createMartingalePlan(
  position: { direction: 'long' | 'short'; avgPrice: number; qty: number },
  targetProfitUSD: number,
  addPrice: number,
  targetPrice: number,
  leverage: number
): MartingalePlan | null {
  const dir = position.direction === 'long' ? 1 : -1;
  
  // 计算所需加仓数量
  let addQty = 0;
  
  if (position.direction === 'long') {
    // Long: (targetPrice - newAvgPrice) * newTotalQty = targetProfitUSD
    // newAvgPrice = (oldQty * oldAvg + addQty * addPrice) / (oldQty + addQty)
    // 求解 addQty
    const profitOld = (targetPrice - position.avgPrice) * position.qty;
    const gap = targetProfitUSD - profitOld;
    const profitPerUnit = targetPrice - addPrice;
    
    if (profitPerUnit > 0) {
      addQty = gap / profitPerUnit;
    }
  } else {
    // Short: (newAvgPrice - targetPrice) * newTotalQty = targetProfitUSD
    const profitOld = (position.avgPrice - targetPrice) * position.qty;
    const gap = targetProfitUSD - profitOld;
    const profitPerUnit = addPrice - targetPrice;
    
    if (profitPerUnit > 0) {
      addQty = gap / profitPerUnit;
    }
  }
  
  if (addQty <= 0 || !isFinite(addQty)) {
    return null;
  }
  
  // 计算新的均价和总持仓
  const newTotalQty = position.qty + addQty;
  const newAvgPrice = ((position.qty * position.avgPrice) + (addQty * addPrice)) / newTotalQty;
  
  // 计算所需资金
  const notionalValue = addQty * addPrice;
  const marginRequired = notionalValue / leverage;
  
  return {
    addPrice,
    addQty,
    marginRequired,
    notionalValue,
    newAvgPrice,
    newTotalQty
  };
}

/**
 * 格式化马丁格尔计划说明
 */
export function formatMartingalePlan(plan: MartingalePlan, actionType: 'buy' | 'sell'): string {
  const action = actionType === 'buy' ? '买入' : '卖出';
  
  let output = `\n**⚡ 马丁格尔一次性加仓**\n\n`;
  output += `- **操作**: ${action} ${plan.addQty.toFixed(4)} BTC @ $${plan.addPrice.toFixed(2)}\n`;
  output += `- **所需本金**: $${plan.marginRequired.toFixed(2)}\n`;
  output += `- **新均价**: $${plan.newAvgPrice.toFixed(2)}\n`;
  output += `- **新总持仓**: ${plan.newTotalQty.toFixed(4)} BTC\n`;
  output += `\n⚠️ **风险提示**: 一次性加仓风险较高，建议优先考虑金字塔分批策略。\n`;
  
  return output;
}
