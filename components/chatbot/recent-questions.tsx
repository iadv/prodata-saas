// recent-questions.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Clock } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scrollarea';

interface HistoryItem {
  id: number;
  prompt: string;
  createdAt: string;
}

interface RecentQuestionsProps {
  onQuestionClick: (question: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export function RecentQuestions({ 
  onQuestionClick, 
  isVisible, 
  onClose 
}: RecentQuestionsProps) {
  const [recentQuestions, setRecentQuestions] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch recent questions when component becomes visible
  useEffect(() => {
    if (isVisible) {
      fetchRecentQuestions();
    }
  }, [isVisible]);

  const fetchRecentQuestions = async () => {
    try {
      setIsLoading(true);
      // Change this to use the chatbot-history endpoint
      const response = await fetch('/api/chatbot-history');
      
      if (response.ok) {
        const data = await response.json();
        setRecentQuestions(data);
      } else {
        console.error('Failed to fetch history:', response.status);
        setRecentQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setRecentQuestions([]);
    } finally {
      setIsLoading(false);
    }
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

  if (!isVisible) return null;

  return (
    <div className="absolute top-12 left-0 right-0 bg-white dark:bg-gray-800 z-10 border-b shadow-md p-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-2 text-gray-500" />
          <h3 className="text-sm font-medium">Recent Questions</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-10">
          <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
        </div>
      ) : recentQuestions.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-2">No recent questions yet.</p>
      ) : (
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-1">
            {recentQuestions.map((question) => (
              <Button
                key={question.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left text-xs truncate hover:bg-gray-100"
                onClick={() => {
                  onQuestionClick(question.prompt);
                  onClose();
                }}
              >
                <div className="truncate">{question.prompt}</div>
                <div className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {formatDate(question.createdAt)}
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}