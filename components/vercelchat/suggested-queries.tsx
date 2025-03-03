import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

// Default list of static queries
const defaultQuestions = [
  {
    desktop: "Compare count of unicorns in SF and NY over time",
    mobile: "SF vs NY",
  },
  {
    desktop: "Compare unicorn valuations in the US vs China over time",
    mobile: "US vs China",
  },
  {
    desktop: "Countries with highest unicorn density",
    mobile: "Top countries",
  },
  {
    desktop: "Show the number of unicorns founded each year over the past two decades",
    mobile: "Yearly count",
  },
  {
    desktop: "Display the cumulative total valuation of unicorns over time",
    mobile: "Total value",
  },
  {
    desktop: "Compare the yearly funding amounts for fintech vs healthtech unicorns",
    mobile: "Fintech vs health",
  },
  {
    desktop: "Which cities have the most SaaS unicorns",
    mobile: "SaaS cities",
  },
  {
    desktop: "Show the countries with the highest unicorn density",
    mobile: "Dense nations",
  },
  {
    desktop: "Show the number of unicorns (grouped by year) over the past decade",
    mobile: "Decade trend",
  },
  {
    desktop: "Compare the average valuation of AI companies vs. biotech companies",
    mobile: "AI vs biotech",
  },
  {
    desktop: "Investors with the most unicorns",
    mobile: "Top investors",
  },
];

export const SuggestedQueries = ({
  handleSuggestionClick,
  schemaName,
}: {
  handleSuggestionClick: (suggestion: string) => void;
  schemaName?: string;
}) => {
  const [websiteQuestions, setWebsiteQuestions] = useState<string[]>([]);
  const [mobileQuestions, setMobileQuestions] = useState<string[]>([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`/api/questions`);
        const data = await response.json();
        console.log("API Response:", data); // Log the response for debugging

        // Directly use fetched data
        setWebsiteQuestions(data.websiteQuestions);
        setMobileQuestions(data.mobileQuestions);
      } catch (error) {
        console.error("Error fetching questions:", error);
        // Fallback to default questions in case of error
        setWebsiteQuestions(defaultQuestions.map((item) => item.desktop));
        setMobileQuestions(defaultQuestions.map((item) => item.mobile));
      }
    };

    fetchQuestions();
  }, [schemaName]);

  return (
    <motion.div
      key="suggestions"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      layout
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto"
    >
      <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
        Try these queries:
      </h2>
      <div className="flex flex-wrap gap-2">
        {websiteQuestions.map((question, index) => (
          <Button
            key={`website-${index}`}
            className={index > 5 ? "hidden sm:inline-block" : ""}
            type="button"
            variant="outline"
            onClick={() => handleSuggestionClick(question)}
          >
            <span className="sm:hidden">{mobileQuestions[index]}</span>
            <span className="hidden sm:inline">{question}</span>
          </Button>
        ))}
      </div>
    </motion.div>
  );
};
