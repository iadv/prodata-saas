// api-utils.ts
export const saveToHistory = async (prompt: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/chatbot-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      return response.ok;
    } catch (error) {
      console.error('Error saving to history:', error);
      return false;
    }
  };