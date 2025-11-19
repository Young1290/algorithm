/**
 * AsyncStorage wrapper for conversation persistence
 * Handles all CRUD operations for conversations stored locally
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Conversation,
  ConversationMetadata,
  CreateConversationOptions,
  UpdateConversationOptions,
} from '../types/conversation';

const STORAGE_KEYS = {
  CONVERSATIONS: 'conversations',
  ACTIVE_CONVERSATION_ID: 'active-conversation-id',
} as const;

/**
 * Generate a unique ID for a conversation
 */
function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a title from the first user message or use a default
 */
function generateTitle(messages: Conversation['messages'], fallback = 'New Conversation'): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) {
    return fallback;
  }

  // Extract text from message parts
  const textParts = firstUserMessage.parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join(' ');

  if (!textParts) {
    return fallback;
  }

  // Truncate to reasonable length
  const maxLength = 50;
  return textParts.length > maxLength
    ? textParts.substring(0, maxLength).trim() + '...'
    : textParts.trim();
}

/**
 * Load all conversations from storage
 */
export async function loadConversations(): Promise<Conversation[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (!data) {
      return [];
    }
    return JSON.parse(data) as Conversation[];
  } catch (error) {
    console.error('Failed to load conversations:', error);
    return [];
  }
}

/**
 * Save all conversations to storage
 */
export async function saveConversations(conversations: Conversation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  } catch (error) {
    console.error('Failed to save conversations:', error);
    throw error;
  }
}

/**
 * Load a single conversation by ID
 */
export async function loadConversation(id: string): Promise<Conversation | null> {
  try {
    const conversations = await loadConversations();
    return conversations.find((c) => c.id === id) || null;
  } catch (error) {
    console.error(`Failed to load conversation ${id}:`, error);
    return null;
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(
  options: CreateConversationOptions = {}
): Promise<Conversation> {
  try {
    const now = Date.now();
    const conversation: Conversation = {
      id: generateId(),
      title: options.title || generateTitle(options.initialMessages || []),
      createdAt: now,
      updatedAt: now,
      messages: options.initialMessages || [],
      language: options.language,
    };

    const conversations = await loadConversations();
    conversations.push(conversation);
    await saveConversations(conversations);

    return conversation;
  } catch (error) {
    console.error('Failed to create conversation:', error);
    throw error;
  }
}

/**
 * Update an existing conversation
 */
export async function updateConversation(
  id: string,
  updates: UpdateConversationOptions
): Promise<Conversation | null> {
  try {
    const conversations = await loadConversations();
    const index = conversations.findIndex((c) => c.id === id);

    if (index === -1) {
      console.warn(`Conversation ${id} not found`);
      return null;
    }

    const conversation = conversations[index];
    const updated: Conversation = {
      ...conversation,
      ...updates,
      id: conversation.id, // Prevent ID from being changed
      createdAt: conversation.createdAt, // Preserve creation time
      updatedAt: Date.now(),
    };

    // Auto-generate title from messages if not explicitly provided
    if (updates.messages && !updates.title) {
      updated.title = generateTitle(updates.messages, conversation.title);
    }

    conversations[index] = updated;
    await saveConversations(conversations);

    return updated;
  } catch (error) {
    console.error(`Failed to update conversation ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<boolean> {
  try {
    const conversations = await loadConversations();
    const filtered = conversations.filter((c) => c.id !== id);

    if (filtered.length === conversations.length) {
      console.warn(`Conversation ${id} not found`);
      return false;
    }

    await saveConversations(filtered);

    // Clear active conversation if it was deleted
    const activeId = await getActiveConversationId();
    if (activeId === id) {
      await clearActiveConversationId();
    }

    return true;
  } catch (error) {
    console.error(`Failed to delete conversation ${id}:`, error);
    throw error;
  }
}

/**
 * Get conversation metadata (without messages) for all conversations
 * Useful for displaying conversation lists efficiently
 */
export async function getConversationsMetadata(): Promise<ConversationMetadata[]> {
  try {
    const conversations = await loadConversations();
    return conversations
      .map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c.messages.length,
        language: c.language,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt); // Most recent first
  } catch (error) {
    console.error('Failed to get conversations metadata:', error);
    return [];
  }
}

/**
 * Get the ID of the currently active conversation
 */
export async function getActiveConversationId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID);
  } catch (error) {
    console.error('Failed to get active conversation ID:', error);
    return null;
  }
}

/**
 * Set the currently active conversation
 */
export async function setActiveConversationId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID, id);
  } catch (error) {
    console.error('Failed to set active conversation ID:', error);
    throw error;
  }
}

/**
 * Clear the currently active conversation
 */
export async function clearActiveConversationId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID);
  } catch (error) {
    console.error('Failed to clear active conversation ID:', error);
    throw error;
  }
}

/**
 * Clear all conversation data (use with caution!)
 */
export async function clearAllConversations(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CONVERSATIONS,
      STORAGE_KEYS.ACTIVE_CONVERSATION_ID,
    ]);
  } catch (error) {
    console.error('Failed to clear all conversations:', error);
    throw error;
  }
}

/**
 * Add a message to a conversation
 */
export async function addMessageToConversation(
  conversationId: string,
  message: Conversation['messages'][0]
): Promise<Conversation | null> {
  try {
    const conversation = await loadConversation(conversationId);
    if (!conversation) {
      return null;
    }

    const updatedMessages = [...conversation.messages, message];
    return await updateConversation(conversationId, { messages: updatedMessages });
  } catch (error) {
    console.error(`Failed to add message to conversation ${conversationId}:`, error);
    throw error;
  }
}
