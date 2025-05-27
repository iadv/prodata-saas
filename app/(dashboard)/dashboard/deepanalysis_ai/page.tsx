"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import TableSelector_ai from "@/components/deepanalysis_ai/TableSelector";
import PromptInput_ai from "@/components/deepanalysis_ai/PromptInput";
import ReportViewer_ai from "@/components/deepanalysis_ai/ReportViewer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function DeepAnalysis() {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (selectedTables.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one table for analysis",
        variant: "destructive",
      });
      return;
    }

    if (!prompt) {
      toast({
        title: "Error",
        description: "Please enter a prompt for the analysis",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/deepanalysis_ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tables: selectedTables,
          prompt,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate report");
      
      const data = await response.json();
      setReport(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Deep Analysis</h1>
      
      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Select Data Sources</h2>
          <TableSelector_ai
            selectedTables={selectedTables}
            onSelectionChange={setSelectedTables}
          />
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Analysis Prompt</h2>
          <PromptInput_ai
            value={prompt}
            onChange={setPrompt}
            isGenerating={isGenerating}
            onGenerate={handleGenerateReport}
          />
          <p className="text-sm text-gray-500 mt-2">
            💡 Tip: Provide as much detail as possible, including what you want to include and how long you want the report to be.
            Default is a 2-3 page report with 1-2 relevant charts.
          </p>
        </Card>

        {report && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Generated Report</h2>
            <ReportViewer_ai report={report} />
          </Card>
        )}
      </div>
    </div>
  );
} 