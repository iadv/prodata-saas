import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getUser } from "@/lib/db/queries"; // Import getUser function

// Initialize the PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.NEXT_PUBLIC_POSTGRES_URL,
});

export async function GET(request: NextRequest) {
  try {
    // Retrieve the authenticated user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Define the user's schema name dynamically
    const schemaName = `user_${user.id}`;

    // Query to fetch table names from the user's schema
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      AND table_type = 'BASE TABLE'
    `;

    // Execute the query
    const { rows } = await pool.query(query, [schemaName]);

    // Extract table names from the query result
    const tableNames = rows.map((row) => row.table_name);

    // Return the tables array in the expected format
    return NextResponse.json({ tables: tableNames });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
