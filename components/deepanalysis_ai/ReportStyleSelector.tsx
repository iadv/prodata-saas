"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export const reportStyles = [
  { id: "general", name: "General Report" },
  { id: "sop", name: "Standard Operating Procedure (SOP) Report" },
  { id: "downtime", name: "Downtime Analysis Report" },
  { id: "maintenance", name: "Preventive Maintenance Schedule & Checklist" },
  { id: "rootcause", name: "Failure Root Cause Analysis Report" },
  { id: "mttr_mtbf", name: "Mean Time to Repair (MTTR) and Mean Time Between Failures (MTBF) Report" },
  { id: "maintenance_cost", name: "Maintenance Cost Breakdown Report" },
  { id: "production_line", name: "Production Line Performance Report" },
  { id: "shift_summary", name: "Shift-wise Operations Summary" },
  { id: "oee", name: "Overall Equipment Effectiveness (OEE) Report" },
  { id: "bottleneck", name: "Production Bottleneck Analysis" },
  { id: "forecast", name: "Forecast vs. Actual Production Report" },
  { id: "defect_trend", name: "Defect Rate Trend Report" },
  { id: "quality_issues", name: "Top Quality Issues Summary Report" },
  { id: "fpy", name: "First Pass Yield (FPY) Report" },
  { id: "energy", name: "Energy Consumption Report by Equipment/Area" },
  { id: "waste", name: "Scrap and Waste Generation Analysis" },
  { id: "material_usage", name: "Material Usage Efficiency Report" },
  { id: "cost_per_unit", name: "Cost per Unit Produced Report" },
  { id: "plant_manager", name: "Weekly Plant Manager Summary Dashboard" },
  { id: "operations_brief", name: "Daily Operations Briefing Report" },
  { id: "workforce", name: "Workforce Productivity Report" },
  { id: "capacity", name: "Capacity Planning & Utilization Report" },
];

interface ReportStyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ReportStyleSelector({ value, onChange }: ReportStyleSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedStyle = reportStyles.find((style) => style.id === value);

  const filteredStyles = React.useMemo(() => {
    if (!searchQuery) return reportStyles;
    const query = searchQuery.toLowerCase();
    return reportStyles.filter(style => 
      style.name.toLowerCase().includes(query) || 
      style.id.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSelect = (styleId: string) => {
    onChange(styleId);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Select Report Style
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white dark:bg-gray-950 hover:bg-purple-50 dark:hover:bg-purple-900/20"
          >
            {selectedStyle?.name ?? "Select a report style..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[400px] p-4" 
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <div className="space-y-4">
            <Input
              placeholder="Search report styles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
            <ScrollArea className="h-[300px] rounded-md border">
              <div className="space-y-1 p-2">
                {filteredStyles.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-500">
                    No report style found.
                  </div>
                ) : (
                  filteredStyles.map((style) => (
                    <div
                      key={style.id}
                      onClick={() => handleSelect(style.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                        "cursor-pointer transition-colors",
                        "hover:bg-purple-100 dark:hover:bg-purple-900/40",
                        value === style.id ? "bg-purple-50 dark:bg-purple-900/20" : "bg-white dark:bg-gray-950",
                        "border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                      )}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value === style.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-grow truncate">{style.name}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 