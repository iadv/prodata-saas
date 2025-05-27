"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartData {
  type: "line" | "bar";
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
      tension?: number;
    }[];
  };
  options: {
    responsive: boolean;
    plugins: {
      legend: {
        position: "top" | "bottom" | "left" | "right";
      };
      title: {
        display: boolean;
        text: string;
      };
    };
  };
}

interface ReportData {
  content: string;
  charts?: ChartData[];
}

interface ReportViewerProps {
  report: ReportData;
}

export default function ReportViewer_ai({ report }: ReportViewerProps) {
  const [editMode, setEditMode] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch("/api/deepanalysis_ai/download/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ report }),
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "analysis-report.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  const handleDownloadWord = async () => {
    try {
      const response = await fetch("/api/deepanalysis_ai/download/word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ report }),
      });

      if (!response.ok) throw new Error("Failed to generate Word document");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "analysis-report.docx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading Word document:", error);
    }
  };

  const handleSubmitEdit = async () => {
    if (!editPrompt.trim()) return;
    // Handle edit submission logic here
    setEditMode(false);
    setEditPrompt("");
  };

  const renderChart = (chart: ChartData, index: number) => {
    try {
      const chartStyle = {
        width: '100%',
        height: '400px',
        marginBottom: '2rem',
      };

      return (
        <div key={index} style={chartStyle} className="chart-container">
          {chart.type === "line" ? (
            <Line data={chart.data} options={{ ...chart.options, maintainAspectRatio: false }} />
          ) : (
            <Bar data={chart.data} options={{ ...chart.options, maintainAspectRatio: false }} />
          )}
        </div>
      );
    } catch (error) {
      console.error(`Error rendering chart ${index}:`, error);
      return (
        <div key={index} className="my-6 p-4 border border-red-200 rounded-md bg-red-50">
          <p className="text-red-600">Failed to render chart</p>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap gap-4">
        <Button onClick={handleDownloadPDF} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button onClick={handleDownloadWord} variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Download Word
        </Button>
        <Button
          onClick={() => setEditMode(!editMode)}
          variant={editMode ? "secondary" : "outline"}
        >
          <Edit className="mr-2 h-4 w-4" />
          {editMode ? "Cancel Edit" : "Edit Report"}
        </Button>
      </div>

      {editMode && (
        <Card className="p-4">
          <Textarea
            placeholder="Describe what changes you'd like to make to the report..."
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            className="min-h-[100px] mb-4"
          />
          <Button onClick={handleSubmitEdit} disabled={!editPrompt.trim()}>
            Submit Changes
          </Button>
        </Card>
      )}

      <div className="prose prose-lg max-w-none">
        <div className="mb-6 text-sm text-muted-foreground">
          Generated Report (experimental feature)
        </div>
        <div 
          dangerouslySetInnerHTML={{ __html: report.content }}
          className="text-base leading-7 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-6 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:mb-4 [&>h2]:mt-8 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4"
        />
      </div>

      {report.charts?.map((chart, index) => renderChart(chart, index))}
    </div>
  );
} 