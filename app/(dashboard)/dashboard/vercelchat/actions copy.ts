// Define the ColumnInfo interface
interface ColumnInfo {
  originalName: string;
  name: string;
  type: string;
  nullable: boolean;
}

"use server";

import { NextResponse } from "next/server"; // Import NextResponse
import { Config, configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";
import { generateObject } from "ai";
import { z } from "zod";
import { getUser } from "@/lib/db/queries"; // Import getUser function

export const generateQuery = async (
  input: string,
  context1: string,
  selectedTables: string,
  rowsobj: any // Adding rowsobj parameter
) => {
  "use server";
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

export const runGenerateSQLQuery = async (query: string) => {
  "use server";
  // Check if the query is a SELECT statement
  if (
    !query.trim().toLowerCase().startsWith("select") ||
    query.trim().toLowerCase().includes("drop") ||
    query.trim().toLowerCase().includes("delete") ||
    query.trim().toLowerCase().includes("insert") ||
    query.trim().toLowerCase().includes("update") ||
    query.trim().toLowerCase().includes("alter") ||
    query.trim().toLowerCase().includes("truncate") ||
    query.trim().toLowerCase().includes("create") ||
    query.trim().toLowerCase().includes("grant") ||
    query.trim().toLowerCase().includes("revoke")
  ) {
    throw new Error("Only SELECT queries are allowed");
  }

  let data: any;
  try {
    data = await sql.query(query);
  } catch (e: any) {
    if (e.message.includes('relation "unicorns" does not exist')) {
      console.log(
        "Table does not exist, creating and seeding it with dummy data now...",
      );
      // throw error
      throw Error("Table does not exist");
    } else {
      throw e;
    }
  }

  return data.rows as Result[];
};

export const explainQuery = async (input: string, sqlQuery: string) => {
  "use server";
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        explanations: explanationsSchema,
      }),
      system: `You are a SQL (postgres) expert. Your job is to explain to the user write a SQL query you wrote to retrieve the data they asked for. The table schema is as follows:
    unicorns (
      id SERIAL PRIMARY KEY,
      company VARCHAR(255) NOT NULL UNIQUE,
      valuation DECIMAL(10, 2) NOT NULL,
      date_joined DATE,
      country VARCHAR(255) NOT NULL,
      city VARCHAR(255) NOT NULL,
      industry VARCHAR(255) NOT NULL,
      select_investors TEXT NOT NULL
    );

    When you explain you must take a section of the query, and then explain it. Each "section" should be unique. So in a query like: "SELECT * FROM unicorns limit 20", the sections could be "SELECT *", "FROM UNICORNS", "LIMIT 20".
    If a section doesnt have any explanation, include it, but leave the explanation empty.

    `,
      prompt: `Explain the SQL query you generated to retrieve the data the user wanted. Assume the user is not an expert in SQL. Break down the query into steps. Be concise.

      User Query:
      ${input}

      Generated SQL Query:
      ${sqlQuery}`,
    });
    return result.object;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to generate query");
  }
};

export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
) => {
  "use server";
  const system = `You are a data visualization expert. `;

  try {
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
      ${JSON.stringify(results, null, 2)}`,
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

// Defining the function in the same way as `generateQuery`
export const generateContext = async (columns: ColumnInfo[]): Promise<string> => {
  try {
    const columnNames = columns.map(col => col.name).join(", ");
    const prompt = `You are an AI expert helping to generate context for a table. The table contains the following columns: ${columnNames}. Mention what data each column contains. Also, Based on these column names, provide a brief context (less than 5 sentences) about what this table represents, and offer guidelines for someone analyzing the data. Ensure your explanation provides clarity and includes recommendations on how to handle string fields, missing values, and any other relevant considerations for analysis.
    Also, include a table schema similar to the example provided here based on the ${columnNames}. The example table schema is as follows where uniforns is name of the table:

      unicorns (
      id SERIAL PRIMARY KEY,
      company VARCHAR(255) NOT NULL UNIQUE,
      valuation DECIMAL(10, 2) NOT NULL,
      date_joined DATE,
      country VARCHAR(255) NOT NULL,
      city VARCHAR(255) NOT NULL,
      industry VARCHAR(255) NOT NULL,
      select_investors TEXT NOT NULL
    );
      
      `;

    const result = await generateObject({
      model: openai("gpt-4o"),
      prompt: prompt,
      schema: z.object({
        context: z.string(),
      }),
    });

    return result.object.context;
  } catch (error) {
    console.error("Error generating context:", error);
    return "Context generation failed.";
  }
};

export const generateSampleQuestions = async (columns: ColumnInfo[]): Promise<string[]> => {
  try {
    // Extract column names to pass in the prompt
    const columnNames = columns.map(col => col.name).join(", ");
    
    // Prompt the AI to generate questions based on the column names
    const prompt = `Generate five sample natural language questions a customer might ask about the following table. The table has the following columns: ${columnNames}. Keep each question short and concise (less than 10 words), and ensure that the questions provide an idea of the type of questions the user can ask.`;

    const result = await generateObject({
      model: openai("gpt-4o"),
      prompt: prompt,
      schema: z.object({
        questions: z.array(z.string()),
      }),
    });

    return result.object.questions; // This will return an array of 5 questions
  } catch (error) {
    console.error("Error generating sample questions for website UI:", error);
    return ["Sample question generation for website UI failed."];
  }
};

export const generateSampleQuestions_mobile = async (columns: ColumnInfo[]): Promise<string[]> => {
  try {
    // Extract column names to pass in the prompt
    const columnNames = columns.map(col => col.name).join(", ");
    
    // Prompt the AI to generate questions based on the column names
    const prompt = `Generate five sample natural language questions a customer might ask about the following table. The table has the following columns: ${columnNames}. This will be for a mobile UI experience. Keep each question to less than 3 words. Be creative for example use abbrevations like vs. if needed. Ensure that the questions provide an idea of the type of questions the user can ask.`;

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

