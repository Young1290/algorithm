/**
 * React Context for managing conversation state
 * Provides conversation CRUD operations and state to all components
 * Uses Firestore for cloud storage when authenticated
 */

import * as ConversationStorage from "@/app/lib/storage/firestore-storage";
import type {
    Conversation,
    ConversationMetadata,
    CreateConversationOptions,
} from "@/app/lib/types/conversation";
import type { UIMessage } from "ai";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { useAuth } from "./auth-context";

interface ConversationContextValue {
  /** Currently active conversation */
  currentConversation: Conversation | null;

  /** List of all conversation metadata */
  conversations: ConversationMetadata[];

  /** Whether data is currently being loaded */
  loading: boolean;

  /** Create a new conversation and optionally set it as active */
  createConversation: (
    options?: CreateConversationOptions,
    setAsActive?: boolean
  ) => Promise<Conversation>;

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

const ConversationContext = createContext<ConversationContextValue | null>(
  null
);

interface ConversationProviderProps {
  children: React.ReactNode;
}

export function ConversationProvider({ children }: ConversationProviderProps) {
  const { user } = useAuth();
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<ConversationMetadata[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  /**
   * Load all conversations metadata
   */
  const loadConversationsMetadata = useCallback(async () => {
    if (!user) return;
    try {
      const metadata = await ConversationStorage.getConversationsMetadata();
      setConversations(metadata);
    } catch (error) {
      console.error("Failed to load conversations metadata:", error);
    }
  }, [user]);

  /**
   * Initialize: Load active conversation or create a new one
   * Only runs when user is authenticated
   */
  useEffect(() => {
    // Reset state when user logs out
    if (!user) {
      setConversations([]);
      setCurrentConversation(null);
      setLoading(false);
      return;
    }

    async function initialize() {
      try {
        setLoading(true);

        // Load conversations metadata
        await loadConversationsMetadata();

        // Try to load the active conversation
        const activeId = await ConversationStorage.getActiveConversationId();
        if (activeId) {
          const conversation = await ConversationStorage.loadConversation(
            activeId
          );
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
        console.error("Failed to initialize conversations:", error);
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, [user, loadConversationsMetadata]);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(
    async (
      options: CreateConversationOptions = {},
      setAsActive = true
    ): Promise<Conversation> => {
      try {
        const conversation = await ConversationStorage.createConversation(
          options
        );

        if (setAsActive) {
          await ConversationStorage.setActiveConversationId(conversation.id);
          setCurrentConversation(conversation);
        }

        await loadConversationsMetadata();
        return conversation;
      } catch (error) {
        console.error("Failed to create conversation:", error);
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
  const updateMessages = useCallback(
    async (messages: UIMessage[]) => {
      if (!currentConversation) {
        console.warn("No active conversation to update");
        return;
      }

      try {
        const updated = await ConversationStorage.updateConversation(
          currentConversation.id,
          {
            messages,
          }
        );

        if (updated) {
          setCurrentConversation(updated);
          await loadConversationsMetadata();
        }
      } catch (error) {
        console.error("Failed to update messages:", error);
        throw error;
      }
    },
    [currentConversation, loadConversationsMetadata]
  );

  /**
   * Update the current conversation's title
   */
  const updateTitle = useCallback(
    async (title: string) => {
      if (!currentConversation) {
        console.warn("No active conversation to update");
        return;
      }

      try {
        const updated = await ConversationStorage.updateConversation(
          currentConversation.id,
          {
            title,
          }
        );

        if (updated) {
          setCurrentConversation(updated);
          await loadConversationsMetadata();
        }
      } catch (error) {
        console.error("Failed to update title:", error);
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
      console.log('🗑️ [Context] deleteConversation called with ID:', id);
      console.log('  - Current conversation ID:', currentConversation?.id);
      
      try {
        console.log('🔄 [Context] Calling ConversationStorage.deleteConversation...');
        await ConversationStorage.deleteConversation(id);
        console.log('✅ [Context] Storage deletion successful');

        // If we deleted the current conversation, start a new one
        if (currentConversation?.id === id) {
          console.log('📝 [Context] Deleted current conversation, creating new one...');
          const newConversation =
            await ConversationStorage.createConversation();
          await ConversationStorage.setActiveConversationId(newConversation.id);
          setCurrentConversation(newConversation);
          console.log('✅ [Context] New conversation created:', newConversation.id);
        }

        console.log('🔄 [Context] Reloading conversations metadata...');
        await loadConversationsMetadata();
        console.log('✅ [Context] Delete operation completed successfully');
      } catch (error) {
        console.error(`❌ [Context] Failed to delete conversation ${id}:`, error);
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
      console.error("Failed to start new conversation:", error);
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

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

/**
 * Hook to access conversation context
 * Must be used within a ConversationProvider
 */
export function useConversations(): ConversationContextValue {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "useConversations must be used within a ConversationProvider"
    );
  }
  return context;
}
