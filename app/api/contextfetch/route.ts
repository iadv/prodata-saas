import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getUser } from "@/lib/db/queries";

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

interface TableColumns {
  [tableName: string]: ColumnInfo[];
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Define the user's schema name dynamically
    const schemaName = `user_${user.id}`;

    // Get table names from request body
    const { tableNames } = await request.json();
    if (!tableNames || !Array.isArray(tableNames) || tableNames.length === 0) {
      return NextResponse.json({ error: "Table names are required" }, { status: 400 });
    }

    // Fetch column information for each table
    const columnPromises = tableNames.map(async (tableName) => {
      const result = await sql`
        SELECT 
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = ${schemaName}
        AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `;

      return {
        tableName,
        columns: result.rows.map(row => ({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES'
        }))
      };
    });

    const results = await Promise.all(columnPromises);

    // Format the response
    const response: TableColumns = results.reduce((acc, { tableName, columns }) => {
      acc[tableName] = columns;
      return acc;
    }, {} as TableColumns);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching column information:", error);
    return NextResponse.json(
      { error: "Failed to fetch column information" },
      { status: 500 }
    );
  }
}
