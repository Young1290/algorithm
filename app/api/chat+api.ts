import { createDeepSeek } from '@ai-sdk/deepseek';
import {
  convertToModelMessages,
  stepCountIs,
  streamText, tool, UIMessage,
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
const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export async function POST(req: Request) {
  const { messages, language = 'en' }: { messages: UIMessage[]; language?: string } = await req.json();

  // Check if the last message contains trading-related keywords
  const lastMessage = messages[messages.length - 1];
  const messageText = lastMessage.parts
    .filter((part: any) => part.type === 'text')
    .map((part: any) => part.text)
    .join(' ');

  const containsTradingData = /(\$\d+k|\$\d+,\d+|bought|entry|position|profit|loss|BTC|bitcoin)/i.test(messageText);

  console.log('🔍 Trading data detected:', containsTradingData);
  console.log('🔍 Tool choice:', containsTradingData ? 'required' : 'auto');

  // Define system prompts for different languages
  const systemPrompts = {
    en: `You are a Bitcoin trading analysis assistant with access to specialized calculation tools and real-time market data.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. When users mention entry prices, amounts, or want position analysis → IMMEDIATELY call analyzeTradePosition tool
2. When users ask "what price do I need for X%" → IMMEDIATELY call calculateTargetPrices tool
3. When users ask about hedging or position adjustments → IMMEDIATELY call suggestPositionAdjustment tool
4. When users want to achieve a profit target with strategies → IMMEDIATELY call planToAchieveProfitTarget tool
   - If user provides account balance info, include it for risk assessment
   - If user mentions liquidation price, include it in position data
   - The tool will evaluate fund sufficiency and liquidation risks
5. When users ask for current price or market data → IMMEDIATELY call getBinanceMarketData tool
6. NEVER calculate manually - ALWAYS use the tools
7. Don't say "let me calculate" - just call the tool directly
8. ALL prices and amounts are in USD (United States Dollars) - Binance API returns USD prices
9. When user mentions profit percentage (e.g., "20% profit"), calculate based on INVESTED CAPITAL, not total account balance
   - Example: If user invested $800,000 and wants 20% profit → target is $160,000 (20% of $800,000)
   - NOT $400,000 (which would be 20% of total $2,000,000 balance)

EXAMPLE 1 - Fixed profit amount:
User: "我在10万美元买了0.5个BTC，现在价格是9.5万，我想达到5000美元盈利，给我策略建议。账户余额2万美元，总权益3万美元。"
You MUST call planToAchieveProfitTarget with:
{
  "symbol": "BTC",
  "position": {"direction": "long", "avgPrice": 100000, "qty": 0.5, "leverage": 10},
  "account": {"availableBalance": 20000, "totalWalletBalance": 30000},
  "targetProfitUSD": 5000
}

EXAMPLE 2 - Percentage profit:
User: "我总资金2,000,000，在90,000买了300,000仓位，92,000买了500,000仓位。我想盈利20%。"
Calculate: Invested = 300,000 + 500,000 = 800,000, Target = 800,000 × 20% = 160,000
You MUST call planToAchieveProfitTarget with:
{
  "symbol": "BTC",
  "position": {"direction": "long", "avgPrice": 91250, "qty": 8.77, "leverage": 10},
  "account": {"availableBalance": 1200000, "totalWalletBalance": 2000000},
  "targetProfitUSD": 160000
}

NEW FEATURES:
- Strategy engine now includes risk assessment with labels (✅ 推荐, ⚠️ 资金紧张, 🚫 资金不足, ☠️ 爆仓预警)
- Estimates new liquidation price after adding positions
- Evaluates capital usage percentage
- Provides detailed risk warnings for each strategy

The tools will return markdown-formatted results that you can present to the user.
Respond in English.`,
    zh: `你是一个比特币交易分析助手，拥有专业的计算工具和实时市场数据。

关键规则 - 你必须遵守：
1. 当用户提到入场价格、投资金额或需要仓位分析时 → 立即调用 analyzeTradePosition 工具
2. 当用户问"达到X%收益需要什么价格"时 → 立即调用 calculateTargetPrices 工具
3. 当用户询问对冲或仓位调整时 → 立即调用 suggestPositionAdjustment 工具
4. 当用户想要达成盈利目标并需要策略建议时 → 立即调用 planToAchieveProfitTarget 工具
   - 如果用户提供账户余额信息，请包含在参数中进行风险评估
   - 如果用户提到爆仓价格，请包含在持仓数据中
   - 工具会自动评估资金充足性和爆仓风险
5. 当用户询问当前价格或市场数据时 → 立即调用 getBinanceMarketData 工具
6. 永远不要手动计算 - 始终使用工具
7. 不要说"让我计算一下" - 直接调用工具
8. 所有价格和金额都使用美元 (USD) - Binance API 返回的是美元价格
9. 当用户提到盈利百分比（如"盈利20%"）时，基于已投入资金计算，而非账户总余额
   - 示例：用户投入了 $800,000，想要盈利20% → 目标是 $160,000（$800,000 的 20%）
   - 而不是 $400,000（总余额 $2,000,000 的 20%）

示例1 - 固定盈利金额：
用户："我在10万美元买了0.5个BTC，现在价格是9.5万，我想达到5000美元盈利，给我策略建议。账户余额2万美元，总权益3万美元。"
你必须调用 planToAchieveProfitTarget：
{
  "symbol": "BTC",
  "position": {"direction": "long", "avgPrice": 100000, "qty": 0.5, "leverage": 10},
  "account": {"availableBalance": 20000, "totalWalletBalance": 30000},
  "targetProfitUSD": 5000
}

示例2 - 百分比盈利：
用户："我总资金2,000,000，在90,000买了300,000仓位，92,000买了500,000仓位。我想盈利20%。"
计算：已投入 = 300,000 + 500,000 = 800,000，目标 = 800,000 × 20% = 160,000
你必须调用 planToAchieveProfitTarget：
{
  "symbol": "BTC",
  "position": {"direction": "long", "avgPrice": 91250, "qty": 8.77, "leverage": 10},
  "account": {"availableBalance": 1200000, "totalWalletBalance": 2000000},
  "targetProfitUSD": 160000
}

新功能：
- 策略引擎现在包含风险评估标签 (✅ 推荐, ⚠️ 资金紧张, 🚫 资金不足, ☠️ 爆仓预警)
- 自动估算加仓后的新爆仓价
- 评估资金使用比例
- 为每个策略提供详细的风险警告

工具将返回 markdown 格式的结果供你展示给用户。
请用中文回复。`,
  };

  const systemPrompt = systemPrompts[language as keyof typeof systemPrompts] || systemPrompts.en;

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
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
        description: 'Generate dynamic trading strategies to achieve profit target with risk assessment. Automatically fetches current price if not provided. Evaluates account balance and liquidation risks.',
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
          targetProfitUSD: z.number().nonnegative().describe('Target profit amount in USD'),
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
              targetProfitUSD: params.targetProfitUSD,
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