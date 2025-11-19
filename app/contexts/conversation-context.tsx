/**
 * React Context for managing conversation state
 * Provides conversation CRUD operations and state to all components
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UIMessage } from 'ai';
import type { Conversation, ConversationMetadata, CreateConversationOptions } from '../lib/types/conversation';
import * as ConversationStorage from '../lib/storage/conversation-storage';

interface ConversationContextValue {
  /** Currently active conversation */
  currentConversation: Conversation | null;

  /** List of all conversation metadata */
  conversations: ConversationMetadata[];

  /** Whether data is currently being loaded */
  loading: boolean;

  /** Create a new conversation and optionally set it as active */
  createConversation: (options?: CreateConversationOptions, setAsActive?: boolean) => Promise<Conversation>;

  /** Load and set a conversation as active */
  loadConversation: (id: string) => Promise<void>;

  /** Update the current conversation's messages */
  updateMessages: (messages: UIMessage[]) => Promise<void>;

  /** Update the current conversation's title */
  updateTitle: (title: string) => Promise<void>;

  /** Delete a conversation */
  deleteConversation: (id: string) => Promise<void>;

  /** Start a new conversation */
  startNewConversation: () => Promise<void>;

  /** Refresh the conversation list */
  refreshConversations: () => Promise<void>;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

interface ConversationProviderProps {
  children: React.ReactNode;
}

export function ConversationProvider({ children }: ConversationProviderProps) {
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load all conversations metadata
   */
  const loadConversationsMetadata = useCallback(async () => {
    try {
      const metadata = await ConversationStorage.getConversationsMetadata();
      setConversations(metadata);
    } catch (error) {
      console.error('Failed to load conversations metadata:', error);
    }
  }, []);

  /**
   * Initialize: Load active conversation or create a new one
   */
  useEffect(() => {
    async function initialize() {
      try {
        setLoading(true);

        // Load conversations metadata
        await loadConversationsMetadata();

        // Try to load the active conversation
        const activeId = await ConversationStorage.getActiveConversationId();
        if (activeId) {
          const conversation = await ConversationStorage.loadConversation(activeId);
          if (conversation) {
            setCurrentConversation(conversation);
            return;
          }
        }

        // No active conversation found, create a new one
        const newConversation = await ConversationStorage.createConversation();
        await ConversationStorage.setActiveConversationId(newConversation.id);
        setCurrentConversation(newConversation);
        await loadConversationsMetadata();
      } catch (error) {
        console.error('Failed to initialize conversations:', error);
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, [loadConversationsMetadata]);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(
    async (options: CreateConversationOptions = {}, setAsActive = true): Promise<Conversation> => {
      try {
        const conversation = await ConversationStorage.createConversation(options);

        if (setAsActive) {
          await ConversationStorage.setActiveConversationId(conversation.id);
          setCurrentConversation(conversation);
        }

        await loadConversationsMetadata();
        return conversation;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        throw error;
      }
    },
    [loadConversationsMetadata]
  );

  /**
   * Load a specific conversation and set it as active
   */
  const loadConversation = useCallback(async (id: string) => {
    try {
      const conversation = await ConversationStorage.loadConversation(id);
      if (!conversation) {
        console.error(`Conversation ${id} not found`);
        return;
      }

      await ConversationStorage.setActiveConversationId(id);
      setCurrentConversation(conversation);
    } catch (error) {
      console.error(`Failed to load conversation ${id}:`, error);
      throw error;
    }
  }, []);

  /**
   * Update the current conversation's messages
   */
  const updateMessages = useCallback(async (messages: UIMessage[]) => {
    if (!currentConversation) {
      console.warn('No active conversation to update');
      return;
    }

    try {
      const updated = await ConversationStorage.updateConversation(currentConversation.id, {
        messages,
      });

      if (updated) {
        setCurrentConversation(updated);
        await loadConversationsMetadata();
      }
    } catch (error) {
      console.error('Failed to update messages:', error);
      throw error;
    }
  }, [currentConversation, loadConversationsMetadata]);

  /**
   * Update the current conversation's title
   */
  const updateTitle = useCallback(
    async (title: string) => {
      if (!currentConversation) {
        console.warn('No active conversation to update');
        return;
      }

      try {
        const updated = await ConversationStorage.updateConversation(currentConversation.id, {
          title,
        });

        if (updated) {
          setCurrentConversation(updated);
          await loadConversationsMetadata();
        }
      } catch (error) {
        console.error('Failed to update title:', error);
        throw error;
      }
    },
    [currentConversation, loadConversationsMetadata]
  );

  /**
   * Delete a conversation
   */
  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await ConversationStorage.deleteConversation(id);

        // If we deleted the current conversation, start a new one
        if (currentConversation?.id === id) {
          const newConversation = await ConversationStorage.createConversation();
          await ConversationStorage.setActiveConversationId(newConversation.id);
          setCurrentConversation(newConversation);
        }

        await loadConversationsMetadata();
      } catch (error) {
        console.error(`Failed to delete conversation ${id}:`, error);
        throw error;
      }
    },
    [currentConversation, loadConversationsMetadata]
  );

  /**
   * Start a new conversation
   */
  const startNewConversation = useCallback(async () => {
    try {
      const newConversation = await ConversationStorage.createConversation();
      await ConversationStorage.setActiveConversationId(newConversation.id);
      setCurrentConversation(newConversation);
      await loadConversationsMetadata();
    } catch (error) {
      console.error('Failed to start new conversation:', error);
      throw error;
    }
  }, [loadConversationsMetadata]);

  /**
   * Refresh the conversation list
   */
  const refreshConversations = useCallback(async () => {
    await loadConversationsMetadata();
  }, [loadConversationsMetadata]);

  const value: ConversationContextValue = {
    currentConversation,
    conversations,
    loading,
    createConversation,
    loadConversation,
    updateMessages,
    updateTitle,
    deleteConversation,
    startNewConversation,
    refreshConversations,
  };

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

/**
 * Hook to access conversation context
 * Must be used within a ConversationProvider
 */
export function useConversations(): ConversationContextValue {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversations must be used within a ConversationProvider');
  }
  return context;
}
