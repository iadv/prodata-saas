'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ConversationHistory } from './type';

interface RecentQuestionsProps {
  conversations: ConversationHistory[];
  onQuestionClick: (question: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export function RecentQuestions({ 
  conversations, 
  onQuestionClick, 
  isVisible, 
  onClose 
}: RecentQuestionsProps) {
  // Extract unique questions from conversations, most recent first
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);
  
  // When conversations change, update the recent questions list
  useEffect(() => {
    // Add debugging output
    console.log("RecentQuestions received conversations:", conversations?.length);
    console.log("First few conversations:", conversations?.slice(0, 3).map(c => ({
      id: c.id,
      title: c.title,
      messageCount: c.messages?.length || 0
    })));
    
    if (!conversations || conversations.length === 0) {
      console.log("No conversations available");
      setRecentQuestions([]);
      return;
    }
    
    try {
      // Extract user messages from all conversations with proper null checks
      const allUserMessages = conversations
        .filter(conversation => {
          const valid = conversation && conversation.messages && Array.isArray(conversation.messages);
          if (!valid) console.log("Filtered out invalid conversation:", conversation?.id || "unknown");
          return valid;
        })
        .flatMap(conversation => {
          const userMsgs = conversation.messages
            .filter(msg => msg && msg.type === 'user' && msg.content)
            .map(msg => msg.content);
          
          console.log(`Conversation ${conversation.id} has ${userMsgs.length} user messages`);
          return userMsgs;
        });
      
      console.log("Total user messages found:", allUserMessages.length);
      
      // Get unique questions, preserving latest occurrences
      const uniqueQuestions: string[] = [];
      // Process in reverse to get most recent first
      [...allUserMessages].reverse().forEach(question => {
        if (question && !uniqueQuestions.includes(question)) {
          uniqueQuestions.push(question);
        }
      });
      
      console.log("Unique questions count:", uniqueQuestions.length);
      console.log("First few unique questions:", uniqueQuestions.slice(0, 3));
      
      // Limit to top 20 questions
      setRecentQuestions(uniqueQuestions.slice(0, 20));
    } catch (error) {
      console.error("Error processing recent questions:", error);
      setRecentQuestions([]);
    }
  }, [conversations]);

  // Add debugging in the render function
  console.log("RecentQuestions rendering, showing:", recentQuestions.length, "questions");
  console.log("isVisible:", isVisible);

  if (!isVisible) return null;

  return (
    <div className="absolute top-12 left-0 right-0 bg-white dark:bg-gray-800 z-10 border-b shadow-md p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Recent Questions ({recentQuestions.length})</h3>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {recentQuestions.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-2">No recent questions yet.</p>
      ) : (
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {recentQuestions.map((question, index) => (
            <Button
              key={`recent-${index}`}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-left text-xs truncate"
              onClick={() => {
                onQuestionClick(question);
                onClose();
              }}
            >
              {question}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}