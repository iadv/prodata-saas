"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import TableSelector_ai from "@/components/deepanalysis_ai/TableSelector";
import PromptInput_ai from "@/components/deepanalysis_ai/PromptInput";
import ReportViewer_ai from "@/components/deepanalysis_ai/ReportViewer";
import { Brain, Database, Sparkles } from "lucide-react";
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
      {/* Header Section */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 overflow-hidden mb-6">
        <div className="px-8 py-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <Brain className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">Deep Analysis</h1>
                <span className="inline-flex items-center text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 rounded-full px-2 py-0.5">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Beta
                </span>
              </div>
              <p className="text-muted-foreground">
                Generate comprehensive reports with charts and insights from your data.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Data Source Selection */}
        <Card className="p-6 border-2 hover:border-orange-100 dark:hover:border-orange-900 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-semibold">Select Data Sources</h2>
          </div>
          <TableSelector_ai
            selectedTables={selectedTables}
            onSelectionChange={setSelectedTables}
          />
        </Card>

        {/* Analysis Prompt */}
        <Card className="p-6 border-2 hover:border-orange-100 dark:hover:border-orange-900 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-semibold">Analysis Prompt</h2>
          </div>
          <PromptInput_ai
            value={prompt}
            onChange={setPrompt}
            isGenerating={isGenerating}
            onGenerate={handleGenerateReport}
          />
          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-medium mb-2">
              <Sparkles className="h-4 w-4" />
              Pro Tip
            </div>
            <p className="text-sm text-muted-foreground">
              Provide specific details about what you want to analyze and include. The default output is a 2-3 page report with 1-2 relevant charts.
            </p>
          </div>
        </Card>

        {/* Generated Report */}
        {report && (
          <Card className="p-6 border-2 hover:border-orange-100 dark:hover:border-orange-900 transition-colors">
            <h2 className="text-xl font-semibold mb-4">Generated Report</h2>
            <ReportViewer_ai report={report} />
          </Card>
        )}
      </div>
    </div>
  );
} 