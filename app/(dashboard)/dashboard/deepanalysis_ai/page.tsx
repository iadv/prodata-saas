"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import TableSelector_ai from "@/components/deepanalysis_ai/TableSelector";
import PromptInput_ai from "@/components/deepanalysis_ai/PromptInput";
import ReportViewer_ai from "@/components/deepanalysis_ai/ReportViewer";
import ReportStyleSelector from "@/components/deepanalysis_ai/ReportStyleSelector";
import { Brain, Database, Sparkles, Info } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function DeepAnalysis() {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportStyle, setReportStyle] = useState("general");
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
      // First, fetch sample data for the selected tables
      const topRowsResponse = await fetch("/api/fetchTopRows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tables: selectedTables,
          limit: 5
        }),
      });

      if (!topRowsResponse.ok) {
        throw new Error("Failed to fetch sample data");
      }

      const { rows: sampleData } = await topRowsResponse.json();

      // Then, fetch column information for the selected tables
      const contextResponse = await fetch("/api/contextfetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableNames: selectedTables
        }),
      });

      if (!contextResponse.ok) {
        throw new Error("Failed to fetch table context");
      }

      const tableContext = await contextResponse.json();

      // Now make the report generation request with the additional context
      const response = await fetch("/api/deepanalysis_ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tables: selectedTables,
          prompt,
          reportStyle,
          tableContext: JSON.stringify(tableContext),
          sampleData: JSON.stringify(sampleData)
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate report: ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.content) {
        throw new Error("Generated report is empty");
      }
      setReport(data);
    } catch (error) {
      console.error("Report generation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 overflow-hidden mb-6">
        <div className="px-8 py-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Deep Analysis</h1>
                <span className="inline-flex items-center text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded-full px-2 py-0.5">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Beta
                </span>
              </div>
              <p className="text-muted-foreground">
                Generate comprehensive technical reports with industry-standard analytics
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Data Source Selection */}
        <Card className="p-6 border-2 hover:border-purple-100 dark:hover:border-purple-900 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-semibold">Select Data Sources</h2>
          </div>
          <TableSelector_ai
            selectedTables={selectedTables}
            onSelectionChange={setSelectedTables}
          />
        </Card>

        {/* Report Configuration */}
        <Card className="p-6 border-2 hover:border-purple-100 dark:hover:border-purple-900 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-semibold">Configure Report</h2>
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <ReportStyleSelector
                value={reportStyle}
                onChange={setReportStyle}
              />
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium mb-2">
                  <Info className="h-4 w-4" />
                  Report Style Guide
                </div>
                <p className="text-sm text-muted-foreground">
                  Each report style follows industry standards and technical specifications. Select the style that best matches your analysis needs. For custom report styles for your organization, reach out to nithin@getprodata.com
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <PromptInput_ai
                value={prompt}
                onChange={setPrompt}
                isGenerating={isGenerating}
                onGenerate={handleGenerateReport}
              />
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium mb-2">
                  <Info className="h-4 w-4" />
                  Pro Tip
                </div>
                <p className="text-sm text-muted-foreground">
                  Be specific about metrics, KPIs, and technical aspects you want to analyze. The AI will generate a detailed report following industry standards and best practices.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Generated Report */}
        {report && (
          <Card className="p-6 border-2 hover:border-purple-100 dark:hover:border-purple-900 transition-colors">
            <h2 className="text-xl font-semibold mb-4">Generated Report</h2>
            <ReportViewer_ai report={report} />
          </Card>
        )}
      </div>
    </div>
  );
} 