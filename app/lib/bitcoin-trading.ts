// TypeScript port of Bitcoin trading analysis functions

// ============================================================
// Type Definitions
// ============================================================

export interface Trade {
  price: number;
  amount: number;
}

export type Position = 'long' | 'short';

export interface AvgPriceResult {
  avgPrice: number;
  qty: number;
}

export interface PositionPnL {
  takeProfitPnl: number;
  takeProfitAfter: number;
  stopLossPnl: number;
  stopLossAfter: number;
}

export interface PositionAnalysis {
  avgPrice: number;
  totalQuantity: number;
  totalCapital: number;
  longAnalysis: PositionPnL;
  shortAnalysis: PositionPnL;
  summary: string;
}

export interface IncrementalTableRow {
  step: number;
  price: number;
  amount: number;
  cumulativeAmount: number;
  avgPrice: number;
  takeProfitPnl: number;
  takeProfitAfter: number;
  stopLossPnl: number;
  stopLossAfter: number;
}

export interface TargetPriceAnalysis {
  avgPrice: number;
  quantity: number;
  netPositionAmount: number;
  initialCapital: number;
  position: Position;
  returnPercent: number;
  positionBased: {
    takeProfitPrice: number;
    stopLossPrice: number;
  };
  capitalBased: {
    takeProfitPrice: number;
    stopLossPrice: number;
  };
  summary: string;
}

export interface CapitalAdjustment {
  currentPnl: number;
  targetPnl: number;
  pnlGap: number;
  desiredPrice: number;
  position: Position;
  hedging: {
    direction: Position;
    quantity: number;
    amount: number;
    entryPrice: number;
  } | null;
  spotAddition: {
    quantity: number;
    amount: number;
    entryPrice: number;
    newAvgPrice: number;
  } | null;
  summary: string;
}

// ============================================================
// Core Calculation Functions
// ============================================================

/**
 * Calculate average price and total quantity from trades
 */
export function calcAvgPrice(trades: Trade[]): AvgPriceResult {
  if (trades.length === 0) {
    throw new Error('Trades array cannot be empty');
  }

  // total_cost = sum(amount) since amount is already in dollar value
  const totalCost = trades.reduce((sum, t) => sum + t.amount, 0);

  // total_qty = sum(amount / price) to get BTC quantity
  const totalQty = trades.reduce((sum, t) => sum + (t.amount / t.price), 0);

  if (totalQty === 0) {
    throw new Error('Total quantity cannot be zero');
  }

  const avgPrice = totalCost / totalQty;

  return {
    avgPrice,
    qty: totalQty
  };
}

/**
 * Calculate profit/loss for a position
 */
export function calcPnl(
  avgPrice: number,
  qty: number,
  targetPrice: number,
  position: Position
): number {
  if (position === 'long') {
    return (targetPrice - avgPrice) * qty;
  } else {
    return (avgPrice - targetPrice) * qty;
  }
}

/**
 * Calculate target price needed to achieve desired return percentage
 */
export function calcTargetPriceForReturn(
  avgPrice: number,
  qty: number,
  capitalBase: number,
  returnPct: number,
  position: Position
): number {
  const targetPnl = capitalBase * returnPct;

  if (position === 'long') {
    // (target_price - avg_price) * qty = target_pnl
    return avgPrice + targetPnl / qty;
  } else {
    // (avg_price - target_price) * qty = target_pnl
    return avgPrice - targetPnl / qty;
  }
}

// ============================================================
// Analysis Functions
// ============================================================

/**
 * Analyze a trading position with P&L calculations
 */
export function analyzePosition(params: {
  trades: Trade[];
  takeProfitPrice: number;
  stopLossPrice: number;
  initialCapital: number;
}): Omit<PositionAnalysis, 'summary'> {
  const { trades, takeProfitPrice, stopLossPrice, initialCapital } = params;

  const { avgPrice, qty } = calcAvgPrice(trades);
  const totalCapital = trades.reduce((sum, t) => sum + t.amount, 0);

  // Calculate for LONG position
  const longTpPnl = calcPnl(avgPrice, qty, takeProfitPrice, 'long');
  const longSlPnl = calcPnl(avgPrice, qty, stopLossPrice, 'long');

  // Calculate for SHORT position
  const shortTpPnl = calcPnl(avgPrice, qty, takeProfitPrice, 'short');
  const shortSlPnl = calcPnl(avgPrice, qty, stopLossPrice, 'short');

  return {
    avgPrice,
    totalQuantity: qty,
    totalCapital,
    longAnalysis: {
      takeProfitPnl: longTpPnl,
      takeProfitAfter: initialCapital + longTpPnl,
      stopLossPnl: longSlPnl,
      stopLossAfter: initialCapital + longSlPnl
    },
    shortAnalysis: {
      takeProfitPnl: shortTpPnl,
      takeProfitAfter: initialCapital + shortTpPnl,
      stopLossPnl: shortSlPnl,
      stopLossAfter: initialCapital + shortSlPnl
    }
  };
}

