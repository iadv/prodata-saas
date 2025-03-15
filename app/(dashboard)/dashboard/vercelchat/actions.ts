"use server";

import { NextResponse } from "next/server"; // Import NextResponse
import { Config, configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from "@ai-sdk/openai";
import { sql } from "@vercel/postgres";
import { generateObject } from "ai";
import { z } from "zod";
import { getUser } from "@/lib/db/queries"; // Import getUser function

// Define the ColumnInfo interface
interface ColumnInfo {
  originalName: string;
  name: string;
  type: string;
  nullable: boolean;
}

export const generateQuery = async (
  input: string,
  context1: string,
  selectedTables: string,
  rowsobj: any // This now contains data for all selected tables, including when "All" is selected
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

    // Create a more detailed structure of the tables and their columns from sample data
    let tableStructure = "Available tables and columns:\n";
    for (const tableName in rowsobj) {
      if (rowsobj[tableName] && rowsobj[tableName].length > 0) {
        const sampleRow = rowsobj[tableName][0];
        const columnNames = Object.keys(sampleRow);
        
        tableStructure += `Table: ${tableName}\n`;
        tableStructure += `Columns: ${columnNames.join(", ")}\n`;
        
        // Add sample data for the first row
        tableStructure += "Sample values:\n";
        for (const column of columnNames) {
          tableStructure += `  ${column}: ${sampleRow[column]}\n`;
        }
        tableStructure += "\n";
      }
    }

    // Log for debugging
    console.log("Table structure for query generation:", tableStructure);

    const result = await generateObject({
      model: openai("gpt-4o"),
      
      system: `You are a SQL (PostgreSQL) and data visualization expert. Your task is to assist the user in writing SQL queries to retrieve the data they need. The user is operating within the schema: ${schemaName}.

      CRITICALLY IMPORTANT RULES:
      1. ALWAYS qualify table names with the schema name. For example, use "${schemaName}.tablename" NOT just "tablename".
      2. Only write retrieval (SELECT) queries - no data modification.
      3. For string fields, use the ILIKE operator and convert both the search term and the field to lowercase using the LOWER() function.
      4. Ensure every query returns quantitative data suitable for charting (at least two columns).
      5. When calculating rates, return them as decimals (e.g., 0.1 represents 10%).
      6. When aggregating over time, use the appropriate time units based on the data.
      7. CAREFULLY CHECK that you are using ACTUAL column names from the tables - DO NOT invent column names.
      8. VERIFY that your queries only reference columns that actually exist in the tables.
      9. DOUBLE-CHECK every table and column name in your final query before returning it.`,
  
      prompt: `Generate a PostgreSQL query to answer: "${input}"

      DATABASE STRUCTURE:
      ${tableStructure}
      
      Additional schema information:
      ${context1}
      
      IMPORTANT REQUIREMENTS:
      1. Make sure to qualify all table names with the schema name "${schemaName}" (e.g., "${schemaName}.tablename")
      2. Only use columns that actually exist in the tables
      3. The query must return at least two columns of data
      4. If aggregating by time, use appropriate time intervals
      5. For calculations, return values as decimals (not percentages)
      
      Please provide a valid SQL query that correctly references the available tables and columns.`,
      
      schema: z.object({
        query: z.string(),
      }),
    });
    
    // Additional validation to ensure schema qualification
    let query = result.object.query;
    
    // Simple heuristic: If the query doesn't contain the schema name anywhere, it's likely missing schema qualification
    if (!query.includes(schemaName)) {
      console.log("Query missing schema qualification. Adding schema prefix to tables.");
      
      // Get table names from the rowsobj
      const tableNames = Object.keys(rowsobj);
      
      // For each table, check if it appears in the query without schema qualification
      tableNames.forEach(tableName => {
        if (tableName && tableName.trim() !== "") {
          // Look for the table name at word boundaries, preceded by a space, FROM, or JOIN
          const tablePattern = new RegExp(`(FROM|JOIN)\\s+(${tableName})\\b`, 'gi');
          
          // Replace with schema-qualified name
          query = query.replace(tablePattern, `$1 ${schemaName}.$2`);
        }
      });
    }
    
    return query;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to generate query");
  }
};

export const runGenerateSQLQuery = async (query: string) => {
  "use server";
  // Get user to determine schema
  const user = await getUser();
  const schemaName = user ? `user_${user.id}` : '';
  
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
    // Additional safety check to ensure schema is present
    if (schemaName && !query.includes(schemaName)) {
      console.warn("Query may be missing schema qualification. Proceeding but this could cause errors.");
    }
    
    console.log("Executing SQL query:", query);
    data = await sql.query(query);
  } catch (e: any) {
    console.error("SQL Error:", e);
    
    // More specific error message for column not found
    if (e.message.includes('column') && e.message.includes('does not exist')) {
      throw new Error(`Column not found: ${e.message}`);
    }
    // Handle error related to missing tables or schema qualification
    else if (e.message.includes('relation') && e.message.includes('does not exist')) {
      throw new Error(`Table not found: ${e.message}`);
    } else {
      throw e;
    }
  }

  return data.rows as Result[];
};

