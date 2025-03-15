'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageItem } from './message-item';
import { Message, ConversationHistory } from './type';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  SendHorizontal, 
  Loader2,
  ClockIcon,
  MessageSquareText 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateQuery, runGenerateSQLQuery } from '@/app/(dashboard)/dashboard/vercelchat/actions';
import { v4 as uuidv4 } from 'uuid';
import { ConversationSidebar } from './conversation-sidebar';
import { SuggestedQueries } from '@/components/vercelchat/suggested-queries';
import { RecentQuestions } from './recent-questions';

interface ChatInterfaceProps {
  selectedTables: string[];
}

export function ChatInterface({ selectedTables }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationHistory[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tableRows, setTableRows] = useState<Record<string, any[]> | null>(null);
  const [showRecentQuestions, setShowRecentQuestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const { toast } = useToast();

  // Handler for suggestion clicks
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversation');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations.',
        variant: 'destructive',
      });
    }
  };

  const fetchConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversation?id=${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      const conversation = await response.json();
      setMessages(conversation.messages);
      setCurrentConversationId(conversation.id);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversation.',
        variant: 'destructive',
      });
    }
  };

  const createOrUpdateConversation = async (message: Message, isNewConversation: boolean) => {
    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationId: isNewConversation ? null : currentConversationId,
          generateTitle: isNewConversation,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save conversation');
      }

      const data = await response.json();
      
      if (isNewConversation) {
        setCurrentConversationId(data.id);
        // Add the new conversation to the list
        setConversations((prev) => [
          {
            id: data.id,
            title: data.title,
            messages: [message],
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
          },
          ...prev,
        ]);
      } else {
        // Update conversation in the list
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === currentConversationId
              ? {
                  ...conv,
                  updatedAt: new Date(data.updatedAt),
                }
              : conv
          )
        );
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to save conversation.',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    if (selectedTables.length === 0) {
      toast({
        title: 'No tables selected',
        description: 'Please select at least one table to query.',
        variant: 'destructive',
      });
      return;
    }
  
    // Close recent questions panel when sending a message
    setShowRecentQuestions(false);
    
    setIsProcessing(true);
    const userMessage: Message = {
      id: uuidv4(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
  
    const assistantMessage: Message = {
      id: uuidv4(),
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
  
    const isNewConversation = !currentConversationId;
    
    // Update UI immediately
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputValue('');
  
    try {
      // Save user message
      await createOrUpdateConversation(userMessage, isNewConversation);
      
      // Get all available tables first (needed if "All" is selected)
      let allAvailableTables: string[] = [];
      if (selectedTables.includes("All")) {
        try {
          const tablesResponse = await fetch('/api/tables');
          if (tablesResponse.ok) {
            const tables = await tablesResponse.json();
            // Filter out system tables if needed
            allAvailableTables = tables.filter((table: string) => 
              table !== "library" && table !== "historical"
            );
          }
        } catch (error) {
          console.error("Error fetching all tables:", error);
        }
      }
      
      // Process the selected tables - expand "All" to all available tables
      const effectiveSelectedTables = selectedTables.includes("All") 
        ? allAvailableTables  // Use all available tables if "All" is selected
        : selectedTables;     // Otherwise use the specifically selected tables
      
      // Fetch table data for context
      const tableData = await fetchTopRows(effectiveSelectedTables);
      setTableRows(tableData);
      
      // Fetch context columns for all selected tables
      const contextColumns = await fetchContextColumns(effectiveSelectedTables);
      
      // Join tables for query generation
      const selectedTablesString = effectiveSelectedTables.join(" ");
      
      // Generate and run SQL query
      const query = await generateQuery(
        inputValue, 
        contextColumns, 
        selectedTablesString, 
        tableData
      );
      
      // Updated error handling for query generation
        if (typeof query !== 'string') {
            // Use your toast implementation
            toast({
            title: 'Error',
            description: 'An error occurred while generating the query.',
            variant: 'destructive',
            });
            setIsProcessing(false);
            return;
        }
        
        if (!query) {
            toast({
            title: 'Error',
            description: 'An error occurred. Please try again.',
            variant: 'destructive',
            });
            setIsProcessing(false);
            return;
        }
      
      const results = await runGenerateSQLQuery(query);
      const columns = results.length > 0 ? Object.keys(results[0]) : [];
      
      // Update assistant message with results
      const updatedAssistantMessage: Message = {
        ...assistantMessage,
        isLoading: false,
        content: `Based on your request, I've analyzed the data and found the following results:`,
        tableData: {
          columns,
          rows: results,
        },
        rawQuery: query,
      };
      
      // Update UI
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id ? updatedAssistantMessage : msg
        )
      );
      
      // Save assistant message
      await createOrUpdateConversation(updatedAssistantMessage, false);
      
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Update assistant message with error
      const errorMessage: Message = {
        ...assistantMessage,
        isLoading: false,
        content: 'I encountered an error while processing your request.',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
      
      // Update UI
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id ? errorMessage : msg
        )
      );
      
      // Save error message
      await createOrUpdateConversation(errorMessage, false);
      
      toast({
        title: 'Error',
        description: 'Failed to process your request.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateChart = async (messageId: string) => {
    const message = messages.find((msg) => msg.id === messageId);
    
    if (!message || !message.tableData || !currentConversationId) return;
    
    try {
      // Only get the chart configuration without saving to database
      const response = await fetch('/api/chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          results: message.tableData.rows,
          userQuery: messages.find((msg) => msg.type === 'user')?.content || '',
          // Don't include messageId and conversationId to skip database update
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate chart: ${errorText}`);
      }
      
      const { chartConfig } = await response.json();
      
      // Update the UI with the new chart
      const updatedMessage = {
        ...message,
        chartData: {
          config: chartConfig.config,
          data: message.tableData.rows,
        },
      };
      
      // Update UI state
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? updatedMessage : msg))
      );
      
      // Save the updated message
      await createOrUpdateConversation(updatedMessage, false);
      
    } catch (error) {
      console.error('Error generating chart:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate chart.',
        variant: 'destructive',
      });
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
  };

  const handleConversationSelect = (id: string) => {
    fetchConversation(id);
    setIsSidebarOpen(false);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversation?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
      
      // Remove from list
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
      
      // If currently viewing the deleted conversation, clear it
      if (currentConversationId === id) {
        setMessages([]);
        setCurrentConversationId(null);
      }
      
      toast({
        title: 'Success',
        description: 'Conversation deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation.',
        variant: 'destructive',
      });
    }
  };

  const fetchTopRows = async (tables: string[]): Promise<Record<string, any[]>> => {
    try {
      const response = await fetch('/api/fetchTopRows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tables: tables, // Pass the already expanded list of tables
          limit: 5,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch table rows');
      }
  
      const data = await response.json();
      return data.rows || {};
    } catch (error) {
      console.error('Error fetching top rows:', error);
      return {};
    }
  };
  
  const fetchContextColumns = async (tables: string[]): Promise<string> => {
    try {
      // For each table, fetch its columns and concatenate the results
      const selectedTableColumnsPromises = tables.map(async (table) => {
        try {
          const res = await fetch("/api/contextfetch", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tableNames: [table], // Pass a single table to get its columns
            }),
          });
  
          if (!res.ok) {
            throw new Error(`Failed to fetch columns for table: ${table}`);
          }
  
          const data = await res.json();
          return data.columns ? data.columns.join(' ') : '';
        } catch (error) {
          console.error(`Error fetching columns for table ${table}:`, error);
          return '';
        }
      });
      
      // Wait for all promises to resolve
      const columnsPerTable = await Promise.all(selectedTableColumnsPromises);
      
      // Join all columns into a single string
      return columnsPerTable.join(' ');
    } catch (error) {
      console.error('Error fetching context columns:', error);
      return '';
    }
  };

  const toggleRecentQuestions = () => {
    setShowRecentQuestions(prev => !prev);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Recent Questions Toggle Button */}
      <div className="border-b px-4 py-2 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs flex items-center gap-1"
          onClick={toggleRecentQuestions}
        >
          <ClockIcon className="h-3.5 w-3.5" />
          {showRecentQuestions ? "Hide Recent Questions" : "Show Recent Questions"}
        </Button>
      </div>
      
      {/* Recent Questions Panel */}
      <RecentQuestions
        conversations={conversations}
        onQuestionClick={handleSuggestionClick}
        isVisible={showRecentQuestions}
        onClose={() => setShowRecentQuestions(false)}
      />
      
      {/* Main Chat Area */}
      <div className="flex flex-1 h-full overflow-hidden">
        <ConversationSidebar
          conversations={conversations}
          onSelect={handleConversationSelect}
          onDelete={handleDeleteConversation}
          onNewConversation={startNewConversation}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          selectedConversationId={currentConversationId}
        />
        
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <h3 className="text-xl font-semibold mb-2">Welcome to the AI Data Assistant</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Ask me questions about your data and I'll help you analyze it. 
                  You can request specific information, comparisons, or trends.
                </p>
                
                {/* Use SuggestedQueries component */}
                <SuggestedQueries 
                  handleSuggestionClick={handleSuggestionClick} 
                  schemaName={selectedTables[0] === "All" ? undefined : selectedTables[0]}
                />
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageItem 
                    key={message.id} 
                    message={message} 
                    onGenerateChart={handleGenerateChart}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          
          <div className="border-t p-4">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="Ask a question about your data..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isProcessing}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={!inputValue.trim() || isProcessing}
                size="icon"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <SendHorizontal className="h-5 w-5" />
                )}
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              Press <kbd className="px-1 py-0.5 bg-gray-100 border rounded text-xs">Enter</kbd> to send
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}