/**
 * Generate incremental position building table
 */
export function generateIncrementalTable(params: {
  trades: Trade[];
  takeProfitPrice: number;
  stopLossPrice: number;
  initialCapital: number;
  position: Position;
}): IncrementalTableRow[] {
  const { trades, takeProfitPrice, stopLossPrice, initialCapital, position } = params;

  const rows: IncrementalTableRow[] = [];
  let cumAmount = 0;

  for (let idx = 0; idx < trades.length; idx++) {
    const subTrades = trades.slice(0, idx + 1);
    const { avgPrice, qty } = calcAvgPrice(subTrades);
    cumAmount = subTrades.reduce((sum, t) => sum + t.amount, 0);

    const tpPnl = calcPnl(avgPrice, qty, takeProfitPrice, position);
    const slPnl = calcPnl(avgPrice, qty, stopLossPrice, position);
    const tpAfter = initialCapital + tpPnl;
    const slAfter = initialCapital + slPnl;

    const lastTrade = trades[idx];

    rows.push({
      step: idx + 1,
      price: lastTrade.price,
      amount: lastTrade.amount,
      cumulativeAmount: cumAmount,
      avgPrice,
      takeProfitPnl: tpPnl,
      takeProfitAfter: tpAfter,
      stopLossPnl: slPnl,
      stopLossAfter: slAfter
    });
  }

  return rows;
}

/**
 * Calculate target prices for desired return percentage
 */
export function calculateTargetPricesForReturn(params: {
  trades: Trade[];
  initialCapital: number;
  targetReturnPercent: number;
  position: Position;
}): TargetPriceAnalysis {
  const { trades, initialCapital, targetReturnPercent, position } = params;

  const { avgPrice, qty } = calcAvgPrice(trades);
  const netPositionAmount = trades.reduce((sum, t) => sum + t.amount, 0);

  const tpPct = targetReturnPercent;  // Take profit: gain returnPct
  const slPct = -targetReturnPercent; // Stop loss: lose returnPct

  // Position-based calculations
  const positionTpPrice = calcTargetPriceForReturn(
    avgPrice, qty, netPositionAmount, tpPct, position
  );
  const positionSlPrice = calcTargetPriceForReturn(
    avgPrice, qty, netPositionAmount, slPct, position
  );

  // Capital-based calculations
  const capitalTpPrice = calcTargetPriceForReturn(
    avgPrice, qty, initialCapital, tpPct, position
  );
  const capitalSlPrice = calcTargetPriceForReturn(
    avgPrice, qty, initialCapital, slPct, position
  );

  return {
    avgPrice,
    quantity: qty,
    netPositionAmount,
    initialCapital,
    position,
    returnPercent: targetReturnPercent,
    positionBased: {
      takeProfitPrice: positionTpPrice,
      stopLossPrice: positionSlPrice
    },
    capitalBased: {
      takeProfitPrice: capitalTpPrice,
      stopLossPrice: capitalSlPrice
    },
    summary: '' // Will be filled by formatting function
  };
}

/**
 * Suggest capital adjustments (hedging or spot addition) to achieve target returns
 */
export function calculateCapitalAdjustments(params: {
  trades: Trade[];
  initialCapital: number;
  desiredPrice: number;
  targetReturnPercent: number;
  hedgeEntryPrice: number;
  spotEntryPrice: number;
  position: Position;
}): CapitalAdjustment {
  const {
    trades,
    initialCapital,
    desiredPrice,
    targetReturnPercent,
    hedgeEntryPrice,
    spotEntryPrice,
    position
  } = params;

  const { avgPrice, qty } = calcAvgPrice(trades);

  const currentPnl = calcPnl(avgPrice, qty, desiredPrice, position);
  const targetPnl = initialCapital * targetReturnPercent;
  const pnlGap = targetPnl - currentPnl;

  // Calculate quantity needed for a given entry price and direction
  function qtyNeeded(entryPrice: number, direction: Position): { qty: number; amount: number } | null {
    const unitPnl = calcPnl(entryPrice, 1, desiredPrice, direction);

    if (Math.abs(unitPnl) < 1e-9) {
      return null; // Cannot adjust if entry price equals desired price
    }

    const qtyVal = pnlGap / unitPnl;
    const amountVal = qtyVal * entryPrice;

    return { qty: qtyVal, amount: amountVal };
  }

  // Hedging (open opposite position)
  const hedgeDirection: Position = position === 'long' ? 'short' : 'long';
  const hedgeResult = qtyNeeded(hedgeEntryPrice, hedgeDirection);

  // Spot addition (add to same position)
  const spotResult = qtyNeeded(spotEntryPrice, position);

  let newAvgPrice = 0;
  if (spotResult) {
    const newQty = qty + spotResult.qty;
    newAvgPrice = newQty !== 0
      ? ((qty * avgPrice) + (spotResult.qty * spotEntryPrice)) / newQty
      : 0;
  }

  return {
    currentPnl,
    targetPnl,
    pnlGap,
    desiredPrice,
    position,
    hedging: hedgeResult ? {
      direction: hedgeDirection,
      quantity: hedgeResult.qty,
      amount: hedgeResult.amount,
      entryPrice: hedgeEntryPrice
    } : null,
    spotAddition: spotResult ? {
      quantity: spotResult.qty,
      amount: spotResult.amount,
      entryPrice: spotEntryPrice,
      newAvgPrice
    } : null,
    summary: '' // Will be filled by formatting function
  };
}

