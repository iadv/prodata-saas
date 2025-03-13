type QueryExplanation1 = {
  section: string;
  explanation: string;
};


// Define the ColumnInfo interface
interface ColumnInfo {
  originalName: string;
  name: string;
  type: string;
  nullable: boolean;
};

"use server";

import { NextResponse } from "next/server";
import { Config, configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";
import { generateObject } from "ai";
import { z } from "zod";
import { getUser } from "@/lib/db/queries";

// Utility function to create schema name
const getSchemaName = async (): Promise<string> => {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return `user_${user.id}`;
};

// Utility function to generate SQL query
const createSqlQuery = (input: string, context: string, selectedTables: string, exampleData: any): string => {
  return `Generate the SQL query to retrieve data based on the user's input: "${input}". The schema includes tables: ${selectedTables}. Table descriptions: ${context}. Example data: ${JSON.stringify(exampleData)}`;
};

// Function to generate SQL query
export const generateQuery = async (
  input: string,
  context1: string,
  selectedTables: string,
  rowsobj: any // Adding rowsobj parameter
) => {
  try {

    // Retrieve the authenticated user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Define the user's schema name dynamically
    const schemaName = `user_${user.id}`;

    const result = await generateObject({
      model: openai("gpt-4o"),
      
      system: `You are a SQL (PostgreSQL) and data visualization expert. Your task is to assist the user in writing SQL queries to retrieve the data they need. The user is operating within the schema: ${schemaName}.

      Only retrieval (SELECT) queries are allowed.
  
      For string fields, use the ILIKE operator and convert both the search term and the field to lowercase using the LOWER() function. For example: LOWER(field_name) ILIKE LOWER('%search_term%').
  
      Ensure that every query returns quantitative data suitable for charting, with at least two columns. If the user requests a single column, return that column along with its count. When calculating rates, return them as decimals (e.g., 0.1 represents 10%).
  
      If the user requests 'over time' data, aggregate the results based on the units used in the tables. For example, if the table contains monthly data, aggregate the results by month.

      After generating the query make sure the column names existing in the selected tables and the table names are correct. If they are not, regenerate the query.`,
  
      // EVERY QUERY SHOULD RETURN QUANTITATIVE DATA THAT CAN BE PLOTTED ON A CHART! There should always be at least two columns. If the user asks for a single column, return the column and the count of the column. If the user asks for a rate, return the rate as a decimal. For example, 0.1 would be 10%
  
      // const prompt = `Generate the SQL query necessary to retrieve the data the user wants: ${input}`,

      prompt: `Generate the query necessary to retrieve the data the user wants from this natual language prompt: ${input}. The schema contains the following tables: ${selectedTables}. Description about the tables and the table headers are as follows: ${context1}. Example data (rowsobj) from the tables: ${JSON.stringify(rowsobj, null, 2)}`,
      schema: z.object({
        query: z.string(),
      }),
    });
    return result.object.query;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to generate query");
  }
};

// Function to run SQL query
export const runGenerateSQLQuery = async (query: string) => {
  if (!query.trim().toLowerCase().startsWith("select")) {
    throw new Error("Only SELECT queries are allowed");
  }

  try {
    const data = await sql.query(query);
    return data.rows;
  } catch (e) {
    console.error("Error executing query:", e);
    throw new Error("Failed to execute query");
  }
};

// Function to explain SQL query
export const explainQuery = async (input: string, sqlQuery: string): Promise<QueryExplanation1[]> => {
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      system: "You are a SQL (PostgreSQL) expert. Explain the SQL query in simple terms.",
      prompt: `Explain the SQL query: "${sqlQuery}" generated to retrieve data based on the user's input: "${input}".`,
      schema: z.object({
        explanations: z.array(z.string()),
      }),
    });

    // Assuming each explanation should be wrapped in a section object.
    return result.object.explanations.map((explanation: string, index: number) => ({
      section: `Section ${index + 1}`, // You can customize how you generate the section name
      explanation,
    }));
  } catch (e) {
    console.error("Error explaining query:", e);
    throw new Error("Failed to explain query");
  }
};


export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
) => {
  "use server";
  const system = `You are a data visualization expert. `;

  try {
    // Nested function to limit the size of the JSON array
    const limitJsonArraySize = (data: any[], maxRows: number = 50): any[] => {
      return data.slice(0, maxRows);
    };

    // Limit the results to the maximum number of rows
    const limitedResults = limitJsonArraySize(results);

    const { object: config } = await generateObject({
      model: openai("gpt-4o"),
      system,
      prompt: `Given the following data from a SQL query result, generate the chart config that best visualises the data and answers the users query.
      For multiple groups use multi-lines.

      Here is an example complete config:
      export const chartConfig = {
        type: "pie",
        xKey: "month",
        yKeys: ["sales", "profit", "expenses"],
        colors: {
          sales: "#4CAF50",    // Green for sales
          profit: "#2196F3",   // Blue for profit
          expenses: "#F44336"  // Red for expenses
        },
        legend: true
      }

      User Query:
      ${userQuery}

      Data:
      ${JSON.stringify(limitedResults, null, 2)}`,
      schema: configSchema,
    });

    const colors: Record<string, string> = {};
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${index + 1}))`;
    });

    const updatedConfig: Config = { ...config, colors };
    return { config: updatedConfig };
  } catch (e) {
    // @ts-expect-errore
    console.error(e.message);
    throw new Error("Failed to generate chart suggestion");
  }
};

// Function to generate table context
export const generateContext = async (columns: ColumnInfo[]): Promise<string> => {
  try {
    const columnNames = columns.map(col => col.name).join(", ");
    const prompt = `Describe the table with columns: ${columnNames}. Provide data descriptions and analysis guidelines.`;

    const result = await generateObject({
      model: openai("gpt-4o"),
      prompt: prompt,
      schema: z.object({
        context: z.string(),
      }),
    });

    return result.object.context;
  } catch (e) {
    console.error("Error generating context:", e);
    throw new Error("Failed to generate context");
  }
};

// Function to generate sample questions
export const generateSampleQuestions = async (columns: ColumnInfo[]): Promise<string[]> => {
  try {
    const columnNames = columns.map(col => col.name).join(", ");
    const prompt = `Generate five sample questions based on the table with columns: ${columnNames}.`;

    const result = await generateObject({
      model: openai("gpt-4o"),
      prompt: prompt,
      schema: z.object({
        questions: z.array(z.string()),
      }),
    });

    return result.object.questions;
  } catch (e) {
    console.error("Error generating sample questions:", e);
    throw new Error("Failed to generate sample questions");
  }
};

export const generateSampleQuestions_mobile = async (columns: ColumnInfo[]): Promise<string[]> => {
  try {
    // Extract column names to pass in the prompt
    const columnNames = columns.map(col => col.name).join(", ");
    
    // Prompt the AI to generate questions based on the column names
    const prompt = `Generate five sample natural language questions a customer might ask about the following table. The table has the following columns: ${columnNames}. This will be for a mobile UI experience. Keep each question to less than 3 words. Be creative, using abbreviations like 'vs.' if needed. Ensure that the questions provide an idea of the type of questions the user can ask.`;

    const result = await generateObject({
      model: openai("gpt-4o"),
      prompt: prompt,
      schema: z.object({
        questions: z.array(z.string()),
      }),
    });

    return result.object.questions; // This will return an array of 5 questions
  } catch (error) {
    console.error("Error generating sample questions for mobile UI:", error);
    return ["Sample question generation for mobile UI failed."];
  }
};
