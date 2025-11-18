# Debug Tool Calling - Step by Step Guide

## What I Just Fixed

### 1. **Conditional Tool Forcing** ✅
When the user message contains trading keywords (`$`, `bought`, `BTC`, `position`, `profit`, `loss`), the API now automatically sets `toolChoice: 'required'` to force the AI to call a tool.

### 2. **Enhanced System Prompt** ✅
Much more explicit instructions:
- Lists exactly when to call each tool
- Says "IMMEDIATELY call" instead of vague instructions
- Tells AI not to say "let me calculate" - just call the tool

### 3. **Debug Logging** ✅
Added console logs to track:
- Whether trading data is detected
- What `toolChoice` is set to
- What happens at each step
- When tools are actually called

## How to Test Right Now

### Step 1: Restart Dev Server
```bash
# Kill current server (Ctrl+C) then restart
npm run dev
```

### Step 2: Watch Server Console
Keep your terminal visible - you'll see logs like:
```
🔍 Trading data detected: true
🔍 Tool choice: required
📊 Step finished: { stepType: 'tool-call', toolCalls: ['analyzeTradePosition'], ... }
🔧 analyzeTradePosition called with: { trades: [...], ... }
✅ analyzeTradePosition completed successfully
```

### Step 3: Send Test Message
In your chat UI, send:
```
I bought BTC at $102,313, $83,888, and $78,888 with amounts of $300k, $300k, and $1M.
What's my position if I take profit at $100k or stop loss at $90k? I'm long.
```

### Step 4: Check Console Output

#### ✅ Success Pattern:
```
🔍 Trading data detected: true
🔍 Tool choice: required
📊 Step finished: { stepType: 'tool-call', toolCalls: [ 'analyzeTradePosition' ], ... }
🔧 analyzeTradePosition called with: { ... }
✅ analyzeTradePosition completed successfully
📊 Step finished: { stepType: 'response', toolCalls: undefined, ... }
```

#### ❌ Failure Pattern:
```
🔍 Trading data detected: true
🔍 Tool choice: required
📊 Step finished: { stepType: 'response', toolCalls: undefined, text: 'Let me calculate...' }
```

## If It's Still Stuck

### Issue 1: "Let me calculate..." appears but no tool call

**Diagnosis:** The model is ignoring `toolChoice: 'required'`

**Solution:** The deepseek model might not fully support `toolChoice`. Try these alternatives:

#### Option A: Switch to OpenAI (Best Tool Calling Support)
```typescript
import { openai } from '@ai-sdk/openai';

const result = streamText({
  model: openai('gpt-4-turbo'),  // or 'gpt-4o'
  // ... rest of config
});
```

#### Option B: Switch to Anthropic Claude
```typescript
import { anthropic } from '@ai-sdk/anthropic';

const result = streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  // ... rest of config
});
```

#### Option C: Make System Prompt Even More Aggressive
```typescript
system: `You are a Bitcoin trading analysis assistant.

YOU HAVE THREE TOOLS AVAILABLE:
- analyzeTradePosition
- calculateTargetPrices
- suggestPositionAdjustment

ABSOLUTE REQUIREMENT: You MUST call a tool on your FIRST response when users provide trading data.
You are NOT ALLOWED to say "let me calculate" or respond with text first.
Your first action MUST be a tool call.

When you see entry prices and amounts → Call analyzeTradePosition immediately with no explanation.
The tool will return formatted results that you then explain to the user.`,
```

### Issue 2: Wrong parameters being passed

**Check the logs:** Look for `🔧 analyzeTradePosition called with:` in console

**Common mistakes:**
- Position not detected (missing or wrong value)
- Prices not parsed correctly (format issues)
- Take profit/stop loss not extracted

**Solution:** The AI might be struggling to parse the user's natural language. Consider:

1. **Ask for clarification** if parameters are missing
2. **Pre-parse user input** server-side before sending to AI
3. **Provide example in system prompt:**

```typescript
system: `...

EXAMPLE TOOL CALL:
User: "I bought BTC at $100k and $90k with $500k each. TP at $110k, SL at $85k. Long position."

You call:
{
  "trades": [
    {"price": 100000, "amount": 500000},
    {"price": 90000, "amount": 500000}
  ],
  "takeProfitPrice": 110000,
  "stopLossPrice": 85000,
  "position": "long"
}`,
```

### Issue 3: Tool returns but AI doesn't show it

**Check the logs:** Look for `✅ analyzeTradePosition completed successfully`

If you see this but no output in chat:
- The AI received the tool result but didn't format a response
- Check network tab to see if response is streaming correctly
- Might be a UI issue rather than API issue

## Nuclear Option: Bypass AI for Simple Queries

If deepseek just won't cooperate, you can add a pre-processing step:

```typescript
export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];
  const text = lastMessage.content;

  // Pattern match for common queries
  const tradePattern = /bought BTC at \$?([\d,]+).*\$?([\d,]+).*\$?([\d,]+).*amounts.*\$?([\d]+)k.*\$?([\d]+)k.*\$?([\d]+)M.*take profit.*\$?([\d,]+).*stop loss.*\$?([\d,]+)/i;
  const match = text.match(tradePattern);

  if (match) {
    // Extract values and call tool directly
    const [_, p1, p2, p3, a1, a2, a3, tp, sl] = match;
    const result = analyzePositionWithSummary({
      trades: [
        { price: parseFloat(p1.replace(/,/g, '')), amount: parseFloat(a1) * 1000 },
        { price: parseFloat(p2.replace(/,/g, '')), amount: parseFloat(a2) * 1000 },
        { price: parseFloat(p3.replace(/,/g, '')), amount: parseFloat(a3) * 1000000 },
      ],
      takeProfitPrice: parseFloat(tp.replace(/,/g, '')),
      stopLossPrice: parseFloat(sl.replace(/,/g, '')),
      position: 'long',
      includeIncrementalTable: true
    });

    // Return result directly without AI
    return new Response(result.summary, { headers: { 'Content-Type': 'text/markdown' } });
  }

  // Otherwise, use AI with tools as normal
  // ...
}
```

This is less flexible but **guarantees** the tool gets called for common patterns.

## Next Steps

1. **Test with current changes** - Restart server and try the test message
2. **Check console logs** - Should see tool calls now
3. **If still stuck** - Try OpenAI or Claude (they have better tool calling)
4. **Report back** - Let me know what the console logs show

## Expected Working Output

When everything works, you should see:

**Console:**
```
🔍 Trading data detected: true
🔍 Tool choice: required
📊 Step finished: { stepType: 'tool-call', toolCalls: [ 'analyzeTradePosition' ] }
🔧 analyzeTradePosition called with: {...}
✅ analyzeTradePosition completed successfully
```

**Chat UI:**
```markdown
## Position Analysis

**Average Price:** $83,400.90
**Total Quantity:** 19.184446 BTC
**Position Value:** $1,600,000.00

### LONG Position Scenarios
...
```

If you see both of these, **it's working!** 🎉
