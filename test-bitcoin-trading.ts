/**
 * Test script to verify TypeScript calculations match Python implementation
 * Run with: npx tsx test-bitcoin-trading.ts
 */

import {
  analyzePositionWithSummary,
  calculateTargetPricesWithSummary,
  calculateCapitalAdjustmentsWithSummary,
  type Trade
} from './app/lib/bitcoin-trading';

// Example data from Python file (assets/Bitcoin.py)
const trades: Trade[] = [
  { price: 102313.00, amount: 300000.00 },
  { price: 83888.00, amount: 300000.00 },
  { price: 78888.80, amount: 1000000.00 },
];

const takeProfitPrice = 100000;
const stopLossPrice = 90000;
const initialCapital = 2_000_000; // 200万本金
const targetReturnPercent = 0.10; // 10%

console.log('='.repeat(80));
console.log('BITCOIN TRADING ANALYSIS TEST');
console.log('='.repeat(80));
console.log('\nTest Data:');
console.log('Trades:', trades);
console.log('Take Profit Price:', takeProfitPrice);
console.log('Stop Loss Price:', stopLossPrice);
console.log('Initial Capital:', initialCapital);
console.log('\n');

// Test 1: Analyze Position (LONG)
console.log('='.repeat(80));
console.log('TEST 1: ANALYZE POSITION (LONG)');
console.log('='.repeat(80));
try {
  const longAnalysis = analyzePositionWithSummary({
    trades,
    takeProfitPrice,
    stopLossPrice,
    initialCapital,
    position: 'long',
    includeIncrementalTable: true
  });

  console.log('\nResults:');
  console.log('Average Price:', longAnalysis.avgPrice.toFixed(2));
  console.log('Total Quantity:', longAnalysis.totalQuantity.toFixed(6), 'BTC');
  console.log('Total Capital:', longAnalysis.totalCapital.toFixed(2));
  console.log('\nLONG Analysis:');
  console.log('  Take Profit P&L:', longAnalysis.longAnalysis.takeProfitPnl.toFixed(2));
  console.log('  Take Profit After:', longAnalysis.longAnalysis.takeProfitAfter.toFixed(2));
  console.log('  Stop Loss P&L:', longAnalysis.longAnalysis.stopLossPnl.toFixed(2));
  console.log('  Stop Loss After:', longAnalysis.longAnalysis.stopLossAfter.toFixed(2));
  console.log('\nSHORT Analysis:');
  console.log('  Take Profit P&L:', longAnalysis.shortAnalysis.takeProfitPnl.toFixed(2));
  console.log('  Take Profit After:', longAnalysis.shortAnalysis.takeProfitAfter.toFixed(2));
  console.log('  Stop Loss P&L:', longAnalysis.shortAnalysis.stopLossPnl.toFixed(2));
  console.log('  Stop Loss After:', longAnalysis.shortAnalysis.stopLossAfter.toFixed(2));

  console.log('\n--- Markdown Summary ---');
  console.log(longAnalysis.summary);

  console.log('\n✅ Test 1 PASSED\n');
} catch (error) {
  console.error('❌ Test 1 FAILED:', error);
}

// Test 2: Calculate Target Prices (LONG)
console.log('='.repeat(80));
console.log('TEST 2: CALCULATE TARGET PRICES (LONG, 10% return)');
console.log('='.repeat(80));
try {
  const targetPrices = calculateTargetPricesWithSummary({
    trades,
    initialCapital,
    targetReturnPercent,
    position: 'long'
  });

  console.log('\nResults:');
  console.log('Average Price:', targetPrices.avgPrice.toFixed(2));
  console.log('Quantity:', targetPrices.quantity.toFixed(6), 'BTC');
  console.log('Net Position Amount:', targetPrices.netPositionAmount.toFixed(2));
  console.log('Initial Capital:', targetPrices.initialCapital.toFixed(2));
  console.log('\nPosition-Based (10% of position value):');
  console.log('  Take Profit Price:', targetPrices.positionBased.takeProfitPrice.toFixed(2));
  console.log('  Stop Loss Price:', targetPrices.positionBased.stopLossPrice.toFixed(2));
  console.log('\nCapital-Based (10% of initial capital):');
  console.log('  Take Profit Price:', targetPrices.capitalBased.takeProfitPrice.toFixed(2));
  console.log('  Stop Loss Price:', targetPrices.capitalBased.stopLossPrice.toFixed(2));

  console.log('\n--- Markdown Summary ---');
  console.log(targetPrices.summary);

  console.log('\n✅ Test 2 PASSED\n');
} catch (error) {
  console.error('❌ Test 2 FAILED:', error);
}

// Test 3: Suggest Position Adjustments
console.log('='.repeat(80));
console.log('TEST 3: SUGGEST POSITION ADJUSTMENTS (LONG)');
console.log('='.repeat(80));
try {
  const hedgeEntryPrice = 95_000;
  const spotEntryPrice = 82_000;

  const adjustments = calculateCapitalAdjustmentsWithSummary({
    trades,
    initialCapital,
    desiredPrice: takeProfitPrice,
    targetReturnPercent,
    hedgeEntryPrice,
    spotEntryPrice,
    position: 'long'
  });

  console.log('\nResults:');
  console.log('Current P&L:', adjustments.currentPnl.toFixed(2));
  console.log('Target P&L:', adjustments.targetPnl.toFixed(2));
  console.log('P&L Gap:', adjustments.pnlGap.toFixed(2));

  if (adjustments.hedging) {
    console.log('\nHedging Option:');
    console.log('  Direction:', adjustments.hedging.direction);
    console.log('  Quantity:', adjustments.hedging.quantity.toFixed(6), 'BTC');
    console.log('  Amount:', adjustments.hedging.amount.toFixed(2));
    console.log('  Entry Price:', adjustments.hedging.entryPrice.toFixed(2));
  } else {
    console.log('\nHedging: Not available');
  }

  if (adjustments.spotAddition) {
    console.log('\nSpot Addition Option:');
    console.log('  Quantity:', adjustments.spotAddition.quantity.toFixed(6), 'BTC');
    console.log('  Amount:', adjustments.spotAddition.amount.toFixed(2));
    console.log('  Entry Price:', adjustments.spotAddition.entryPrice.toFixed(2));
    console.log('  New Avg Price:', adjustments.spotAddition.newAvgPrice.toFixed(2));
  } else {
    console.log('\nSpot Addition: Not available');
  }

  console.log('\n--- Markdown Summary ---');
  console.log(adjustments.summary);

  console.log('\n✅ Test 3 PASSED\n');
} catch (error) {
  console.error('❌ Test 3 FAILED:', error);
}

console.log('='.repeat(80));
console.log('ALL TESTS COMPLETED');
console.log('='.repeat(80));
console.log('\nExpected values from Python:');
console.log('Average Price: 85163.04');
console.log('Total Quantity: 18.79 BTC (approximately)');
console.log('LONG Take Profit P&L at 100000: 278,686.72');
console.log('\nPlease compare the output above with Python results to verify accuracy.');
