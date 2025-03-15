'use client';

import React, { useState } from 'react';
import { Message } from './type'; //fixed
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { DataTable } from './data-table';
import { DataChart } from './data-chart';
import { Loader2, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageItemProps {
  message: Message;
  onGenerateChart: (messageId: string) => void;
}

export function MessageItem({ message, onGenerateChart }: MessageItemProps) {
  const [showSQL, setShowSQL] = useState(false);
  
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('default', {
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  const renderMessageContent = () => {
    if (message.isLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Thinking...</span>
        </div>
      );
    }

    if (message.error) {
      return (
        <div className="text-red-500">
          <p>Sorry, I encountered an error: {message.error}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="whitespace-pre-wrap">{message.content}</p>
        
        {message.rawQuery && (
          <div className="mt-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center text-xs text-muted-foreground"
              onClick={() => setShowSQL(!showSQL)}
            >
              {showSQL ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {showSQL ? "Hide SQL" : "View SQL"}
            </Button>
            
            {showSQL && (
              <pre className="mt-1 p-2 bg-slate-100 rounded text-xs overflow-x-auto">
                {message.rawQuery}
              </pre>
            )}
          </div>
        )}
        
        {message.tableData && (
          <div className="mt-4 border rounded-md overflow-hidden">
            <DataTable 
              columns={message.tableData.columns} 
              data={message.tableData.rows} 
            />
            {!message.chartData && message.tableData.rows.length > 1 && (
              <div className="p-2 flex justify-center border-t">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onGenerateChart(message.id)}
                  className="text-xs flex items-center gap-1"
                >
                  <BarChart2 className="h-3 w-3" />
                  Generate Chart
                </Button>
              </div>
            )}
          </div>
        )}
        
        {message.chartData && (
          <div className="mt-4 border rounded-md p-4">
            <DataChart 
              config={message.chartData.config}
              data={message.chartData.data}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "py-4 flex gap-4",
        message.type === "user" ? "bg-white" : "bg-gray-50"
      )}
    >
      <div className="flex-shrink-0">
        {message.type === "user" ? (
          <Avatar className="h-8 w-8">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="h-8 w-8">
            <AvatarImage src="/ai-avatar.png" />
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
        )}
      </div>
      <div className="flex-1 space-y-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {message.type === "user" ? "You" : "AI Assistant"}
          </span>
          <span className="text-xs text-gray-500">
            {formatTime(message.timestamp)}
          </span>
        </div>
        <div>{renderMessageContent()}</div>
      </div>
    </div>
  );
}