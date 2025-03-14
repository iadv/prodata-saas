"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateChartConfig,
  generateQuery,
  runGenerateSQLQuery,
} from "./actions";
import { Config, Result } from "@/lib/types";
import { Loader2, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/vercelchat/ui/button";
import { cn } from "@/lib/utils";
import { ProjectInfo } from "@/components/vercelchat/project-info";
import { Results } from "@/components/vercelchat/results";
import { SuggestedQueries } from "@/components/vercelchat/suggested-queries";
import { QueryViewer } from "@/components/vercelchat/query-viewer";
import { Search } from "@/components/vercelchat/search";
import { Header } from "@/components/vercelchat/header";
import ViewData from "@/components/vercelchat/viewdata";
import { HistorySidebar } from "@/components/vercelchat/HistorySidebar";

export default function Page() {
  const [inputValue, setInputValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [chartConfig, setChartConfig] = useState<Config | null>(null);
  const [tableRows, setTableRows] = useState<Record<string, any[]> | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // State for table selection
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const userId = 5; // Replace with actual user ID retrieval logic

  // Define the user's schema name
  const schemaName = `user_${userId}`;

  // Fetch available tables from the /api/tables endpoint
  useEffect(() => {
    async function fetchTables() {
      try {
        const res = await fetch("/api/tables");
        if (!res.ok) {
          throw new Error("Failed to fetch tables");
        }
        const data = await res.json();
        
        // Filter out the "library" and "historical" tables
        const filteredTables = data.filter((table: string) => 
          table !== "library" && table !== "historical"
        );

        setAvailableTables(filteredTables);
        // Default to "All" if tables exist
        setSelectedTables(filteredTables.length > 0 ? ["All"] : []);
      } catch (error) {
        console.error("Error fetching tables:", error);
      }
    }
    fetchTables();
  }, []);

  // Function to save a prompt to history
  const saveToHistory = async (prompt: string) => {
    if (!prompt.trim()) return;
    
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  };

  const handleSubmit = async (suggestion?: string) => {
    const question = suggestion ?? inputValue;
    if (question.trim().length === 0) return;
    clearExistingData();
    setSubmitted(true);
    setLoading(true);
    setLoadingStep(1);
    setActiveQuery("");
    try {
      // Save the query to history
      await saveToHistory(question);

      // Process the selected tables - expand "All" to all available tables
      const effectiveSelectedTables = selectedTables.includes("All") 
      ? availableTables  // Use all available tables if "All" is selected
      : selectedTables;  // Otherwise use the specifically selected tables

      const selectedTablesString = effectiveSelectedTables.join(" ");

      // Prepare the request payload with the selected tables and limit
      const requestBody = {
        tables: effectiveSelectedTables, // Send the list of selected tables
        limit: 5 // Set the limit to 5
      };

      // Fetch the top rows for each selected table
      const res = await fetch("/api/fetchTopRows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch top rows for tables: ${selectedTables}`);
      }

      const data = await res.json();
      const rowsObj = data.rows; // Assuming the response contains the rows object

      // Set the top 5 rows in the state
      setTableRows(rowsObj); // Save the top 5 rows for each table

      // Fetch columns for each selected table
      const fetchColumnsForTable = async (table: string) => {
        try {
          const res = await fetch("/api/contextfetch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tableNames: [table], // Pass tableNames as an array
            }),
          });

          if (!res.ok) {
            throw new Error(`Failed to fetch columns for table: ${table}`);
          }

          const data = await res.json();

          // Ensure you're accessing 'columns' properly
          return data.columns ? data.columns.join(" ") : ''; // Join columns into a single string
        } catch (error) {
          console.error(error);
          return '';
        }
      };

      // Fetch context columns for each selected table
      const selectedTableColumnsPromises = selectedTables.map(async (table) => {
        const columns = await fetchColumnsForTable(table);
        return columns; // No need to join here since it's done in the API now
      });
      
      // Declare concatenatedContext outside the try block
      let concatenatedContext = "";
      
      // Wait for all promises to resolve and log the concatenated output
      try {
        const selectedColumns = await Promise.all(selectedTableColumnsPromises);
        
        // Join all columns into a single string
        concatenatedContext = selectedColumns.join(" ");
      } catch (error) {
        console.error("Error fetching context columns:", error);
      }

      // Pass selectedTables to restrict query scope
      const query = await generateQuery(question, concatenatedContext, selectedTablesString, rowsObj);

      if (typeof query !== 'string') {
        // Handle the error appropriately
        toast.error("An error occurred while generating the query.");
        setLoading(false);
        return;
      }

      if (!query) {
        toast.error("An error occurred. Please try again.");
        setLoading(false);
        return;
      }

      setActiveQuery(query);
      setLoadingStep(2);
      const companies = await runGenerateSQLQuery(query);
      const cols = companies.length > 0 ? Object.keys(companies[0]) : [];
      setResults(companies);
      setColumns(cols);
      setLoading(false);
      const generation = await generateChartConfig(companies, question);
      setChartConfig(generation.config);
    } catch (e) {
      toast.error("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setInputValue(suggestion);
    await handleSubmit(suggestion);
  };

  const handleHistorySelect = async (prompt: string) => {
    setInputValue(prompt);
    await handleSubmit(prompt);
  };

  const clearExistingData = () => {
    setActiveQuery("");
    setResults([]);
    setColumns([]);
    setChartConfig(null);
  };

  const handleClear = () => {
    setSubmitted(false);
    setInputValue("");
    clearExistingData();
  };

  // New modern, searchable multi-select component
  const TableMultiSelect = ({
    availableTables,
    selectedTables,
    setSelectedTables,
  }: {
    availableTables: string[];
    selectedTables: string[];
    setSelectedTables: React.Dispatch<React.SetStateAction<string[]>>;
  }) => {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Options include "All" plus availableTables, filtered by the search query
    const options = useMemo(() => {
      const allOption = "All";
      const combined = [allOption, ...availableTables];
      return combined.filter((option) =>
        option.toLowerCase().includes(search.toLowerCase())
      );
    }, [search, availableTables]);

    // Handle selection: if "All" is chosen, toggle it; otherwise add/remove the individual table.
    const handleSelect = (option: string) => {
      if (option === "All") {
        if (selectedTables.includes("All")) {
          setSelectedTables([]);
        } else {
          setSelectedTables(["All"]);
        }
      } else {
        let newSelection = selectedTables.includes("All")
          ? []
          : [...selectedTables];
        if (newSelection.includes(option)) {
          newSelection = newSelection.filter((o) => o !== option);
        } else {
          newSelection.push(option);
        }
        setSelectedTables(newSelection);
      }
      setSearch("");
    };

    const removeChip = (option: string) => {
      setSelectedTables(selectedTables.filter((o) => o !== option));
    };

    return (
      <div className="w-full" ref={containerRef}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select your Data Table
        </label>
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 border border-gray-300 rounded px-2 py-1 focus-within:ring-2 focus-within:ring-blue-500">
            {selectedTables.map((option) => (
              <div
                key={option}
                className="flex items-center bg-blue-100 text-blue-800 rounded px-2 py-1"
              >
                <span>{option}</span>
                <button
                  type="button"
                  onClick={() => removeChip(option)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  &times;
                </button>
              </div>
            ))}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="Search tables..."
              className="flex-grow outline-none py-1"
            />
          </div>
          {open && (
            <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded bg-white border border-gray-300 shadow-lg">
              {options.map((option) => (
                <li
                  key={option}
                  onClick={() => handleSelect(option)}
                  className="cursor-pointer px-4 py-2 hover:bg-blue-500 hover:text-white"
                >
                  {option}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 flex items-start justify-center p-0 sm:p-8">
      <div className="w-full max-w-4xl min-h-dvh sm:min-h-0 flex flex-col">
        <motion.div
          className="bg-card rounded-xl sm:border sm:border-border flex-grow flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="p-6 sm:p-8 flex flex-col flex-grow">
            {/* Header */}
            <Header handleClear={handleClear} />
            {/* Table MultiSelect */}
            <div className="mb-4">
              <TableMultiSelect
                availableTables={availableTables}
                selectedTables={selectedTables}
                setSelectedTables={setSelectedTables}
              />
            </div>
            <div className="mb-6 flex items-stretch space-x-2">
              {/* History Toggle Button */}
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0 h-10 w-10 rounded-md shadow-sm"
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                aria-label={isHistoryOpen ? "Hide history" : "Show history"}
                title="View query history"
              >
                {isHistoryOpen ? 
                  <ChevronLeft className="h-4 w-4" /> : 
                  <Clock className="h-4 w-4" />
                }
              </Button>
              
              {/* Search Bar */}
              <div className="flex-grow">
                <Search
                  handleClear={handleClear}
                  handleSubmit={handleSubmit}
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  submitted={submitted}
                />
              </div>
            </div>
            <div
              id="main-container"
              className="flex-grow flex flex-row sm:min-h-[420px] relative"
            >
              {/* History Sidebar */}
              <HistorySidebar 
                onSelectHistoryItem={handleHistorySelect}
                currentPrompt={inputValue}
                isOpen={isHistoryOpen}
                onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
              />
              
              <div className="flex-grow h-full">
                <AnimatePresence mode="wait">
                  {!submitted ? (
                    <SuggestedQueries
                      handleSuggestionClick={handleSuggestionClick}
                    />
                  ) : (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                      className="sm:h-full min-h-[400px] flex flex-col"
                    >
                      {activeQuery.length > 0 && (
                        <QueryViewer
                          activeQuery={activeQuery}
                          inputValue={inputValue}
                        />
                      )}
                      {loading ? (
                        <div className="h-full absolute bg-background/50 w-full flex flex-col items-center justify-center space-y-4">
                          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                          <p className="text-foreground">
                            {loadingStep === 1
                              ? "Generating SQL query..."
                              : "Running SQL query..."}
                          </p>
                        </div>
                      ) : results.length === 0 ? (
                        <div className="flex-grow flex items-center justify-center">
                          <p className="text-center text-muted-foreground">
                            No results found.
                          </p>
                        </div>
                      ) : (
                        <Results
                          results={results}
                          chartConfig={chartConfig}
                          columns={columns}
                        />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <ProjectInfo />
        </motion.div>
      </div>
    </div>
  );
}