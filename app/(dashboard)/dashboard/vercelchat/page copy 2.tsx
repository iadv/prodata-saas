"use client";

import { useState,useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateChartConfig,
  generateQuery,
  runGenerateSQLQuery,
} from "./actions";
import { Config, Result } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProjectInfo } from "@/components/vercelchat/project-info";
import { Results } from "@/components/vercelchat/results";
import { SuggestedQueries } from "@/components/vercelchat/suggested-queries";
import { QueryViewer } from "@/components/vercelchat/query-viewer";
import { Search } from "@/components/vercelchat/search";
import { Header } from "@/components/vercelchat/header";
import ViewData from "@/components/vercelchat/viewdata";

export default function Page() {
  const [inputValue, setInputValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [chartConfig, setChartConfig] = useState<Config | null>(null);

  // New state for table selection
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>(["All"]);

  // Fetch available tables from /api/tables (which uses the user’s schema)
  useEffect(() => {
    async function fetchTables() {
      try {
        const res = await fetch("/api/tables");
        const data = await res.json(); // expecting an array of table names
        setAvailableTables(data);
        // Default to "All" if tables exist, or empty otherwise
        setSelectedTables(data.length > 0 ? ["All"] : []);
      } catch (error) {
        console.error("Error fetching tables:", error);
      }
    }
    fetchTables();
  }, []);

  // Multi-select table dropdown component
  const TableSelector = ({
    availableTables,
    selectedTables,
    setSelectedTables,
  }: {
    availableTables: string[];
    selectedTables: string[];
    setSelectedTables: React.Dispatch<React.SetStateAction<string[]>>;
  }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    const handleToggle = (table: string) => {
      if (table === "All") {
        // Toggle "All": if already selected, clear; otherwise, select only "All"
        if (selectedTables.includes("All")) {
          setSelectedTables([]);
        } else {
          setSelectedTables(["All"]);
        }
      } else {
        let newSelected = [...selectedTables];
        // If "All" is selected, clear it before adding individual tables.
        if (newSelected.includes("All")) {
          newSelected = [];
        }
        if (newSelected.includes(table)) {
          newSelected = newSelected.filter((t) => t !== table);
        } else {
          newSelected.push(table);
        }
        setSelectedTables(newSelected);
      }
    };

    const displayText =
      selectedTables.length === 0 ? "Select Tables" : selectedTables.join(", ");

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="border rounded px-4 py-2 bg-white dark:bg-neutral-800"
        >
          {displayText}
        </button>
        {open && (
          <div className="absolute z-10 mt-2 w-56 bg-white dark:bg-neutral-800 border rounded shadow-lg">
            <div className="p-2 space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTables.includes("All")}
                  onChange={() => handleToggle("All")}
                  className="mr-2"
                />
                <label>All</label>
              </div>
              {availableTables.map((table) => (
                <div key={table} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTables.includes(table)}
                    onChange={() => handleToggle(table)}
                    className="mr-2"
                  />
                  <label>{table}</label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = async (suggestion?: string) => {
    const question = suggestion ?? inputValue;
    if (inputValue.length === 0 && !suggestion) return;
    clearExistingData();
    if (question.trim()) {
      setSubmitted(true);
    }
    setLoading(true);
    setLoadingStep(1);
    setActiveQuery("");
    try {
      // Pass the selectedTables to restrict query scope
      const query = await generateQuery(question, selectedTables);
      if (query === undefined) {
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
    try {
      await handleSubmit(suggestion);
    } catch (e) {
      toast.error("An error occurred. Please try again.");
    }
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

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 flex items-start justify-center p-0 sm:p-8">
      <div className="w-full max-w-4xl min-h-dvh sm:min-h-0 flex flex-col ">
        <motion.div
          className="bg-card rounded-xl sm:border sm:border-border flex-grow flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="p-6 sm:p-8 flex flex-col flex-grow">
            {/* Header & Table Selector */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 space-y-4 sm:space-y-0">
              <div>
                {/* Your Header component or logo can go here */}
              </div>
              <TableSelector
                availableTables={availableTables}
                selectedTables={selectedTables}
                setSelectedTables={setSelectedTables}
              />
            </div>
            <Search
              handleClear={handleClear}
              handleSubmit={handleSubmit}
              inputValue={inputValue}
              setInputValue={setInputValue}
              submitted={submitted}
            />
            <div
              id="main-container"
              className="flex-grow flex flex-col sm:min-h-[420px]"
            >
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
