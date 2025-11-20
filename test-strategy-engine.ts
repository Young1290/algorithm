// Test file for Strategy Engine
// Run with: npx tsx test-strategy-engine.ts

import {
    fetchBinance24hStats,
    fetchBinancePrice,
    formatStrategyOutput,
    generateStrategies
} from './app/lib/strategy-engine';

async function testBinanceAPI() {
  console.log('🧪 Testing Binance API Integration\n');
  
  // Test 1: Fetch BTC price
  console.log('Test 1: Fetching BTC price...');
  const btcPrice = await fetchBinancePrice('BTC');
  if (btcPrice) {
    console.log(`✅ BTC Price: $${btcPrice.toLocaleString()}\n`);
  } else {
    console.log('❌ Failed to fetch BTC price\n');
  }
  
  // Test 2: Fetch 24h stats
  console.log('Test 2: Fetching BTC 24h stats...');
  const btcStats = await fetchBinance24hStats('BTC');
  if (btcStats) {
    console.log('✅ BTC 24h Stats:');
    console.log(`   Price: $${btcStats.price.toLocaleString()}`);
    console.log(`   24h High: $${btcStats.high24h.toLocaleString()}`);
    console.log(`   24h Low: $${btcStats.low24h.toLocaleString()}`);
    console.log(`   24h Change: ${btcStats.priceChangePercent24h.toFixed(2)}%\n`);
  } else {
    console.log('❌ Failed to fetch BTC stats\n');
  }
}

async function testStrategyEngine() {
  console.log('🧪 Testing Strategy Engine\n');
  
  // Fetch current BTC price
  const currentPrice = await fetchBinancePrice('BTC');
  if (!currentPrice) {
    console.log('❌ Cannot test without current price');
    return;
  }
  
  // Test scenario: User bought BTC at higher prices and wants to recover
  const testParams = {
    symbol: 'BTC',
    currentPrice: currentPrice,
    position: {
      direction: 'long' as const,
      avgPrice: currentPrice * 1.05, // Bought 5% higher
      qty: 0.5,
      leverage: 10,
      margin: (currentPrice * 1.05 * 0.5) / 10
    },
    targetProfitMYR: 10000,
    conservativeMode: true
  };
  
  console.log('Test Scenario:');
  console.log(`  Symbol: ${testParams.symbol}`);
  console.log(`  Current Price: $${testParams.currentPrice.toLocaleString()}`);
  console.log(`  Position: ${testParams.position.direction}`);
  console.log(`  Avg Price: $${testParams.position.avgPrice.toLocaleString()}`);
  console.log(`  Quantity: ${testParams.position.qty} BTC`);
  console.log(`  Target Profit: ${testParams.targetProfitMYR.toLocaleString()} MYR\n`);
  
  // Generate strategies
  console.log('Generating strategies...\n');
  const result = generateStrategies(testParams);
  
  // Format and display output
  const output = formatStrategyOutput(result, 'zh');
  console.log(output);
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('  Dynamic Strategy Engine - Test Suite');
  console.log('='.repeat(60));
  console.log();
  
  try {
    await testBinanceAPI();
    console.log('='.repeat(60));
    console.log();
    await testStrategyEngine();
    console.log('='.repeat(60));
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run tests
runTests();
