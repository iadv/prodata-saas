'use client';

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scrollarea";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText, X } from "lucide-react";

interface RecentQuestionsProps {
  conversations: any[];
  onQuestionClick: (question: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export function RecentQuestions({
  conversations,
  onQuestionClick,
  isVisible,
  onClose,
}: RecentQuestionsProps) {
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);

  useEffect(() => {
    // Extract unique user questions from conversations
    const allQuestions: string[] = [];
    
    conversations.forEach(conversation => {
      const userMessages = conversation.messages?.filter(
        (message: any) => message.type === 'user'
      ) || [];
      
      userMessages.forEach((message: any) => {
        if (message.content && !allQuestions.includes(message.content)) {
          allQuestions.push(message.content);
        }
      });
    });
    
    // Take the 10 most recent questions
    setRecentQuestions(allQuestions.slice(0, 10));
  }, [conversations]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full border-b bg-background"
        >
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Recent Questions</h3>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="pb-4 px-4 max-h-[200px]">
            <div className="flex flex-col gap-2">
              {recentQuestions.length > 0 ? (
                recentQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="justify-start text-sm h-auto py-2 text-left whitespace-normal"
                    onClick={() => onQuestionClick(question)}
                  >
                    {question}
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground px-2">
                  No recent questions found.
                </p>
              )}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}