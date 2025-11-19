import { deepseek } from '@ai-sdk/deepseek';
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
    en: `You are a Bitcoin trading analysis assistant with access to specialized calculation tools.

CRITICAL RULES:
1. When users mention entry prices, amounts, or want position analysis → IMMEDIATELY call analyzeTradePosition tool
2. When users ask "what price do I need for X%" → IMMEDIATELY call calculateTargetPrices tool
3. When users ask about hedging or position adjustments → IMMEDIATELY call suggestPositionAdjustment tool
4. NEVER calculate manually - ALWAYS use the tools
5. Don't say "let me calculate" - just call the tool directly

The tools will return markdown-formatted results that you can present to the user.
Respond in English.`,
    zh: `你是一个比特币交易分析助手，拥有专业的计算工具来帮助用户。

关键规则：
1. 当用户提到入场价格、投资金额或需要仓位分析时 → 立即调用 analyzeTradePosition 工具
2. 当用户问"达到X%收益需要什么价格"时 → 立即调用 calculateTargetPrices 工具
3. 当用户询问对冲或仓位调整时 → 立即调用 suggestPositionAdjustment 工具
4. 永远不要手动计算 - 始终使用工具
5. 不要说"让我计算一下" - 直接调用工具

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
            amount: z.number().positive().describe('Dollar amount invested in this trade')
          })).min(1).describe('Array of trades that make up the position'),
          takeProfitPrice: z.number().positive().describe('Target price for taking profit'),
          stopLossPrice: z.number().positive().describe('Target price for stop loss'),
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
            amount: z.number().positive().describe('Dollar amount invested in this trade')
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
            amount: z.number().positive().describe('Dollar amount invested in this trade')
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
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'none',
    },
  });
}