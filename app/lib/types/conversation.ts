/**
 * Type definitions for conversation and message management
 */

import type { UIMessage } from 'ai';

/**
 * Represents a single conversation with its metadata and messages
 */
export interface Conversation {
  /** Unique identifier for the conversation */
  id: string;

  /** Human-readable title for the conversation */
  title: string;

  /** Timestamp when the conversation was created */
  createdAt: number;

  /** Timestamp when the conversation was last updated */
  updatedAt: number;

  /** Array of messages in this conversation */
  messages: UIMessage[];

  /** Language used in this conversation */
  language?: string;
}

/**
 * Metadata for a conversation (without messages, for list views)
 */
export interface ConversationMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  language?: string;
}

/**
 * Options for creating a new conversation
 */
export interface CreateConversationOptions {
  title?: string;
  language?: string;
  initialMessages?: UIMessage[];
}

/**
 * Options for updating an existing conversation
 */
export interface UpdateConversationOptions {
  title?: string;
  messages?: UIMessage[];
  language?: string;
}
