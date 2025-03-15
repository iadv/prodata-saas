'use client';

import { useState } from 'react';
import { ConversationHistory } from './types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  PlusCircle, 
  Trash2, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface ConversationSidebarProps {
  conversations: ConversationHistory[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onToggle: () => void;
  selectedConversationId: string | null;
}

export function ConversationSidebar({
  conversations,
  onSelect,
  onDelete,
  onNewConversation,
  isOpen,
  onToggle,
  selectedConversationId
}: ConversationSidebarProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    if (diff < dayInMs) {
      return 'Today';
    } else if (diff < 2 * dayInMs) {
      return 'Yesterday';
    } else {
      return new Intl.DateTimeFormat('default', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    }
  };

  return (
    <>
      {/* Toggle button for mobile */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-2 left-2 z-20 md:hidden"
        onClick={onToggle}
      >
        {isOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full overflow-hidden border-r bg-white shadow-sm relative z-10"
          >
            <div className="p-4 border-b">
              <Button 
                variant="default" 
                onClick={onNewConversation}
                className="w-full justify-start"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New conversation
              </Button>
            </div>
            
            <ScrollArea className="h-[calc(100%-65px)]">
              <div className="p-2">
                {conversations.length === 0 ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    No conversations yet
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div 
                      key={conversation.id}
                      className="mb-1 relative"
                    >
                      <div 
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer group",
                          selectedConversationId === conversation.id && "bg-gray-100"
                        )}
                        onClick={() => onSelect(conversation.id)}
                      >
                        <div className="flex items-center mr-2 overflow-hidden">
                          <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />
                          <div className="truncate">
                            <div className="truncate text-sm font-medium">
                              {conversation.title || "New conversation"}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {formatDate(conversation.updatedAt)}
                            </div>
                          </div>
                        </div>
                        
                        {confirmDelete === conversation.id ? (
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(conversation.id);
                                setConfirmDelete(null);
                              }}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(conversation.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}