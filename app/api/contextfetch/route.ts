import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getUser } from "@/lib/db/queries";

// Initialize the PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.NEXT_PUBLIC_POSTGRES_URL,
});

export async function POST(request: NextRequest) {
  try {
    // Retrieve the authenticated user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Define the user's schema name dynamically
    const schemaName = `user_${user.id}`;

    // Parse the request body for schemaName and tableNames
    const { tableNames } = await request.json();

    if (!tableNames || !Array.isArray(tableNames) || tableNames.length === 0) {
      return NextResponse.json({ error: "Table names are required" }, { status: 400 });
    }


    // Function to fetch context columns from the "library" table for a given user
    const fetchContextColumns = async (tableName: string): Promise<string[]> => {
      try {
        // Fetch context from the 'library' table where the table_name matches the provided tableName
        const query = `
          SELECT context
          FROM ${schemaName}.library
          WHERE table_name = $1
        `;
        const { rows } = await pool.query(query, [tableName]);

        // If rows are found, return the context values, otherwise return an empty array
        if (rows.length > 0) {
          return rows.map(row => row.context);
        }

        // Return an empty array if no context is found for the given tableName
        return [];
      } catch (error) {
        console.error(`Error fetching context columns for ${tableName}:`, error);
        return [];
      }
    };

    // Fetch context columns for all selected tables and return them as an array
    let allColumns: string[] = [];
    for (const tableName of tableNames) {
      // Skip invalid table names or "All" if it's not an actual table
      if (tableName === "All" || !tableName) continue;

      const contextColumns = await fetchContextColumns(tableName);
      if (contextColumns.length > 0) {
        // Prepend the table name to each context column value
        const tableContext = contextColumns.map(
          column => `Context for the "${tableName}" is ${column}`
          
        );
        allColumns = [...allColumns, ...tableContext];
      }
    }

    // Return the concatenated columns as an array
    return NextResponse.json({ columns: allColumns });

  } catch (error) {
    console.error("Error fetching context columns:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
