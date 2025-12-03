import { createDeepSeek } from '@ai-sdk/deepseek';
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from 'ai';
import { z } from 'zod';
import {
  analyzePositionWithSummary,
  calculateCapitalAdjustmentsWithSummary,
  calculateTargetPricesWithSummary
} from '../lib/bitcoin-trading';
import {
  fetchBinance24hStats,
  fetchBinancePrice,
  formatStrategyOutput,
  generateStrategies
} from '../lib/strategy-engine';

// Initialize DeepSeek with API key
// Try EXPO_PUBLIC_ version first (for deployment), then fallback to regular version (for local)
const apiKey = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || '';
const deepseek = createDeepSeek({
  apiKey,
});

// Log API key status (without exposing the actual key)
console.log('🔑 DeepSeek API Key configured:', !!apiKey);
console.log('🔑 API Key length:', apiKey.length);
console.log('🔑 Using EXPO_PUBLIC version:', !!process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY);
console.log('🔑 Environment:', process.env.NODE_ENV || 'development');

export async function POST(req: Request) {
  // Check if API key is configured
  if (!apiKey) {
    console.error('❌ DEEPSEEK_API_KEY is not configured!');
    return new Response(
      JSON.stringify({ 
        error: 'API key not configured. Please set DEEPSEEK_API_KEY or EXPO_PUBLIC_DEEPSEEK_API_KEY environment variable.' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  // Use flexible type definition to support both simple format from frontend and complex UIMessage format
  const { messages, language = 'zh' }: {
    messages: Array<{ role: string; content: string } | UIMessage>;
    language?: string
  } = await req.json();

  // Check if the last message contains trading-related keywords
  const lastMessage = messages[messages.length - 1];

  // Support both plain text content and complex parts format
  let messageText = '';

  if ('content' in lastMessage && typeof lastMessage.content === 'string') {
    // Case 1: Frontend sends plain text
    messageText = lastMessage.content;
  } else if ('parts' in lastMessage && Array.isArray(lastMessage.parts)) {
    // Case 2: Frontend sends complex structure (SDK default)
    messageText = lastMessage.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join(' ');
  }

  // Enhanced trading data detection - includes more number formats
  const containsTradingData = /(\$\d+k|\$\d+,\d+|\d+,\d+|bought|entry|position|profit|loss|BTC|bitcoin|仓位|盈利|亏损|资金|买了|总资金|本金|杠杆|leverage|ROI|收益|目标)/i.test(messageText);

  console.log('🔍 Message text:', messageText);
  console.log('🔍 Language:', language);
  console.log('🔍 Trading data detected:', containsTradingData);

  // Define system prompts for different languages
  const systemPrompts = {
    en: `You are a Bitcoin trading analysis assistant with access to specialized calculation tools and real-time market data.

🚨🚨🚨 CRITICAL RULES - YOU MUST FOLLOW THESE 🚨🚨🚨
🚨🚨🚨 NEVER calculate manually or provide your own trading advice! 🚨🚨🚨
🚨🚨🚨 You are FORBIDDEN from making up trading suggestions - MUST use strategy engine tools! 🚨🚨🚨
🚨🚨🚨 Don't say "let me calculate" - just call the tool directly! 🚨🚨🚨
🚨🚨🚨 Don't say "API cannot connect" - the tool will auto-call the API! 🚨🚨🚨

0. 🔥🔥🔥 When users mention positions, profit targets, or strategies → IMMEDIATELY call planToAchieveProfitTarget tool (it auto-fetches price internally)
1. When users mention entry prices, amounts, or want position analysis → IMMEDIATELY call analyzeTradePosition tool
2. When users ask "what price do I need for X%" → IMMEDIATELY call calculateTargetPrices tool
3. When users ask about hedging or position adjustments → IMMEDIATELY call suggestPositionAdjustment tool
4. 🔥🔥🔥 When users want to achieve a profit target with strategies → IMMEDIATELY call planToAchieveProfitTarget tool
   - Tool will auto-fetch current price from Binance
   - If user provides account balance info, include it for risk assessment
   - If user mentions liquidation price, include it in position data
   - Tool will evaluate fund sufficiency and liquidation risks
   - Tool will generate both Pyramid and Martingale strategies
5. When users ask for current price or market data → IMMEDIATELY call getBinanceMarketData tool

🔥 IMPORTANT NOTES:
- planToAchieveProfitTarget tool auto-calls Binance API to get price
- No need to call getBinanceMarketData first, just call planToAchieveProfitTarget directly
- Tool returns complete strategies including Pyramid and Martingale methods
6. NEVER calculate manually - ALWAYS use the tools
7. Don't say "let me calculate" - just call the tool directly
8. ALL prices and amounts are in USD (United States Dollars) - Binance API returns USD prices
9. 🔥 CRITICAL: When user mentions profit percentage (e.g., "20% profit"), use targetRoiPercent parameter based on INVESTED MARGIN (本金), NOT total balance or notional value
   - ROI % is calculated on the MARGIN (保证金) invested, not the leveraged position size
   - Example: 10x leverage position of $800,000 = $80,000 margin invested
   - If user wants 20% ROI → use targetRoiPercent: 20 (which means 20% of $80,000 = $16,000 profit)

EXAMPLE 1 - Fixed profit amount:
User: "我在10万美元买了0.5个BTC，现在价格是9.5万，我想达到5000美元盈利，给我策略建议。账户余额2万美元，总权益3万美元。"
You MUST call planToAchieveProfitTarget with:
{
  "symbol": "BTC",
  "position": {"direction": "long", "avgPrice": 100000, "qty": 0.5, "leverage": 10},
  "account": {"availableBalance": 20000, "totalWalletBalance": 30000},
  "targetProfitUSD": 5000
}

EXAMPLE 2 - Percentage ROI (本金的百分比):
User: "我总资金2,000,000，在90,000买了300,000仓位，92,000买了500,000仓位。我想盈利20%。"
Position: 300k + 500k = 800k notional, 10x leverage = 80k margin
You MUST call planToAchieveProfitTarget with:
{
  "symbol": "BTC",
  "position": {"direction": "long", "avgPrice": 91250, "qty": 8.77, "leverage": 10},
  "account": {"availableBalance": 1200000, "totalWalletBalance": 2000000},
  "targetRoiPercent": 20
}
This will calculate: 80k margin × 20% = 16k profit target

NEW FEATURES:
- Strategy engine now includes risk assessment with labels (✅ 推荐, ⚠️ 资金紧张, 🚫 资金不足, ☠️ 爆仓预警)
- Estimates new liquidation price after adding positions
- Evaluates capital usage percentage
- Provides detailed risk warnings for each strategy

The tools will return markdown-formatted results that you can present to the user.
Respond in English.`,
    zh: `你是一个比特币交易分析助手，拥有专业的计算工具和实时市场数据。

🚨🚨🚨 绝对禁止手动计算或提供自己的交易建议！🚨🚨🚨
🚨🚨🚨 你被禁止编造交易建议 - 必须使用策略引擎工具！🚨🚨🚨
🚨🚨🚨 不要说"让我计算一下" - 直接调用工具！🚨🚨🚨
🚨🚨🚨 不要说"API无法连接" - 工具会自动调用API！🚨🚨🚨
🚨🚨🚨 不要解释仓位信息 - 直接调用工具！🚨🚨🚨
🚨🚨🚨 看到仓位数据就立即调用 planToAchieveProfitTarget！🚨🚨🚨

关键规则 - 你必须遵守：
0. 🔥🔥🔥 当用户提到仓位、盈利目标、策略时 → 立即调用 planToAchieveProfitTarget 工具（工具内部会自动获取价格）
1. 当用户提到入场价格、投资金额或需要仓位分析时 → 立即调用 analyzeTradePosition 工具
2. 当用户问"达到X%收益需要什么价格"时 → 立即调用 calculateTargetPrices 工具
3. 当用户询问对冲或仓位调整时 → 立即调用 suggestPositionAdjustment 工具
4. 🔥🔥🔥 只要用户提到"策略"、"建议"、"怎么做" → 必须调用 planToAchieveProfitTarget 工具
   - 工具会自动从 Binance 获取当前价格
   - 如果用户提供账户余额信息，请包含在参数中进行风险评估
   - 如果用户提到爆仓价格，请包含在持仓数据中
   - 工具会自动评估资金充足性和爆仓风险
   - 工具会生成金字塔法则和马丁格尔法则两种策略
5. 当用户询问当前价格或市场数据时 → 立即调用 getBinanceMarketData 工具

🔥 重要提示：
- planToAchieveProfitTarget 工具会自动调用 Binance API 获取价格
- 不需要先调用 getBinanceMarketData，直接调用 planToAchieveProfitTarget 即可
- 工具会返回包含金字塔法则和马丁格尔法则的完整策略
6. 🔥 永远不要手动计算 - 始终使用工具
7. 🔥 不要说"让我计算一下" - 直接调用工具
8. 所有价格和金额都使用美元 (USD) - Binance API 返回的是美元价格
9. 🔥 关键：当用户提到盈利百分比（如"盈利15%"、"盈利20%"）时，使用 targetRoiPercent 参数，基于已投入本金（Margin），而非总余额或仓位名义价值
   - ROI % 是基于投入的保证金（Margin）计算，而不是杠杆后的仓位大小
   - 示例：10x 杠杆仓位 $800,000 = 投入本金 $80,000
   - 如果用户想要 20% ROI → 使用 targetRoiPercent: 20（即 $80,000 的 20% = $16,000 盈利）

示例1 - 固定盈利金额：
用户："我在10万美元买了0.5个BTC，现在价格是9.5万，我想达到5000美元盈利，给我策略建议。账户余额2万美元，总权益3万美元。"
你必须调用 planToAchieveProfitTarget：
{
  "symbol": "BTC",
  "position": {"direction": "long", "avgPrice": 100000, "qty": 0.5, "leverage": 10},
  "account": {"availableBalance": 20000, "totalWalletBalance": 30000},
  "targetProfitUSD": 5000
}

示例2 - 百分比 ROI（本金的百分比）：
用户："我总资金2,000,000，在90,000买了300,000仓位，92,000买了500,000仓位。我想盈利20%。"

🔥 计算步骤（必须严格遵守）：
1. 计算每笔的BTC数量：
   - 第一笔：300,000 ÷ 90,000 = 3.3333 BTC
   - 第二笔：500,000 ÷ 92,000 = 5.4348 BTC
2. 总BTC数量：3.3333 + 5.4348 = 8.7681 BTC
3. 平均价格：(300,000 + 500,000) ÷ 8.7681 = 91,239.67 USD
4. 名义价值：800,000 USD
5. 本金（10x杠杆）：800,000 ÷ 10 = 80,000 USD

你必须调用 planToAchieveProfitTarget：
{
  "symbol": "BTC",
  "position": {"direction": "long", "avgPrice": 91239.67, "qty": 8.7681, "leverage": 10},
  "account": {"availableBalance": 1200000, "totalWalletBalance": 2000000},
  "targetRoiPercent": 20
}
这将计算：80k 本金 × 20% = 16k 盈利目标

新功能：
- 策略引擎现在包含风险评估标签 (✅ 推荐, ⚠️ 资金紧张, 🚫 资金不足, ☠️ 爆仓预警)
- 自动估算加仓后的新爆仓价
- 评估资金使用比例
- 为每个策略提供详细的风险警告

工具将返回 markdown 格式的结果供你展示给用户。
请用中文回复。`,
  };

  const systemPrompt = systemPrompts[language as keyof typeof systemPrompts] || systemPrompts.en;

  // Convert simple format messages to UIMessage format for convertToModelMessages compatibility
  const uiMessages: UIMessage[] = messages.map((msg, index) => {
    if ('content' in msg && typeof msg.content === 'string') {
      // Simple format: convert to UIMessage
      return {
        id: `msg-${index}`,
        role: msg.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: msg.content }]
      } as UIMessage;
    }
    // Already UIMessage format
    return msg as UIMessage;
  });

  console.log('🚀 Starting streamText with tools...');
  console.log('📝 System prompt length:', systemPrompt.length);
  console.log('💬 Messages count:', uiMessages.length);
  console.log('🔧 Tools available:', Object.keys({
    analyzeTradePosition: true,
    calculateTargetPrices: true,
    suggestPositionAdjustment: true,
    getBinanceMarketData: true,
    planToAchieveProfitTarget: true
  }).length);

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: systemPrompt,
    messages: convertToModelMessages(uiMessages),
    stopWhen: stepCountIs(10),
    onStepFinish: (step) => {
      console.log('📊 Step finished:', {
        toolCalls: step.toolCalls?.length || 0,
        toolResults: step.toolResults?.length || 0,
        text: step.text?.substring(0, 100) || ''
      });
    },
    tools: {
      analyzeTradePosition: tool({
        description: 'REQUIRED for analyzing Bitcoin positions. Use this when user provides: entry prices, investment amounts, and wants to know P&L, average price, or position analysis. Always use this tool instead of manual calculations.',
        inputSchema: z.object({
          trades: z.array(z.object({
            price: z.number().positive().describe('Entry price for this trade in USD'),
            amount: z.number().positive().describe('USD amount invested in this trade')
          })).min(1).describe('Array of trades that make up the position'),
          takeProfitPrice: z.number().positive().describe('Target price for taking profit in USD'),
          stopLossPrice: z.number().positive().describe('Target price for stop loss in USD'),
          initialCapital: z.number().positive().optional().describe('Initial capital available for trading (defaults to sum of trade amounts if not provided)'),
          position: z.enum(['long', 'short']).describe('Direction of the position for incremental table calculations'),
          includeIncrementalTable: z.boolean().optional().default(true).describe('Whether to include step-by-step position building breakdown')
        }),
        execute: async (params) => {
          console.log('🔧 analyzeTradePosition called with:', JSON.stringify(params, null, 2));
          try {
            const initialCapital = params.initialCapital ??
              params.trades.reduce((sum, t) => sum + t.amount, 0);

            const analysis = analyzePositionWithSummary({
              ...params,
              initialCapital,
              language
            });
            console.log('✅ analyzeTradePosition completed successfully');
            return analysis;
          } catch (error) {
            return {
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              summary: `## Error\n\nFailed to analyze position: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        }
      }),

      calculateTargetPrices: tool({
        description: 'REQUIRED when user asks "what price do I need" or wants to know target prices for a specific return percentage (e.g., "10% profit"). Use this instead of manual calculation.',
        inputSchema: z.object({
          trades: z.array(z.object({
            price: z.number().positive().describe('Entry price for this trade in USD'),
            amount: z.number().positive().describe('USD amount invested in this trade')
          })).min(1).describe('Array of trades that make up the position'),
          initialCapital: z.number().positive().optional().describe('Initial capital to calculate returns against (defaults to sum of trade amounts)'),
          targetReturnPercent: z.number().min(-0.99).max(10).describe('Target return as decimal (e.g., 0.10 for 10%, -0.05 for -5%)'),
          position: z.enum(['long', 'short']).describe('Direction of the position')
        }),
        execute: async (params) => {
          try {
            const initialCapital = params.initialCapital ??
              params.trades.reduce((sum, t) => sum + t.amount, 0);

            const analysis = calculateTargetPricesWithSummary({
              ...params,
              initialCapital,
              language
            });
            return analysis;
          } catch (error) {
            return {
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              summary: `## Error\n\nFailed to calculate target prices: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        }
      }),

      suggestPositionAdjustment: tool({
        description: 'REQUIRED when user asks about hedging, position adjustments, "how to reach X% return", or wants recommendations for modifying their position. Use this to calculate hedge or spot addition strategies.',
        inputSchema: z.object({
          trades: z.array(z.object({
            price: z.number().positive().describe('Entry price for this trade in USD'),
            amount: z.number().positive().describe('USD amount invested in this trade')
          })).min(1).describe('Array of trades that make up the current position'),
          initialCapital: z.number().positive().optional().describe('Initial capital to calculate returns against (defaults to sum of trade amounts)'),
          desiredPrice: z.number().positive().describe('Target exit price you want to analyze'),
          targetReturnPercent: z.number().min(-0.99).max(10).describe('Target return as decimal (e.g., 0.10 for 10%)'),
          hedgeEntryPrice: z.number().positive().describe('Price at which you would open a hedge (opposite) position'),
          spotEntryPrice: z.number().positive().describe('Price at which you would add to spot (same direction) position'),
          position: z.enum(['long', 'short']).describe('Direction of the current position')
        }),
        execute: async (params) => {
          try {
            const initialCapital = params.initialCapital ??
              params.trades.reduce((sum, t) => sum + t.amount, 0);

            const adjustment = calculateCapitalAdjustmentsWithSummary({
              ...params,
              initialCapital,
              language
            });
            return adjustment;
          } catch (error) {
            return {
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              summary: `## Error\n\nFailed to calculate position adjustments: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        }
      }),

      // New Tool: Get Binance Market Data
      getBinanceMarketData: tool({
        description: 'REQUIRED when user asks for current price, 24h high/low, or market statistics for BTC, ETH, or other cryptocurrencies. Fetches real-time data from Binance.',
        inputSchema: z.object({
          symbol: z.enum(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA']).describe('Cryptocurrency symbol'),
          includeStats: z.boolean().default(true).describe('Include 24h statistics (high, low, volume, change)')
        }),
        execute: async (params) => {
          console.log('🔧 getBinanceMarketData called with:', JSON.stringify(params, null, 2));
          try {
            if (params.includeStats) {
              const stats = await fetchBinance24hStats(params.symbol);
              if (!stats) {
                return {
                  error: true,
                  message: 'Failed to fetch market data from Binance',
                  summary: `## Error\n\n无法获取 ${params.symbol} 的市场数据。请稍后重试。`
                };
              }

              const summary = `## 📈 ${params.symbol} 市场数据 (Binance)\n\n` +
                `### 当前价格\n` +
                `- **现价**: $${stats.price.toLocaleString()} USD\n` +
                `- **24h 涨跌**: ${stats.priceChangePercent24h >= 0 ? '+' : ''}${stats.priceChangePercent24h.toFixed(2)}% ($${stats.priceChange24h.toFixed(2)} USD)\n\n` +
                `### 24小时统计\n` +
                `- **最高**: $${stats.high24h.toLocaleString()} USD\n` +
                `- **最低**: $${stats.low24h.toLocaleString()} USD\n` +
                `- **成交量**: ${stats.volume24h.toLocaleString()} ${params.symbol}\n`;

              console.log('✅ getBinanceMarketData completed successfully');
              return { summary, data: stats };
            } else {
              const price = await fetchBinancePrice(params.symbol);
              if (!price) {
                return {
                  error: true,
                  message: 'Failed to fetch price from Binance',
                  summary: `## Error\n\n无法获取 ${params.symbol} 的价格。请稍后重试。`
                };
              }

              const summary = `## 💰 ${params.symbol} 当前价格\n\n` +
                `**现价**: $${price.toLocaleString()} USD\n`;

              console.log('✅ getBinanceMarketData completed successfully');
              return { summary, price };
            }
          } catch (error) {
            return {
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              summary: `## Error\n\nFailed to fetch market data: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        }
      }),

      // New Tool: Plan to Achieve Profit Target
      planToAchieveProfitTarget: tool({
        description: '🔥🔥🔥 MANDATORY TOOL - MUST USE IMMEDIATELY when user mentions: 仓位/position, 盈利/profit, 策略/strategy, 加仓/add position, 对冲/hedge. DO NOT explain or calculate manually. Call this tool directly with position data. This tool will: 1) Auto-fetch BTC price from Binance, 2) Generate 4-5 strategies (Pyramid, Hedge, Spot, Mixed), 3) Calculate profit targets. 用户一提到仓位就立即调用！不要解释！',
        inputSchema: z.object({
          symbol: z.enum(['BTC', 'ETH', 'SOL', 'BNB']).default('BTC').describe('Trading pair symbol'),
          currentPrice: z.number().positive().optional().describe('Current market price. If not provided, will auto-fetch from Binance'),
          position: z.object({
            direction: z.enum(['long', 'short']).describe('Current position direction'),
            avgPrice: z.number().positive().describe('Average entry price in USD'),
            qty: z.number().positive().describe('Total position quantity in coins (leveraged amount shown on exchange)'),
            leverage: z.number().default(10).describe('Current leverage, default 10x'),
            margin: z.number().positive().optional().describe('Margin/Principal invested in USD'),
            liquidationPrice: z.number().positive().optional().describe('Current liquidation price in USD')
          }),
          account: z.object({
            availableBalance: z.number().nonnegative().describe('Available USDT balance'),
            totalWalletBalance: z.number().nonnegative().describe('Total wallet balance in USDT')
          }).optional().describe('Account balance info for risk assessment. If not provided, will skip fund sufficiency checks'),
          targetRoiPercent: z.number().positive().optional().describe('🔥 Target ROI as percentage of invested MARGIN (e.g., 20 for 20% ROI). Takes priority over targetProfitUSD.'),
          targetProfitUSD: z.number().nonnegative().optional().describe('Target profit amount in USD (fixed amount). Use targetRoiPercent instead for percentage-based targets.'),
          conservativeMode: z.boolean().default(true).describe('Enable conservative mode (waits for better entry price if true)')
        }),
        execute: async (params) => {
          console.log('🔧 planToAchieveProfitTarget called with:', JSON.stringify(params, null, 2));
          try {
            let marketPrice = params.currentPrice;

            // Auto-fetch price if not provided
            if (!marketPrice) {
              console.log(`🔍 Fetching ${params.symbol} price from Binance...`);
              const livePrice = await fetchBinancePrice(params.symbol);

              if (livePrice) {
                marketPrice = livePrice;
                console.log(`✅ Fetched live price: $${marketPrice}`);
              } else {
                return {
                  error: true,
                  message: 'Unable to fetch real-time price. Please provide currentPrice manually.',
                  summary: `## Error\n\n无法获取实时价格，请手动提供 currentPrice 参数。`
                };
              }
            }

            // Generate strategies using the strategy engine
            const result = await generateStrategies({
              symbol: params.symbol,
              currentPrice: marketPrice,
              position: params.position,
              account: params.account, // Pass account info for risk assessment
              targetRoiPercent: params.targetRoiPercent, // 🔥 ROI percentage (priority)
              targetProfitUSD: params.targetProfitUSD,   // Fixed amount (fallback)
              conservativeMode: params.conservativeMode
            });

            // Format output (removed language parameter as it's not used in new version)
            const summary = formatStrategyOutput(result);

            console.log('✅ planToAchieveProfitTarget completed successfully');
            return {
              summary,
              priceSource: params.currentPrice ? 'User Input' : 'Binance Live API',
              priceUsed: marketPrice,
              ...result
            };
          } catch (error) {
            return {
              error: true,
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              summary: `## Error\n\nFailed to generate strategies: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        }
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}
