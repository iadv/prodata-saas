import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getUser } from "@/lib/db/queries";

// Initialize the PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.NEXT_PUBLIC_POSTGRES_URL, // Use the same connection string as your other API
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
    const { tables, limit } = await request.json();

    // If no tables are provided, return a 400 error
    if (!tables || tables.length === 0) {
      return NextResponse.json({ error: "Table names are required" }, { status: 400 });
    }

    // Ensure that 'tables' is an array
    if (!Array.isArray(tables)) {
      return NextResponse.json({ error: "'tables' should be an array" }, { status: 400 });
    }

    console.log("Received request body:", { tables, limit });

    // Function to fetch the top rows from the given table, skipping the last column
    const fetchTopRows = async (table: string, schema: string, limit: number) => {
      try {
        // Query to count the number of columns in the table
        const countQuery = `
          SELECT COUNT(*) 
          FROM information_schema.columns 
          WHERE table_schema = $1 AND table_name = $2;
        `;
        const countResult = await pool.query(countQuery, [schema, table]);
        const numColumns = parseInt(countResult.rows[0].count, 10);

        // Construct the query to select all columns except the last one
        const query = `
          SELECT * 
          FROM ${schema}.${table} 
          LIMIT $1;
        `;
        
        // Fetch rows from the table
        const { rows, fields } = await pool.query(query, [limit]);

        // Skip the last column dynamically by using the field names from the query result
        const lastColumnName = fields[fields.length - 1]?.name; // Get the last column name
        const resultRows = rows.map(row => {
          const rowCopy = { ...row };
          delete rowCopy[lastColumnName]; // Remove the last column dynamically by its name
          return rowCopy;
        });

        return resultRows;
      } catch (error:any) {
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

    // Return the rows or an empty object if no rows were found
    return NextResponse.json({ rows: rowsObj });

  } catch (error:any) {
    console.error("Error fetching top rows:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
