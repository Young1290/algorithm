import type { ConversationMetadata } from '@/app/lib/types/conversation';
import { useAuth } from '@/contexts/auth-context';
import { useConversations } from '@/contexts/conversation-context';
import React from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface ConversationSidebarProps {
  onClose?: () => void;
}

export function ConversationSidebar({ onClose }: ConversationSidebarProps) {
  const {
    conversations,
    currentConversation,
    loadConversation,
    startNewConversation,
    deleteConversation,
  } = useConversations();
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Failed to sign out:', error);
            }
          },
        },
      ]
    );
  };

  const handleSelectConversation = async (id: string) => {
    try {
      await loadConversation(id);
      onClose?.();
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      await startNewConversation();
      onClose?.();
    } catch (error) {
      console.error('Failed to create new conversation:', error);
    }
  };

  const handleDeleteConversation = (id: string, title: string) => {
    const confirmed = window.confirm(`Delete "${title}"?`);
    if (confirmed) {
      deleteConversation(id).catch((error) => {
        console.error('Delete failed:', error);
        window.alert('Failed to delete conversation');
      });
    }
  };

  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  return (
    <View className="flex-1 w-[280px] bg-white">
      {/* Header */}
      <View className="p-4 border-b border-slate-200">
        <Text className="text-lg font-bold mb-3 text-slate-800">
          Conversations
        </Text>
        <TouchableOpacity
          onPress={handleNewChat}
          className="flex-row items-center justify-center py-2.5 px-4 rounded-lg gap-2 bg-blue-500"
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={18} color="#fff" />
          <Text className="text-white font-semibold text-sm">New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Conversation List */}
      <ScrollView className="flex-1">
        {sortedConversations.length === 0 ? (
          <View className="p-8 items-center">
            <Text className="text-sm text-center text-slate-400">
              No conversations yet
            </Text>
          </View>
        ) : (
          sortedConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={currentConversation?.id === conv.id}
              onSelect={() => handleSelectConversation(conv.id)}
              onDelete={() => handleDeleteConversation(conv.id, conv.title)}
            />
          ))
        )}
      </ScrollView>

      {/* User Section */}
      {user && (
        <View className="p-4 border-t border-slate-200 gap-3">
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {user.email}
          </Text>
          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center gap-2"
            activeOpacity={0.7}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={16} color="#ef4444" />
            <Text className="text-sm font-medium text-red-500">Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

interface ConversationItemProps {
  conversation: ConversationMetadata;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  return (
    <View
      className={`py-3 px-4 border-l-[3px] relative ${
        isActive ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent hover:bg-slate-50'
      }`}
    >
      <TouchableOpacity
        className="pr-10"
        onPress={onSelect}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center justify-between mb-1">
          <Text
            className={`text-sm flex-1 text-slate-800 ${isActive ? 'font-semibold' : 'font-medium'}`}
            numberOfLines={1}
          >
            {conversation.title}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-slate-500">
            {conversation.messageCount} messages
          </Text>
          <Text className="text-xs text-slate-400">
            {formatDate(conversation.updatedAt)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Delete Button */}
      <View className="absolute right-4 top-0 bottom-0 justify-center z-10">
        <TouchableOpacity
          onPress={onDelete}
          className="p-2 min-w-[32px] min-h-[32px] items-center justify-center bg-red-50 rounded"
          activeOpacity={0.6}
        >
          <IconSymbol name="xmark" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
