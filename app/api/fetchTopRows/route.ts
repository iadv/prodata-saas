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
    
    // Parse the request body for table names
    const { tables, limit = 5 } = await request.json();

    // If no tables are provided, return a 400 error
    if (!tables || tables.length === 0) {
      return NextResponse.json({ error: "Table names are required" }, { status: 400 });
    }

    // Ensure that 'tables' is an array
    if (!Array.isArray(tables)) {
      return NextResponse.json({ error: "'tables' should be an array" }, { status: 400 });
    }

    // Function to fetch the top rows from the given table
    const fetchTopRows = async (table: string, schema: string, limit: number) => {
      try {
        const query = `
          SELECT * 
          FROM ${schema}.${table} 
          LIMIT $1;
        `;
        
        const { rows } = await pool.query(query, [limit]);
        return rows;
      } catch (error) {
        console.error(`Error fetching top rows for ${schema}.${table}:`, error);
        throw new Error(`Error fetching rows from table: ${schema}.${table}`);
      }
    };

    // Fetch top rows for the specified tables
    const rowsPromises = tables.map((table: string) => fetchTopRows(table, schemaName, limit));

    // Wait for all promises to resolve
    const selectedTableRows = await Promise.all(rowsPromises);

    // Combine results into a single object with table names as keys
    const rowsObj = selectedTableRows.reduce<{ [key: string]: any[] }>((acc, rows, index) => {
      const table = tables[index];
      acc[table] = rows;
      return acc;
    }, {});

    return NextResponse.json({ rows: rowsObj });
  } catch (error) {
    console.error("Error fetching top rows:", error);
    return NextResponse.json(
      { error: "Failed to fetch table rows" },
      { status: 500 }
    );
  }
}
