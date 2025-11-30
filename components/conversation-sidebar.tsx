import type { ConversationMetadata } from "@/app/lib/types/conversation";
import { useAuth } from "@/contexts/auth-context";
import { useConversations } from "@/contexts/conversation-context";
import React, { memo } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { IconSymbol } from "./ui/icon-symbol";

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error("Failed to sign out:", error);
          }
        },
      },
    ]);
  };

  const handleSelectConversation = async (id: string) => {
    try {
      await loadConversation(id);
      onClose?.();
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const handleNewChat = async () => {
    try {
      await startNewConversation();
      onClose?.();
    } catch (error) {
      console.error("Failed to create new conversation:", error);
    }
  };

  const handleDeleteConversation = (id: string, title: string) => {
    const confirmed = window.confirm(`Delete "${title}"?`);
    if (confirmed) {
      deleteConversation(id).catch((error) => {
        console.error("Delete failed:", error);
        window.alert("Failed to delete conversation");
      });
    }
  };

  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  return (
    <View className="flex-1 w-[280px] bg-white">
      {/* Header */}
      <View className="px-4 pt-5 pb-4 border-b border-slate-100">
        <Text className="text-base font-semibold mb-4 text-slate-700 tracking-tight">
          Conversations
        </Text>
        <TouchableOpacity
          onPress={handleNewChat}
          className="flex-row items-center justify-center py-2.5 px-4 rounded-xl gap-2 border border-blue-500 bg-transparent active:bg-blue-50"
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={18} color="#3b82f6" />
          <Text className="text-blue-500 font-semibold text-sm">New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Conversation List */}
      <ScrollView className="flex-1 py-1">
        {sortedConversations.length === 0 ? (
          <View className="py-12 px-6 items-center">
            <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mb-3">
              <IconSymbol name="plus" size={20} color="#cbd5e1" />
            </View>
            <Text className="text-sm text-center text-slate-400">
              No conversations yet
            </Text>
            <Text className="text-xs text-center text-slate-300 mt-1">
              Start a new chat above
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
        <View className="px-4 py-3 border-t border-slate-100">
          <View className="flex-row items-center justify-between">
            <Text
              className="text-xs text-slate-400 flex-1 mr-3"
              numberOfLines={1}
            >
              {user.email}
            </Text>
            <TouchableOpacity
              onPress={handleSignOut}
              className="flex-row items-center gap-1.5 py-1.5 px-2 rounded-md"
              activeOpacity={0.6}
            >
              <IconSymbol
                name="rectangle.portrait.and.arrow.right"
                size={14}
                color="#94a3b8"
              />
              <Text className="text-xs font-medium text-slate-400">
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
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

const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  return (
    <View
      className={`py-3.5 px-4 border-l-2 relative ${
        isActive
          ? "bg-blue-50 border-l-blue-500"
          : "border-l-transparent"
      }`}
    >
      <TouchableOpacity
        className="pr-8"
        onPress={onSelect}
        activeOpacity={0.7}
      >
        <Text
          className={`text-sm mb-1 ${
            isActive ? "text-slate-800 font-medium" : "text-slate-600"
          }`}
          numberOfLines={1}
        >
          {conversation.title}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs text-slate-400">
            {conversation.messageCount} messages
          </Text>
          <Text className="text-xs text-slate-300">·</Text>
          <Text className="text-xs text-slate-400">
            {formatDate(conversation.updatedAt)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Delete Button - subtle, always visible */}
      <View className="absolute right-3 top-0 bottom-0 justify-center">
        <TouchableOpacity
          onPress={onDelete}
          className="p-1.5 items-center justify-center rounded-md"
          activeOpacity={0.5}
        >
          <IconSymbol name="xmark" size={14} color="#cbd5e1" />
        </TouchableOpacity>
      </View>
    </View>
  );
});
