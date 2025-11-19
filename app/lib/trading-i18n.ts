// Translation helper for trading library
// This is separate from the main i18n because the trading library is used in the API route

interface TradingTranslations {
  positionAnalysis: string;
  longPosition: string;
  shortPosition: string;
  incrementalBuilding: string;
  targetPriceAnalysis: string;
  positionBasedReturns: string;
  capitalBasedReturns: string;
  capitalAdjustment: string;
  hedgingOption: string;
  spotAdditionOption: string;
  averagePrice: string;
  totalQuantity: string;
  positionValue: string;
  takeProfit: string;
  stopLoss: string;
  remainingCapital: string;
  quantity: string;
  amount: string;
  entryPrice: string;
  newAveragePrice: string;
  currentPnL: string;
  targetPnL: string;
  gapToClose: string;
  profit: string;
  loss: string;
  long: string;
  short: string;
  openShort: string;
  openLong: string;
  buyMore: string;
  sellMore: string;
  cannotHedge: string;
  cannotAddSpot: string;
  position: string;
  targetPrice: string;
  action: string;
  netPositionAmount: string;
  initialCapital: string;
  targetReturn: string;
  basedOnPosition: string;
  basedOnCapital: string;
  takeProfitPrice: string;
  stopLossPrice: string;
  price: string;
  cumulativePosition: string;
  avgPrice: string;
  tpPnL: string;
  tpAfter: string;
  slPnL: string;
  slAfter: string;
}

const translations: Record<string, TradingTranslations> = {
  en: {
    positionAnalysis: '## Position Analysis',
    longPosition: '### LONG Position Scenarios',
    shortPosition: '### SHORT Position Scenarios',
    incrementalBuilding: '### Incremental Position Building',
    targetPriceAnalysis: '## Target Price Analysis',
    positionBasedReturns: '### Position-Based Returns',
    capitalBasedReturns: '### Capital-Based Returns',
    capitalAdjustment: '## Capital Adjustment Suggestions',
    hedgingOption: '### Option 1: Hedging (Opposite Position)',
    spotAdditionOption: '### Option 2: Spot Addition (Same Direction)',
    averagePrice: '**Average Price:**',
    totalQuantity: '**Total Quantity:**',
    positionValue: '**Position Value:**',
    takeProfit: '**Take Profit:**',
    stopLoss: '**Stop Loss:**',
    remainingCapital: 'Remaining Capital',
    quantity: '**Quantity:**',
    amount: '**Amount:**',
    entryPrice: '**Entry Price:**',
    newAveragePrice: '**New Average Price:**',
    currentPnL: '**Current P&L:**',
    targetPnL: '**Target P&L:**',
    gapToClose: '**Gap to Close:**',
    profit: 'Profit',
    loss: 'Loss',
    long: 'LONG',
    short: 'SHORT',
    openShort: 'Open Short',
    openLong: 'Open Long',
    buyMore: 'Buy more BTC',
    sellMore: 'Sell more BTC',
    cannotHedge: 'Cannot hedge: entry price equals target price',
    cannotAddSpot: 'Cannot add spot: entry price equals target price',
    position: '**Position:**',
    targetPrice: '**Target Price:**',
    action: '**Action:**',
    netPositionAmount: '**Net Position Amount:**',
    initialCapital: '**Initial Capital:**',
    targetReturn: '**Target Return:**',
    basedOnPosition: '(Based on position value:',
    basedOnCapital: '(Based on initial capital:',
    takeProfitPrice: '**Take Profit Price:**',
    stopLossPrice: '**Stop Loss Price:**',
    price: 'Price',
    cumulativePosition: 'Cumulative',
    avgPrice: 'Avg Price',
    tpPnL: 'TP P&L',
    tpAfter: 'TP After',
    slPnL: 'SL P&L',
    slAfter: 'SL After',
  },
  zh: {
    positionAnalysis: '## 仓位分析',
    longPosition: '### 多头仓位场景',
    shortPosition: '### 空头仓位场景',
    incrementalBuilding: '### 增量建仓',
    targetPriceAnalysis: '## 目标价格分析',
    positionBasedReturns: '### 基于仓位的收益',
    capitalBasedReturns: '### 基于资金的收益',
    capitalAdjustment: '## 资金调整建议',
    hedgingOption: '### 方案一：对冲（反向仓位）',
    spotAdditionOption: '### 方案二：现货加仓（同方向）',
    averagePrice: '**平均价格：**',
    totalQuantity: '**总数量：**',
    positionValue: '**仓位价值：**',
    takeProfit: '**止盈：**',
    stopLoss: '**止损：**',
    remainingCapital: '剩余资金',
    quantity: '**数量：**',
    amount: '**金额：**',
    entryPrice: '**入场价格：**',
    newAveragePrice: '**新平均价格：**',
    currentPnL: '**当前盈亏：**',
    targetPnL: '**目标盈亏：**',
    gapToClose: '**需要弥补的差距：**',
    profit: '盈利',
    loss: '亏损',
    long: '多头',
    short: '空头',
    openShort: '开空头',
    openLong: '开多头',
    buyMore: '买入更多 BTC',
    sellMore: '卖出更多 BTC',
    cannotHedge: '无法对冲：入场价格等于目标价格',
    cannotAddSpot: '无法加仓：入场价格等于目标价格',
    position: '**仓位：**',
    targetPrice: '**目标价格：**',
    action: '**操作：**',
    netPositionAmount: '**净仓位金额：**',
    initialCapital: '**初始资金：**',
    targetReturn: '**目标收益：**',
    basedOnPosition: '（基于仓位价值：',
    basedOnCapital: '（基于初始资金：',
    takeProfitPrice: '**止盈价格：**',
    stopLossPrice: '**止损价格：**',
    price: '价格',
    cumulativePosition: '累计',
    avgPrice: '平均价格',
    tpPnL: '止盈盈亏',
    tpAfter: '止盈后',
    slPnL: '止损盈亏',
    slAfter: '止损后',
  },
};

export function getTradingTranslations(language: string = 'en'): TradingTranslations {
  return translations[language] || translations.en;
}
