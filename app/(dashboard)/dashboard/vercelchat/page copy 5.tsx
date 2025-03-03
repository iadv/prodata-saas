"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { getUser } from '@/lib/db/queries';

export default function Page() {
  const [inputValue, setInputValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [chartConfig, setChartConfig] = useState<Config | null>(null);

  // State for table selection
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [schemaName, setSchemaName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getUser();
        if (!user) throw new Error('User session not found');
        const schema = `user_${user.id}`;
        setSchemaName(schema);
        console.log("Schema Name:", schema);
      } catch (error) {
        console.error(error);
      }
    };
    fetchUser();
  }, []);

  // Fetch available tables from the /api/tables endpoint
  useEffect(() => {
    async function fetchTables() {
      try {
        const res = await fetch("/api/tables");
        if (!res.ok) {
          throw new Error("Failed to fetch tables");
        }
        const data = await res.json();
        console.log(data); // Inspect the returned data
        setAvailableTables(data);
        // Default to "All" if tables exist
        setSelectedTables(data.length > 0 ? ["All"] : []);
      } catch (error) {
        console.error("Error fetching tables:", error);
      }
    }
    fetchTables();
  }, []);

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

  const context2 = `The table schema is as follows: unicorns (id SERIAL PRIMARY KEY,
      company VARCHAR(255) NOT NULL UNIQUE,
      valuation DECIMAL(10, 2) NOT NULL,
      date_joined DATE,
      country VARCHAR(255) NOT NULL,
      city VARCHAR(255) NOT NULL,
      industry VARCHAR(255) NOT NULL,
      select_investors TEXT NOT NULL
      );`;

  const handleSubmit = async (suggestion?: string) => {
    const question = suggestion ?? inputValue;
    if (question.trim().length === 0) return;
    clearExistingData();
    setSubmitted(true);
    setLoading(true);
    setLoadingStep(1);
    setActiveQuery("");
    try {

      const concatenatedTables = useMemo(() => {
        if (selectedTables.includes("All")) {
          return availableTables.join(", ");
        }
        return selectedTables.join(", ");
      }, [selectedTables, availableTables]);

      // Pass selectedTables to restrict query scope
      const query = await generateQuery(question, context2, "testagain_csv");
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
                        // Or, alternatively, use:
                        // <ViewData data={results} columns={columns} />
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