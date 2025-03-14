import { useState, useEffect, useCallback } from 'react';

interface HistoryItem {
  id: number;
  prompt: string;
  createdAt: string;
}

export function useQueryHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
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
  }, []);

  const addToHistory = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save to history');
      }
      
      // Refresh history after adding new item
      await fetchHistory();
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  }, [fetchHistory]);

  // Fetch history on component mount
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    isLoading,
    fetchHistory,
    addToHistory
  };
}