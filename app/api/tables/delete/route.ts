import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getUser } from "@/lib/db/queries";

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { tableName } = body;

    if (!tableName) {
      return new NextResponse("Table name is required", { status: 400 });
    }

    console.log("Attempting to delete table:", tableName);

    // Verify table exists and is not a system table
    const systemTables = ["library", "historical", "chatbot_historical", "messages", "conversations"];
    if (systemTables.includes(tableName.toLowerCase())) {
      console.log("Attempted to delete system table:", tableName);
      return new NextResponse("Cannot delete system tables", { status: 400 });
    }

    // Check if table exists with case-insensitive check
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND lower(table_name) = lower(${tableName});
    `;

    console.log("Table check result:", tableCheck.rows);

    if (tableCheck.rows.length === 0) {
      console.log("Table does not exist:", tableName);
      return new NextResponse("Table does not exist", { status: 404 });
    }

    // Use the actual table name from the database to ensure correct case
    const actualTableName = tableCheck.rows[0].table_name;
    console.log("Found table with actual name:", actualTableName);

    // Drop the table using dynamic SQL with proper error handling
    try {
      // Use the actual table name from the database
      await sql.query(`DROP TABLE IF EXISTS "${actualTableName}" CASCADE;`);
      console.log("Table deleted successfully:", actualTableName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Error dropping table:", errorMessage);
      return new NextResponse(`Failed to drop table: ${errorMessage}`, { status: 500 });
    }

    return NextResponse.json({ message: "Table deleted successfully" });
  } catch (error) {
    console.error("Error in delete table endpoint:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Server Error", 
      { status: 500 }
    );
  }
} 