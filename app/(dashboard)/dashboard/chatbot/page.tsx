'use client';

import { useState, useEffect } from 'react';
import { ChatInterface } from '@/components/chatbot/chat-interface';
import { TableSelector } from '@/components/chatbot/table-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Database } from 'lucide-react';

export default function ChatbotPage() {
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  
  // Fetch available tables from the API
  useEffect(() => {
    async function fetchTables() {
      try {
        const res = await fetch('/api/tables');
        if (!res.ok) {
          throw new Error('Failed to fetch tables');
        }
        const data = await res.json();
        
        // Filter out the system tables
        const filteredTables = data.tables.filter((table: string) => 
          table !== "library" && 
          table !== "historical" && 
          table !== "chatbot_historical" && 
          table !== "messages" && 
          table !== "conversations"
        );

        setAvailableTables(filteredTables);
        // Default to first table if tables exist
        setSelectedTables(filteredTables.length > 0 ? [filteredTables[0]] : []);
      } catch (error) {
        console.error("Error fetching tables:", error);
      }
    }
    fetchTables();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 overflow-hidden mb-6">
        <div className="px-8 py-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <Bot className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">AI Data Assistant</h1>
              <p className="text-muted-foreground">
                Chat with your data using natural language. Select your data sources below to begin.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Source Selection */}
      <Card className="border-2 hover:border-blue-100 dark:hover:border-blue-900 transition-colors">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Select Data Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TableSelector 
            availableTables={availableTables}
            selectedTables={selectedTables}
            setSelectedTables={setSelectedTables}
          />
        </CardContent>
      </Card>
      
      {/* Chat Interface */}
      <Card className="min-h-[600px] flex flex-col border-2 hover:border-blue-100 dark:hover:border-blue-900 transition-colors">
        <CardContent className="flex-grow p-0">
          <ChatInterface selectedTables={selectedTables} />
        </CardContent>
      </Card>
    </div>
  );
}