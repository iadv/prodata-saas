"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TableSelectorProps {
  selectedTables: string[];
  onSelectionChange: (tables: string[]) => void;
}

export default function TableSelector_ai({ selectedTables, onSelectionChange }: TableSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [availableTables, setAvailableTables] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch("/api/tables");
        if (!response.ok) throw new Error("Failed to fetch tables");
        const data = await response.json();
        
        // Filter out system tables
        const filteredTables = data.tables.filter((table: string) => 
          table !== "library" && 
          table !== "historical" && 
          table !== "chatbot_historical" && 
          table !== "messages" && 
          table !== "conversations"
        );
        
        setAvailableTables(filteredTables);
      } catch (error) {
        console.error("Error fetching tables:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, []);

  const filteredTables = availableTables.filter(table =>
    table.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = () => {
    onSelectionChange(availableTables);
  };

  const handleClear = () => {
    onSelectionChange([]);
  };

  const toggleTable = (table: string) => {
    const newSelection = selectedTables.includes(table)
      ? selectedTables.filter(t => t !== table)
      : [...selectedTables, table];
    onSelectionChange(newSelection);
  };

  if (loading) {
    return <div className="animate-pulse">Loading available tables...</div>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedTables.length === 0
            ? "Select tables..."
            : `${selectedTables.length} table${selectedTables.length === 1 ? "" : "s"} selected`}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-4" align="start">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="flex-1"
            >
              Clear
            </Button>
          </div>

          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {filteredTables.map((table) => (
              <div
                key={table}
                className={cn(
                  "flex items-center space-x-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent",
                  selectedTables.includes(table) && "bg-accent"
                )}
                onClick={() => toggleTable(table)}
              >
                <div className="flex-shrink-0 w-4">
                  {selectedTables.includes(table) && (
                    <Check className="h-4 w-4" />
                  )}
                </div>
                <span className="truncate">{table}</span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 