export const detectQueryIntent = async (
  input: string,
  context1: string,
  selectedTables: string,
  rowsobj: any,
  chatHistory: any[] = []
) => {
  "use server";
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      
      system: `You are an AI assistant specialized in analyzing user queries to determine if they require database querying or conversational responses. 

      When a user's query explicitly or implicitly requests data retrieval, analysis, or visualization that requires database access, classify it as a DATABASE_QUERY.
      
      When a user is asking general questions, seeking explanations, or engaging in conversation that doesn't require querying a database, classify it as a CONVERSATION.
      
      Always analyze the user's intent carefully before making a determination.`,
  
      prompt: `Determine whether the following user query requires a database lookup (DATABASE_QUERY) or is simply a conversational question (CONVERSATION).
      
      User query: "${input}"
      
      Available tables and their contents:
      Tables: ${selectedTables}
      Column information: ${context1}
      
      Recent conversation history:
      ${JSON.stringify(chatHistory, null, 2)}
      
      Analyze the query and determine the appropriate classification.`,
      
      schema: z.object({
        intent: z.enum(["DATABASE_QUERY", "CONVERSATION"]),
        explanation: z.string(),
      }),
    });
    
    return result.object;
  } catch (e) {
    console.error(e);
    // Default to DATABASE_QUERY if we can't determine intent
    return { intent: "DATABASE_QUERY", explanation: "Failed to determine intent, defaulting to database query." };
  }
};
export const generateConversation = async (
  input: string,
  context1: string,
  selectedTables: string,
  rowsobj: any,
  chatHistory: any[] = []
) => {
  "use server";
  
  console.log("Starting conversation generation for input:", input);
  
  try {
    // User info might be useful for personalization
    const user = await getUser();
    
    const promptData = {
      userMessage: input,
      tables: selectedTables,
      tableInfo: context1,
      recentHistory: chatHistory
    };
    
    console.log("Sending conversation prompt with data:", JSON.stringify(promptData, null, 2).substring(0, 200) + "...");
    
    const result = await generateObject({
      model: openai("gpt-4o"),
      
      system: `You are a helpful assistant with expertise in data analysis and SQL. Your primary role is to assist users with their data-related questions and provide conversational responses when database queries aren't required.
      
      When responding:
      - Be concise but thorough in your explanations
      - Use a professional, friendly tone
      - Provide helpful information based on the available context
      - If you need to refer to available data, mention it but don't fabricate specific data points
      - If the user would be better served by a database query, suggest they rephrase their question to ask for specific data
      
      For general questions unrelated to the database, provide friendly, helpful responses just as you would in any conversation.`,
  
      prompt: `Respond conversationally to the user's message. If the question is about general topics not related to data, just answer naturally as a helpful assistant would.
      
      User message: "${input}"
      
      Available tables and their contents (only relevant for data questions):
      Tables: ${selectedTables}
      Column information: ${context1 ? context1.substring(0, 500) : "No specific column information available"}
      
      Recent conversation history:
      ${JSON.stringify(chatHistory, null, 2)}
      
      Provide a helpful, conversational response.`,
      
      schema: z.object({
        response: z.string(),
      }),
    });
    
    console.log("Conversation response generated successfully");
    
    if (!result || !result.object || !result.object.response) {
      console.warn("Empty result from conversation generation");
      return "I'm not sure how to answer that. Could you try asking something else?";
    }
    
    return result.object.response;
  } catch (e) {
    console.error("Error in generateConversation:", e);
    // Provide a more helpful fallback message
    return "I can help answer general questions as well as questions about your data. What would you like to know?";
  }
};

export const explainQuery = async (input: string, sqlQuery: string) => {
  "use server";
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        explanations: explanationsSchema,
      }),
      system: `You are a SQL (PostgreSQL) expert. Your job is to explain to the user the SQL query generated to retrieve the data they asked for.
      
      When you explain you must take a section of the query, and then explain it. Each "section" should be unique. For example, in a query like: "SELECT * FROM schema.table limit 20", the sections could be "SELECT *", "FROM schema.table", "LIMIT 20".
      
      If a section doesn't have any explanation, include it, but leave the explanation empty.
      
      Highlight the importance of schema qualification in PostgreSQL, explaining that it indicates which database schema the table belongs to.`,
      
      prompt: `Explain the SQL query generated to retrieve the data the user wanted. Assume the user is not an expert in SQL. Break down the query into steps. Be concise.

      User Query:
      ${input}

      Generated SQL Query:
      ${sqlQuery}`,
    });
    return result.object;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to generate query explanation");
  }
};

export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
) => {
  "use server";
  const system = `You are a data visualization expert.`;

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