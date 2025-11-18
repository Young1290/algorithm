# Tool Calling Configuration Options

## Current Implementation
The API is now configured to encourage tool usage through:
1. System prompt that mandates tool use
2. Clear "REQUIRED" keywords in tool descriptions
3. Increased maxSteps to allow more tool interactions

## Additional Options if Tools Still Aren't Being Called

### Option 1: Force Tool Selection with `toolChoice`

Add `toolChoice: 'required'` to force the model to call a tool:

```typescript
const result = streamText({
  model: deepseek('deepseek-chat'),
  system: '...',
  messages: convertToModelMessages(messages),
  maxSteps: 10,
  toolChoice: 'required', // Forces model to call at least one tool
  tools: {
    // ... tools
  }
});
```

**Pros:** Guarantees tool calling
**Cons:** Might call tools even when not appropriate

### Option 2: Force Specific Tool with Object Form

```typescript
toolChoice: {
  type: 'tool',
  toolName: 'analyzeTradePosition'
}
```

**Pros:** Ensures specific tool is used
**Cons:** Less flexible, only works for single-tool scenarios

### Option 3: Conditional Tool Forcing

Detect keywords in user message and force tool calling:

```typescript
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Check if last message contains trading data
  const lastMessage = messages[messages.length - 1];
  const containsTradingData = /(\$\d+k|\$\d+,\d+|bought|entry|position)/i.test(lastMessage.content);

  const result = streamText({
    model: deepseek('deepseek-chat'),
    system: '...',
    messages: convertToModelMessages(messages),
    maxSteps: 10,
    toolChoice: containsTradingData ? 'required' : 'auto', // Force only when relevant
    tools: {
      // ... tools
    }
  });

  return result.toUIMessageStreamResponse({...});
}
```

**Pros:** Smart forcing only when needed
**Cons:** Requires pattern matching logic

### Option 4: Use Different Model

Some models are better at tool calling than others. Consider:
- OpenAI GPT-4 (excellent tool calling)
- Anthropic Claude (strong tool calling)
- Experiment with deepseek parameters

### Option 5: Add Examples in System Prompt

Enhance system prompt with examples:

```typescript
system: `You are a Bitcoin trading analysis assistant. When users provide trading data (entry prices, amounts, target prices), you MUST use the available tools to perform calculations. Never calculate manually - always use the provided tools for accuracy.

Examples:
- User mentions "bought BTC at X price" → Use analyzeTradePosition
- User asks "what price do I need for X% return" → Use calculateTargetPrices
- User asks "should I hedge" → Use suggestPositionAdjustment

IMPORTANT: Even if you think you can calculate manually, you MUST use tools.`
```

### Option 6: Make initialCapital Optional

In the user's example, they didn't provide initial capital. You could make it optional:

```typescript
initialCapital: z.number().positive().optional().default(0)
  .describe('Initial capital available for trading (defaults to sum of trade amounts if not provided)')
```

Then in the execute function:

```typescript
execute: async (params) => {
  const initialCapital = params.initialCapital ||
    params.trades.reduce((sum, t) => sum + t.amount, 0);

  const analysis = analyzePositionWithSummary({
    ...params,
    initialCapital
  });
  return analysis;
}
```

## Testing Tool Calling

To verify tools are being called:

1. Add logging in execute functions:
```typescript
execute: async (params) => {
  console.log('🔧 analyzeTradePosition called with:', params);
  // ... rest of code
}
```

2. Check network requests in browser DevTools (look for tool_calls in response)

3. Test with explicit phrases:
   - "Use the analyze tool to check my position"
   - "Call the position analysis function"

## Recommended Approach

Start with the current implementation (system prompt + improved descriptions). If tools still aren't being called:

1. Try Option 3 (conditional forcing) - best balance
2. If that doesn't work, use Option 1 (always require)
3. Consider Option 5 (examples) to enhance understanding
4. Make initialCapital optional (Option 6) for better UX

## Debug Mode

Add this to see what the model is thinking:

```typescript
const result = streamText({
  // ... other options
  onStepFinish: (step) => {
    console.log('Step:', step);
    console.log('Tool calls:', step.toolCalls);
  }
});
```
