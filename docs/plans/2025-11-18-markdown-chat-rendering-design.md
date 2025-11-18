# Markdown Chat Rendering Design

## Overview
Implement markdown rendering for all chat messages (user and assistant) using the existing `react-native-markdown-display` library.

## Current State
- Chat messages render as plain text using `<Text>` components
- API returns markdown-formatted responses (headers, bold, tables)
- Library already installed: `react-native-markdown-display@^7.0.2`

## Design

### Component Integration
Replace plain text rendering in `app/(tabs)/index.tsx` line 38:

**Before:**
```tsx
case "text":
  return <Text key={`${m.id}-${i}`}>{part.text}</Text>;
```

**After:**
```tsx
case "text":
  return (
    <Markdown key={`${m.id}-${i}`}>
      {part.text}
    </Markdown>
  );
```

### Import Addition
Add to imports at top of file:
```tsx
import Markdown from 'react-native-markdown-display';
```

### Styling Approach
Use default styling from `react-native-markdown-display`:
- Headers (h1, h2, h3) with appropriate font sizes
- Bold text rendering
- Bullet and numbered lists with indentation
- Tables with borders and padding (critical for trading data)
- Code blocks with monospace font
- All responsive within ScrollView

### Trading Data Support
Markdown tables from trading tools will render properly:
- Position analysis tables
- Incremental trade breakdowns
- Target price calculations
- All with proper borders and alignment

### Edge Cases
1. **Tool calls** - Existing JSON rendering (lines 39-45) unchanged
2. **Empty strings** - Handled gracefully by Markdown component
3. **Invalid markdown** - Falls back to plain text
4. **Long content** - Existing ScrollView handles overflow
5. **Special characters** - Auto-escaped by library

## Impact
- **Files modified:** 1 (`app/(tabs)/index.tsx`)
- **Lines changed:** ~3 (1 import, 1 component replacement)
- **Breaking changes:** None
- **Dependencies:** None (library already installed)

## Testing Considerations
- Verify tables render correctly with trading data
- Check bold/headers display properly
- Ensure ScrollView still works smoothly
- Confirm tool call responses unchanged
