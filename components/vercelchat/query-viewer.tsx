import { useState } from "react";
import { Button } from "./ui/button";
import { QueryWithTooltips } from "./ui/query-with-tooltips";
import { explainQuery } from "@/app/(dashboard)/dashboard/vercelchat/actions";
import { CircleHelp, Loader2 } from "lucide-react";

type QueryExplanation1 = {
  section: string;
  explanation: string;
};

export const QueryViewer = ({
  activeQuery,
  inputValue,
}: {
  activeQuery: string;
  inputValue: string;
}) => {
  const activeQueryCutoff = 100;

  const [queryExplanations, setQueryExplanations] = useState<QueryExplanation1[] | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [queryExpanded, setQueryExpanded] = useState(activeQuery.length > activeQueryCutoff);

  const handleExplainQuery = async () => {
    setQueryExpanded(true);
    setLoadingExplanation(true);
    
    try {
      const response = await explainQuery(inputValue, activeQuery);
      
      // Fix the type mismatch - extract explanations array from the response
      if (response && 'explanations' in response && Array.isArray(response.explanations)) {
        // The response has an explanations property that is an array
        setQueryExplanations(response.explanations);
      } else if (Array.isArray(response)) {
        // The response is already an array
        setQueryExplanations(response);
      } else {
        // Handle unexpected response format
        console.error("Unexpected response format from explainQuery:", response);
        setQueryExplanations(null);
      }
    } catch (error) {
      console.error("Error explaining query:", error);
      setQueryExplanations(null);
    } finally {
      setLoadingExplanation(false);
    }
  };

  if (activeQuery.length === 0) return null;

  return (
    <div className="mb-4 relative group">
      <div
        className={`bg-muted rounded-md p-4 ${queryExpanded ? "" : "text-muted-foreground"}`}
      >
        <div className="font-mono text-sm">
          {queryExpanded ? (
            queryExplanations && queryExplanations.length > 0 ? (
              <>
                <QueryWithTooltips
                  query={activeQuery}
                  queryExplanations={queryExplanations}
                />
                <p className="font-sans mt-4 text-base">
                  Generated explanation! Hover over different parts of the SQL
                  query to see explanations.
                </p>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="">{activeQuery}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExplainQuery}
                  className="h-fit hover:text-muted-foreground hidden sm:inline-block"
                  aria-label="Explain query"
                  disabled={loadingExplanation}
                >
                  {loadingExplanation ? (
                    <Loader2 className="h-10 w-10 p-2 animate-spin " />
                  ) : (
                    <CircleHelp className="h-10 w-10 p-2 " />
                  )}
                </Button>
              </div>
            )
          ) : (
            <span>
              {activeQuery.slice(0, activeQueryCutoff)}
              {activeQuery.length > activeQueryCutoff ? "..." : ""}
            </span>
          )}
        </div>
      </div>
      {!queryExpanded && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setQueryExpanded(true)}
          className="absolute inset-0 h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"
        >
          Show full query
        </Button>
      )}
    </div>
  );
};