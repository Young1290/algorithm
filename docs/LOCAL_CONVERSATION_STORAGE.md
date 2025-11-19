# Local Conversation Storage

This document describes the local conversation storage implementation for persisting chat history.

## Overview

The app now automatically saves all conversations locally using React Native AsyncStorage. This allows users to:
- Maintain conversation history across app sessions
- Switch between multiple conversations
- Create new conversations
- Delete old conversations

## Architecture

### Storage Layer (`app/lib/storage/conversation-storage.ts`)

Provides low-level AsyncStorage operations:
- `loadConversations()` - Load all conversations
- `saveConversations()` - Save conversations to storage
- `createConversation()` - Create a new conversation
- `updateConversation()` - Update existing conversation
- `deleteConversation()` - Delete a conversation
- `getActiveConversationId()` - Get the currently active conversation ID
- `setActiveConversationId()` - Set the active conversation
- `addMessageToConversation()` - Add a message to a conversation

### Context Provider (`app/contexts/conversation-context.tsx`)

Manages conversation state throughout the app:
- Loads conversations on app start
- Provides conversation CRUD operations
- Maintains currently active conversation
- Auto-creates a new conversation if none exists

### Custom Hook (`app/hooks/use-persisted-chat.ts`)

Combines the AI SDK's `useChat` hook with automatic persistence:
- Syncs messages to AsyncStorage automatically
- Loads messages from current conversation on mount
- Debounces writes to avoid excessive storage operations

## Data Models

### Conversation

```typescript
interface Conversation {
  id: string;                  // Unique identifier
  title: string;               // Auto-generated from first message
  createdAt: number;           // Creation timestamp
  updatedAt: number;           // Last update timestamp
  messages: UIMessage[];       // Array of chat messages
  language?: string;           // Language preference
}
```

### ConversationMetadata

Lightweight version for list views:

```typescript
interface ConversationMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  language?: string;
}
```

## Usage

### In Components

The chat component (`app/(tabs)/index.tsx`) now uses `usePersistedChat`:

```typescript
import { usePersistedChat } from '@/hooks/use-persisted-chat';

const { messages, sendMessage, conversationLoading } = usePersistedChat({
  transport: new DefaultChatTransport({...}),
  onError: (error) => console.error(error),
});
```

Messages are automatically saved as they're received.

### Conversation Management

Access conversation operations via the context:

```typescript
import { useConversations } from '@/contexts/conversation-context';

const {
  currentConversation,
  conversations,
  startNewConversation,
  loadConversation,
  deleteConversation,
} = useConversations();
```

### Conversation List

The explore tab (`app/(tabs)/explore.tsx`) displays all saved conversations:
- Shows conversation title, message count, and last update time
- Tap to switch to a conversation
- Swipe or tap delete button to remove
- "New Chat" button to start a fresh conversation

## Storage Keys

Data is stored in AsyncStorage under these keys:
- `conversations` - JSON array of all conversations
- `active-conversation-id` - ID of currently active conversation

## Auto-Title Generation

Conversation titles are automatically generated from the first user message:
- Extracts text from the first message
- Truncates to 50 characters with "..." suffix if longer
- Falls back to "New Conversation" if no text found

## Performance Considerations

- **Debounced writes**: Messages are saved with a 300ms debounce to batch rapid updates
- **Metadata optimization**: Conversation list loads only metadata, not full message history
- **Lazy loading**: Full conversation data loaded only when switching conversations

## Future Enhancements

Potential improvements for later:
- Cloud sync for cross-device access
- Export conversations to file
- Search within conversations
- Conversation folders/tags
- Message editing/deletion
- Conversation sharing
