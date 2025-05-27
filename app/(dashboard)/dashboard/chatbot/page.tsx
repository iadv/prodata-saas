'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatInterface } from '@/components/chatbot/chat-interface';
import { TableSelector } from '@/components/chatbot/table-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        AI Data Assistant
      </h1>
      
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-md">Select Data Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSelector 
            availableTables={availableTables}
            selectedTables={selectedTables}
            setSelectedTables={setSelectedTables}
          />
        </CardContent>
      </Card>
      
      <Card className="min-h-[500px] flex flex-col">
        <CardContent className="flex-grow p-0">
          <ChatInterface selectedTables={selectedTables} />
        </CardContent>
      </Card>
    </section>
  );
}