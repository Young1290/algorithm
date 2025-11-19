/**
 * Custom hook that combines useChat with conversation persistence
 * Automatically saves messages to local storage as they're received
 */

import { useEffect, useCallback } from 'react';
import { useChat as useAIChat } from '@ai-sdk/react';
import type { UseChatOptions, UIMessage } from 'ai';
import { useConversations } from '../contexts/conversation-context';

/**
 * Extended useChat hook with automatic persistence
 * Syncs messages between AI SDK and local storage
 */
export function usePersistedChat(options?: Omit<UseChatOptions, 'initialMessages'>) {
  const { currentConversation, updateMessages, loading: conversationLoading } = useConversations();

  // Initialize useChat with messages from current conversation
  const chat = useAIChat({
    ...options,
    initialMessages: currentConversation?.messages || [],
  });

  const { messages } = chat;

  /**
   * Sync messages to storage whenever they change
   * Debounced to avoid excessive writes
   */
  useEffect(() => {
    if (conversationLoading || !currentConversation) {
      return;
    }

    // Only save if messages have actually changed
    const currentMessages = currentConversation.messages;
    const messagesChanged =
      messages.length !== currentMessages.length ||
      messages.some((msg, idx) => {
        const current = currentMessages[idx];
        return !current || msg.id !== current.id || JSON.stringify(msg) !== JSON.stringify(current);
      });

    if (messagesChanged) {
      // Use a small delay to batch rapid updates
      const timer = setTimeout(() => {
        updateMessages(messages);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [messages, currentConversation, updateMessages, conversationLoading]);

  /**
   * Reset chat when conversation changes
   */
  useEffect(() => {
    if (currentConversation) {
      chat.setMessages(currentConversation.messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversation?.id]);

  return {
    ...chat,
    conversationLoading,
    conversationId: currentConversation?.id,
  };
}
