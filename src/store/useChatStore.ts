import { create } from "zustand";
import { chatRepository } from "../repositories/chatRepository";
import { folderRepository } from "../repositories/folderRepository";
import { Conversation, Folder, Message } from "../types";

type ChatState = {
  conversations: Conversation[];
  folders: Folder[];
  messages: Message[];
  expandedFolderIds: Record<string, boolean>;
  loadConversations: () => Promise<void>;
  loadFolders: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  refreshChats: () => Promise<void>;
  toggleFolder: (folderId: string) => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  folders: [],
  messages: [],
  expandedFolderIds: {},
  loadConversations: async () => set({ conversations: await chatRepository.listConversations() }),
  loadFolders: async () => {
    const folders = await folderRepository.listFolders();
    set((state) => {
      const expandedFolderIds = { ...state.expandedFolderIds };
      for (const folder of folders) {
        if (expandedFolderIds[folder.id] === undefined) expandedFolderIds[folder.id] = true;
      }
      if (expandedFolderIds.ungrouped === undefined) expandedFolderIds.ungrouped = true;
      return { folders, expandedFolderIds };
    });
  },
  loadMessages: async (conversationId) => set({ messages: await chatRepository.listMessages(conversationId) }),
  refreshChats: async () => {
    const [conversations, folders] = await Promise.all([chatRepository.listConversations(), folderRepository.listFolders()]);
    set((state) => {
      const expandedFolderIds = { ...state.expandedFolderIds };
      for (const folder of folders) {
        if (expandedFolderIds[folder.id] === undefined) expandedFolderIds[folder.id] = true;
      }
      if (expandedFolderIds.ungrouped === undefined) expandedFolderIds.ungrouped = true;
      return { conversations, folders, expandedFolderIds };
    });
  },
  toggleFolder: (folderId) => set((state) => ({ expandedFolderIds: { ...state.expandedFolderIds, [folderId]: !state.expandedFolderIds[folderId] } }))
}));
