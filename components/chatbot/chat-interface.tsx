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
import { generateQuery, runGenerateSQLQuery, detectQueryIntent, generateConversation } from '@/app/(dashboard)/dashboard/vercelchat/actions';
import { v4 as uuidv4 } from 'uuid';
// import { ConversationSidebar } from './conversation-sidebar';
import { SuggestedQueries } from '@/components/vercelchat/suggested-queries';
import { RecentQuestions } from './recent-questions';
// Near the top of your file, import the utility
import { saveToHistory } from './api-utils'; // Adjust the path as needed

interface ChatInterfaceProps {
  selectedTables: string[];
}

// Create a new type that extends SuggestedQueries props to make TypeScript happy
interface SuggestedQueriesWithExtras {
  handleSuggestionClick: (suggestion: string) => void;
  schemaName?: string;
  websiteQuestions: string[];
  mobileQuestions: string[];
}

// Patch the imported SuggestedQueries component with the extended type
const ExtendedSuggestedQueries = SuggestedQueries as unknown as React.FC<SuggestedQueriesWithExtras>;

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
  
  // Default suggested questions for website and mobile formats
  const defaultQuestions = [
    {
      desktop: "Show me top sales by region",
      mobile: "Top sales by region"
    },
    {
      desktop: "What was total revenue last quarter?",
      mobile: "Last quarter revenue"
    },
    {
      desktop: "Compare monthly trends for all products",
      mobile: "Monthly trends"
    },
    {
      desktop: "Which customers have highest lifetime value?",
      mobile: "Top customers"
    },
    {
      desktop: "Show product performance year over year",
      mobile: "YoY performance"
    }
  ];

  // Handler for suggestion clicks
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  // Fetch conversations on component mount
  // useEffect(() => {
  //   fetchConversations();
  // }, []);

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
      
      console.log("Fetched conversations:", data.length);
      
      // Make sure each conversation has a valid messages array
      const validConversations = data.map((conversation: Partial<ConversationHistory>) => ({
        ...conversation,
        messages: Array.isArray(conversation.messages) ? conversation.messages : [],
        createdAt: conversation.createdAt ? new Date(conversation.createdAt) : new Date(),
        updatedAt: conversation.updatedAt ? new Date(conversation.updatedAt) : new Date(),
        id: conversation.id || '',
        title: conversation.title || 'Untitled Conversation',
      }));
      
      console.log("Validated conversations:", validConversations.length);
      
      setConversations(validConversations);
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
      
      // Ensure messages array is valid
      const validMessages = Array.isArray(conversation.messages) 
        ? conversation.messages 
        : [];
      
      setMessages(validMessages);
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
        setConversations((prev) => {
          // Create a new conversation object with the current message
          const newConversation = {
            id: data.id,
            title: data.title,
            messages: [message], // Initialize with current message
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
          };
          console.log("Adding new conversation:", data.id);
          return [newConversation, ...prev];
        });
      } else {
        // Update conversation in the list by appending the message
        setConversations((prev) => {
          // Find the conversation to update
          const updated = prev.map((conv) => {
            if (conv.id === currentConversationId) {
              // Get existing messages or initialize empty array
              const existingMessages = Array.isArray(conv.messages) ? [...conv.messages] : [];
              
              // Create updated conversation with new message appended
              return {
                ...conv,
                // Append the message to existing messages
                messages: [...existingMessages, message],
                updatedAt: new Date(data.updatedAt),
              };
            }
            return conv;
          });
          
          console.log("Updated conversation:", currentConversationId);
          return updated;
        });
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

  // Helper function to fetch all available tables
  const fetchAllTables = async (): Promise<string[]> => {
    try {
      const tablesResponse = await fetch('/api/tables');
      if (tablesResponse.ok) {
        const tables = await tablesResponse.json();
        // Filter out system tables if needed
        return tables.filter((table: string) => 
          table !== "library" && table !== "historical"
        );
      }
      return [];
    } catch (error) {
      console.error("Error fetching all tables:", error);
      return [];
    }
  };
  
  // Helper function to extract and format table structure from sample data
  const formatTableStructure = (tableData: Record<string, any[]>): string => {
    let result = "Available tables and their columns:\n\n";
    
    // For each table
    Object.keys(tableData).forEach(tableName => {
      result += `Table: ${tableName}\n`;
      
      // If table has sample rows, extract column names
      if (tableData[tableName] && tableData[tableName].length > 0) {
        const columns = Object.keys(tableData[tableName][0]);
        result += `Columns: ${columns.join(", ")}\n`;
        
        // Add sample values for each column (from first row)
        result += "Sample values:\n";
        columns.forEach(column => {
          const sampleValue = tableData[tableName][0][column];
          result += `  - ${column}: ${sampleValue}\n`;
        });
      } else {
        result += "No sample data available for this table.\n";
      }
      
      result += "\n";
    });
    
    return result;
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
    
    // Save to history quietly - don't await this to prevent blocking
    saveToHistory(userMessage.content).catch(error => console.error('Error saving to history:', error));

    try {
      // Save user message
      await createOrUpdateConversation(userMessage, isNewConversation);
      
      // Get all available tables (needed if "All" is selected)
      let effectiveSelectedTables: string[] = [...selectedTables];
      
      // If "All" is selected, expand it to include all available tables
      if (selectedTables.includes("All")) {
        const allAvailableTables = await fetchAllTables();
        effectiveSelectedTables = allAvailableTables;
        console.log("Expanded 'All' to tables:", effectiveSelectedTables);
      }
      
      // Fetch table data for context
      const tableData = await fetchTopRows(effectiveSelectedTables);
      console.log("Fetched table data keys:", Object.keys(tableData));
      
      // Format the column information (table structure) from the sample rows
      const structuredColumnInfo = formatTableStructure(tableData);
      console.log("Structured column info:", structuredColumnInfo.substring(0, 200) + "...");
      
      // Fetch context columns for all selected tables (for backward compatibility)
      const contextColumns = await fetchContextColumns(effectiveSelectedTables);
      
      // Combine both types of column information for more robust context
      const enhancedContext = `${structuredColumnInfo}\n\nAdditional column info: ${contextColumns}`;
      
      // Join tables for query generation
      const selectedTablesString = effectiveSelectedTables.join(" ");
      
      // Prepare chat history for context
      const recentMessages = messages.slice(-5); // Get last 5 messages
      const chatHistory = recentMessages.map(msg => ({
        role: msg.type,
        content: msg.content
      }));
  
      // Determine if this is a query request or just a conversation
      const intentResult = await detectQueryIntent(
        inputValue, 
        enhancedContext, 
        selectedTablesString, 
        tableData,
        chatHistory
      );
      
      console.log("Intent detection result:", intentResult);
      
      if (intentResult.intent === "CONVERSATION") {
        // Handle as conversational response
        console.log("Handling as conversation");
        try {
          const response = await generateConversation(
            inputValue,
            enhancedContext,
            selectedTablesString,
            tableData,
            chatHistory
          );
          
          console.log("Conversation response received:", response ? response.substring(0, 100) + "..." : "No response");
          
          // Update assistant message with conversational response
          const updatedAssistantMessage: Message = {
            ...assistantMessage,
            isLoading: false,
            content: response || "I'm not sure how to respond to that. Could you try asking something related to your data?"
          };
          
          // Update UI
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id ? updatedAssistantMessage : msg
            )
          );
          
          // Save assistant message
          await createOrUpdateConversation(updatedAssistantMessage, false);
        } catch (conversationError) {
          console.error("Error in conversation handling:", conversationError);
          
          // Handle conversation errors specifically
          const errorMessage: Message = {
            ...assistantMessage,
            isLoading: false,
            content: "I can help answer general questions as well as questions about your data. What would you like to know?",
            error: conversationError instanceof Error ? conversationError.message : "Unknown error in conversation"
          };
          
          setMessages((prev) =>
            prev.map((msg) => msg.id === assistantMessage.id ? errorMessage : msg)
          );
          
          await createOrUpdateConversation(errorMessage, false);
        }
      } else {
        // This is a query request, proceed with the existing flow
        // Generate and run SQL query
        const query = await generateQuery(
          inputValue, 
          enhancedContext, 
          selectedTablesString, 
          tableData
        );
        
        // Updated error handling for query generation
        if (typeof query !== 'string') {
          toast({
            title: 'Error',
            description: 'An error occurred while generating the query.',
            variant: 'destructive',
          });
          
          const errorMessage: Message = {
            ...assistantMessage,
            isLoading: false,
            content: 'I encountered an error while generating a database query for your question.',
            error: 'Failed to generate query'
          };
          
          setMessages((prev) =>
            prev.map((msg) => msg.id === assistantMessage.id ? errorMessage : msg)
          );
          
          await createOrUpdateConversation(errorMessage, false);
          setIsProcessing(false);
          return;
        }
        
        if (!query) {
          toast({
            title: 'Error',
            description: 'An error occurred. Please try again.',
            variant: 'destructive',
          });
          
          const errorMessage: Message = {
            ...assistantMessage,
            isLoading: false,
            content: 'I couldn\'t generate a suitable query for your question. Could you try rephrasing it?',
            error: 'Empty query generated'
          };
          
          setMessages((prev) =>
            prev.map((msg) => msg.id === assistantMessage.id ? errorMessage : msg)
          );
          
          await createOrUpdateConversation(errorMessage, false);
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
      }
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
      console.log("Fetching top rows for tables:", tables);
      
      const response = await fetch('/api/fetchTopRows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tables: tables, // Pass the expanded list of tables
          limit: 5,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch table rows');
      }
  
      const data = await response.json();
      console.log("Received table rows for:", Object.keys(data.rows || {}));
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
          
          if (data.columns && data.columns.length > 0) {
            return `Table ${table}: ${data.columns.join(', ')}`;
          }
          return '';
        } catch (error) {
          console.error(`Error fetching columns for table ${table}:`, error);
          return '';
        }
      });
      
      // Wait for all promises to resolve
      const columnsPerTable = await Promise.all(selectedTableColumnsPromises);
      
      // Filter out empty strings and join with newlines for better readability
      return columnsPerTable.filter(text => text.length > 0).join('\n');
    } catch (error) {
      console.error('Error fetching context columns:', error);
      return '';
    }
  };

  const toggleRecentQuestions = () => {
    const newState = !showRecentQuestions;
    console.log("Toggling recent questions to:", newState, 
              "Conversations available:", conversations.length);
    setShowRecentQuestions(newState);
  };

  // Add fallback custom suggestions component in case the original component fails
  const FallbackSuggestions = () => {
    return (
      <div className="text-center">
        <h3 className="text-lg font-medium mb-4">Try asking questions like:</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {defaultQuestions.map((question, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="text-sm"
              onClick={() => handleSuggestionClick(question.desktop)}
            >
              <span className="sm:hidden">{question.mobile}</span>
              <span className="hidden sm:inline">{question.desktop}</span>
            </Button>
          ))}
        </div>
      </div>
    );
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
        onQuestionClick={handleSuggestionClick}
        isVisible={showRecentQuestions}
        onClose={() => setShowRecentQuestions(false)}
      />
      
      {/* Main Chat Area */}
      <div className="flex flex-1 h-full overflow-hidden">
        
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <h3 className="text-xl font-semibold mb-2">Welcome to the AI Data Assistant</h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Ask me questions about your data and I'll help you analyze it. 
                  You can request specific information, comparisons, or trends.
                </p>
                
                {/* Error boundary for SuggestedQueries */}
                <div className="w-full">
                  {(() => {
                    try {
                      // Pass props to SuggestedQueries including websiteQuestions and mobileQuestions
                      return (
                        <ExtendedSuggestedQueries 
                          handleSuggestionClick={handleSuggestionClick}
                          {...(selectedTables[0] !== "All" && { schemaName: selectedTables[0] })}
                          websiteQuestions={defaultQuestions.map(q => q.desktop)}
                          mobileQuestions={defaultQuestions.map(q => q.mobile)}
                        />
                      );
                    } catch (e) {
                      console.error("Error rendering SuggestedQueries:", e);
                      return <FallbackSuggestions />;
                    }
                  })()}
                </div>
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