// ============================================================
// Markdown Formatting Utilities
// ============================================================

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatBTC(value: number): string {
  return value.toFixed(6);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatPnlLabel(pnl: number): string {
  return pnl >= 0 ? 'Profit' : 'Loss';
}

/**
 * Format position analysis as markdown
 */
export function formatAnalysisSummary(
  analysis: Omit<PositionAnalysis, 'summary'>,
  incrementalTable: IncrementalTableRow[] | null
): string {
  let md = '## Position Analysis\n\n';
  md += `**Average Price:** ${formatCurrency(analysis.avgPrice)}\n`;
  md += `**Total Quantity:** ${formatBTC(analysis.totalQuantity)} BTC\n`;
  md += `**Position Value:** ${formatCurrency(analysis.totalCapital)}\n\n`;

  md += '### LONG Position Scenarios\n\n';
  md += `**Take Profit:** ${formatPnlLabel(analysis.longAnalysis.takeProfitPnl)} of ${formatCurrency(Math.abs(analysis.longAnalysis.takeProfitPnl))}\n`;
  md += `- Remaining Capital: ${formatCurrency(analysis.longAnalysis.takeProfitAfter)}\n\n`;
  md += `**Stop Loss:** ${formatPnlLabel(analysis.longAnalysis.stopLossPnl)} of ${formatCurrency(Math.abs(analysis.longAnalysis.stopLossPnl))}\n`;
  md += `- Remaining Capital: ${formatCurrency(analysis.longAnalysis.stopLossAfter)}\n\n`;

  md += '### SHORT Position Scenarios\n\n';
  md += `**Take Profit:** ${formatPnlLabel(analysis.shortAnalysis.takeProfitPnl)} of ${formatCurrency(Math.abs(analysis.shortAnalysis.takeProfitPnl))}\n`;
  md += `- Remaining Capital: ${formatCurrency(analysis.shortAnalysis.takeProfitAfter)}\n\n`;
  md += `**Stop Loss:** ${formatPnlLabel(analysis.shortAnalysis.stopLossPnl)} of ${formatCurrency(Math.abs(analysis.shortAnalysis.stopLossPnl))}\n`;
  md += `- Remaining Capital: ${formatCurrency(analysis.shortAnalysis.stopLossAfter)}\n\n`;

  if (incrementalTable) {
    md += formatIncrementalTable(incrementalTable);
  }

  return md;
}

/**
 * Format incremental table as markdown
 */
export function formatIncrementalTable(rows: IncrementalTableRow[]): string {
  let md = '### Incremental Position Building\n\n';
  md += '| # | Price | Position | Cumulative | Avg Price | TP P&L | TP After | SL P&L | SL After |\n';
  md += '|---|------:|----------:|-----------:|----------:|--------:|---------:|--------:|---------:|\n';

  for (const row of rows) {
    md += `| ${row.step} `;
    md += `| ${formatCurrency(row.price)} `;
    md += `| ${formatCurrency(row.amount)} `;
    md += `| ${formatCurrency(row.cumulativeAmount)} `;
    md += `| ${formatCurrency(row.avgPrice)} `;
    md += `| ${formatCurrency(row.takeProfitPnl)} `;
    md += `| ${formatCurrency(row.takeProfitAfter)} `;
    md += `| ${formatCurrency(row.stopLossPnl)} `;
    md += `| ${formatCurrency(row.stopLossAfter)} |\n`;
  }

  md += '\n';
  return md;
}

/**
 * Format target price analysis as markdown
 */
export function formatTargetPrices(analysis: Omit<TargetPriceAnalysis, 'summary'>): string {
  const posLabel = analysis.position.toUpperCase();

  let md = '## Target Price Analysis\n\n';
  md += `**Position:** ${posLabel}\n`;
  md += `**Average Price:** ${formatCurrency(analysis.avgPrice)}\n`;
  md += `**Quantity:** ${formatBTC(analysis.quantity)} BTC\n`;
  md += `**Net Position Amount:** ${formatCurrency(analysis.netPositionAmount)}\n`;
  md += `**Initial Capital:** ${formatCurrency(analysis.initialCapital)}\n`;
  md += `**Target Return:** ${formatPercent(analysis.returnPercent)}\n\n`;

  md += '### Position-Based Returns\n';
  md += `(Based on position value: ${formatCurrency(analysis.netPositionAmount)})\n\n`;
  md += `**Take Profit Price:** ${formatCurrency(analysis.positionBased.takeProfitPrice)}\n`;
  md += `**Stop Loss Price:** ${formatCurrency(analysis.positionBased.stopLossPrice)}\n\n`;

  md += '### Capital-Based Returns\n';
  md += `(Based on initial capital: ${formatCurrency(analysis.initialCapital)})\n\n`;
  md += `**Take Profit Price:** ${formatCurrency(analysis.capitalBased.takeProfitPrice)}\n`;
  md += `**Stop Loss Price:** ${formatCurrency(analysis.capitalBased.stopLossPrice)}\n\n`;

  return md;
}

/**
 * Format capital adjustment suggestions as markdown
 */
export function formatAdjustmentSuggestions(adjustment: Omit<CapitalAdjustment, 'summary'>): string {
  const posLabel = adjustment.position.toUpperCase();

  let md = '## Capital Adjustment Suggestions\n\n';
  md += `**Position:** ${posLabel}\n`;
  md += `**Target Price:** ${formatCurrency(adjustment.desiredPrice)}\n`;
  md += `**Current P&L:** ${formatCurrency(adjustment.currentPnl)}\n`;
  md += `**Target P&L:** ${formatCurrency(adjustment.targetPnl)}\n`;
  md += `**Gap to Close:** ${formatCurrency(adjustment.pnlGap)}\n\n`;

  md += '### Option 1: Hedging (Opposite Position)\n\n';
  if (adjustment.hedging) {
    const action = adjustment.hedging.direction === 'short' ? 'Short' : 'Long';
    md += `**Action:** Open ${action} position\n`;
    md += `**Quantity:** ${adjustment.hedging.quantity >= 0 ? '+' : ''}${formatBTC(adjustment.hedging.quantity)} BTC\n`;
    md += `**Amount:** ${formatCurrency(adjustment.hedging.amount)}\n`;
    md += `**Entry Price:** ${formatCurrency(adjustment.hedging.entryPrice)}\n\n`;
  } else {
    md += '*Cannot hedge: entry price equals target price*\n\n';
  }

  md += '### Option 2: Spot Addition (Same Direction)\n\n';
  if (adjustment.spotAddition) {
    const action = adjustment.position === 'long' ? 'Buy' : 'Sell';
    md += `**Action:** ${action} more BTC\n`;
    md += `**Quantity:** ${adjustment.spotAddition.quantity >= 0 ? '+' : ''}${formatBTC(adjustment.spotAddition.quantity)} BTC\n`;
    md += `**Amount:** ${formatCurrency(adjustment.spotAddition.amount)}\n`;
    md += `**Entry Price:** ${formatCurrency(adjustment.spotAddition.entryPrice)}\n`;
    md += `**New Average Price:** ${formatCurrency(adjustment.spotAddition.newAvgPrice)}\n\n`;
  } else {
    md += '*Cannot add spot: entry price equals target price*\n\n';
  }

  return md;
}

/**
 * Complete analysis with formatted summary
 */
export function analyzePositionWithSummary(params: {
  trades: Trade[];
  takeProfitPrice: number;
  stopLossPrice: number;
  initialCapital: number;
  position: Position;
  includeIncrementalTable: boolean;
}): PositionAnalysis {
  const analysis = analyzePosition(params);
  const table = params.includeIncrementalTable
    ? generateIncrementalTable(params)
    : null;

  return {
    ...analysis,
    summary: formatAnalysisSummary(analysis, table)
  };
}

/**
 * Complete target price analysis with formatted summary
 */
export function calculateTargetPricesWithSummary(params: {
  trades: Trade[];
  initialCapital: number;
  targetReturnPercent: number;
  position: Position;
}): TargetPriceAnalysis {
  const analysis = calculateTargetPricesForReturn(params);

  return {
    ...analysis,
    summary: formatTargetPrices(analysis)
  };
}

/**
 * Complete capital adjustment with formatted summary
 */
export function calculateCapitalAdjustmentsWithSummary(params: {
  trades: Trade[];
  initialCapital: number;
  desiredPrice: number;
  targetReturnPercent: number;
  hedgeEntryPrice: number;
  spotEntryPrice: number;
  position: Position;
}): CapitalAdjustment {
  const adjustment = calculateCapitalAdjustments(params);

  return {
    ...adjustment,
    summary: formatAdjustmentSuggestions(adjustment)
  };
}
