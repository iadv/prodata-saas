"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";

interface HistoryItem {
  id: string;
  prompt: string;
  report_content: string;
  created_at: string;
}

export default function DeepAnalysisHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/deepanalysis_ai/history");
        if (!response.ok) throw new Error("Failed to fetch history");
        const data = await response.json();
        setHistory(data.history);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load history. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [toast]);

  const handleViewReport = (item: HistoryItem) => {
    // Navigate to the report viewer with the selected report
    window.location.href = `/dashboard/deepanalysis_ai?report=${item.id}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Analysis History</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Analysis History</h1>
      
      <div className="space-y-4">
        {history.length === 0 ? (
          <p className="text-gray-500">No analysis history found.</p>
        ) : (
          history.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="font-semibold">{item.prompt}</h3>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleViewReport(item)}
                >
                  View Report
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 