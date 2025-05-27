"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

export default function PromptInput_ai({
  value,
  onChange,
  isGenerating,
  onGenerate,
}: PromptInputProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isGenerating) {
      setStartTime(Date.now());
      intervalId = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
      setStartTime(null);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isGenerating]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerate = () => {
    setElapsedTime(0);
    onGenerate();
  };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Enter your analysis request here. Be specific about what you want to analyze, include, or focus on. You can specify report length and any particular aspects you want to emphasize."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[150px]"
        disabled={isGenerating}
      />
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !value.trim()}
        className="w-full sm:w-auto"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Report... ({formatTime(elapsedTime)})
          </>
        ) : (
          "Generate Report"
        )}
      </Button>
    </div>
  );
} 