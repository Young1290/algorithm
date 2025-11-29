/**
 * Firestore wrapper for conversation persistence
 * Mirrors the AsyncStorage interface for minimal refactoring
 * All data is scoped to the authenticated user
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import type {
  Conversation,
  ConversationMetadata,
  CreateConversationOptions,
  UpdateConversationOptions,
} from '../types/conversation';

/**
 * Recursively remove undefined values from an object
 * Firestore doesn't accept undefined values anywhere in the document
 */
function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)) as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Get the current user's ID or throw if not authenticated
 */
function getUserId(): string {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
}

/**
 * Get reference to user's conversations collection
 */
function getConversationsRef() {
  return collection(db, 'users', getUserId(), 'conversations');
}

/**
 * Get reference to a specific conversation document
 */
function getConversationRef(id: string) {
  return doc(db, 'users', getUserId(), 'conversations', id);
}

/**
 * Get reference to user's settings document
 */
function getSettingsRef() {
  return doc(db, 'users', getUserId(), 'metadata', 'settings');
}

/**
 * Generate a unique ID for a conversation
 */
function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a title from the first user message or use a default
 */
function generateTitle(
  messages: Conversation['messages'],
  fallback = 'New Conversation'
): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) {
    return fallback;
  }

  // Extract text from message parts
  const textParts = firstUserMessage.parts
    .filter((part): part is { type: 'text'; text: string } =>
      part.type === 'text' && 'text' in part && typeof part.text === 'string'
    )
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
 * Load all conversations from Firestore
 */
export async function loadConversations(): Promise<Conversation[]> {
  try {
    const q = query(getConversationsRef(), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Conversation[];
  } catch (error) {
    console.error('Failed to load conversations:', error);
    return [];
  }
}

/**
 * Load a single conversation by ID
 */
export async function loadConversation(id: string): Promise<Conversation | null> {
  try {
    const docSnap = await getDoc(getConversationRef(id));
    if (!docSnap.exists()) {
      return null;
    }
    return { id: docSnap.id, ...docSnap.data() } as Conversation;
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
    const id = generateId();
    const now = Date.now();
    const conversation: Conversation = {
      id,
      title: options.title || generateTitle(options.initialMessages || []),
      createdAt: now,
      updatedAt: now,
      messages: options.initialMessages || [],
    };

    // Only add language if defined (Firestore doesn't allow undefined)
    if (options.language) {
      conversation.language = options.language;
    }

    await setDoc(getConversationRef(id), removeUndefined(conversation));
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
    const docRef = getConversationRef(id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn(`Conversation ${id} not found`);
      return null;
    }

    const current = docSnap.data() as Conversation;

    // Build update object without undefined values (Firestore doesn't allow undefined)
    const updated: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (updates.title !== undefined) {
      updated.title = updates.title;
    }
    if (updates.messages !== undefined) {
      updated.messages = updates.messages;
      // Auto-generate title from messages if not explicitly provided
      if (!updates.title) {
        updated.title = generateTitle(updates.messages, current.title);
      }
    }
    if (updates.language !== undefined) {
      updated.language = updates.language;
    }

    await updateDoc(docRef, removeUndefined(updated));
    return { ...current, ...updated, id } as Conversation;
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
    await deleteDoc(getConversationRef(id));

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
      .sort((a, b) => b.updatedAt - a.updatedAt);
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
    const docSnap = await getDoc(getSettingsRef());
    if (!docSnap.exists()) {
      return null;
    }
    return docSnap.data()?.activeConversationId || null;
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
    await setDoc(getSettingsRef(), { activeConversationId: id }, { merge: true });
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
    await setDoc(getSettingsRef(), { activeConversationId: null }, { merge: true });
  } catch (error) {
    console.error('Failed to clear active conversation ID:', error);
    throw error;
  }
}

/**
 * Clear all conversation data for the current user
 */
export async function clearAllConversations(): Promise<void> {
  try {
    const conversations = await loadConversations();
    for (const conv of conversations) {
      await deleteDoc(getConversationRef(conv.id));
    }
    await clearActiveConversationId();
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
