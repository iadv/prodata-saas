'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface HistoryItem {
  id: number;
  prompt: string;
  createdAt: string;
}

export interface HistorySidebarProps {
  onSelectHistoryItem: (prompt: string) => void;
  currentPrompt: string;
}

export interface HistorySidebarProps {
  onSelectHistoryItem: (prompt: string) => void;
  currentPrompt: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function HistorySidebar({ onSelectHistoryItem, currentPrompt, isOpen, onToggle }: HistorySidebarProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch history when component mounts or isOpen state changes
  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  // Fetch history when currentPrompt changes (to refresh after new queries)
  useEffect(() => {
    if (isOpen && currentPrompt) {
      fetchHistory();
    }
  }, [currentPrompt]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/history');
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectItem = (prompt: string) => {
    onSelectHistoryItem(prompt);
  };

  // Format the timestamp to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative h-full">

      {/* Sidebar content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full overflow-hidden"
          >
            <div className="h-full w-[280px] border-r border-border bg-card p-4 overflow-y-auto">
              <div className="flex items-center mb-4">
                <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                <h3 className="font-medium text-foreground">Recent Queries</h3>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-20">
                  <div className="animate-spin h-5 w-5 border-2 border-border border-t-primary rounded-full" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No recent queries found
                </div>
              ) : (
                <ul className="space-y-2">
                  {history.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => handleSelectItem(item.prompt)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          currentPrompt === item.prompt
                            ? "bg-accent/50 text-accent-foreground font-medium"
                            : "text-foreground"
                        )}
                      >
                        <div className="line-clamp-2">{item.prompt}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(item.createdAt)}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}