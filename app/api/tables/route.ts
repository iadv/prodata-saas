import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getUser } from "@/lib/db/queries";

// GET method for listing tables
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Define user's schema
    const userSchema = `user_${user.id}`;

    // Query to fetch table names from the user's schema
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${userSchema}
      AND table_type = 'BASE TABLE'
    `;

    // Extract table names and filter out system tables
    const systemTables = [
      "library",
      "historical",
      "chatbot_historical",
      "messages",
      "conversations",
      "users",
      "sessions",
      "report_history",
      "verificationtokens",
      "accounts",
      "_prisma_migrations",
      "teams",
      "activity_logs",
      "invitations",
      "team_members",
      "results_table"
    ];
    const tableNames = result.rows
      .map(row => row.table_name)
      .filter(name => !systemTables.includes(name.toLowerCase()));

    return NextResponse.json({ tables: tableNames });
  } catch (error) {
    console.error("Error fetching tables:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE method for deleting tables
export async function DELETE(req: Request) {
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

    // Define user's schema
    const userSchema = `user_${user.id}`;

    console.log("Attempting to delete table:", tableName, "in schema:", userSchema);

    // Verify table exists and is not a system table
    const systemTables = [
      "library",
      "historical",
      "chatbot_historical",
      "messages",
      "conversations",
      "users",
      "sessions",
      "report_history",
      "verificationtokens",
      "accounts",
      "_prisma_migrations",
      "teams",
      "activity_logs",
      "invitations",
      "team_members",
      "results_table"
    ];
    if (systemTables.includes(tableName.toLowerCase())) {
      console.log("Attempted to delete system table:", tableName);
      return new NextResponse("Cannot delete system tables", { status: 400 });
    }

    // Check if table exists with case-insensitive check
    const tableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ${userSchema}
      AND table_type = 'BASE TABLE'
      AND lower(table_name) = lower(${tableName});
    `;

    if (tableCheck.rows.length === 0) {
      console.log("Table does not exist:", tableName);
      return new NextResponse("Table does not exist", { status: 404 });
    }

    // Use the actual table name from the database to ensure correct case
    const actualTableName = tableCheck.rows[0].table_name;
    console.log("Found table with actual name:", actualTableName);

    try {
      // Drop the table using raw query for dynamic table name with schema
      await sql.query(`DROP TABLE IF EXISTS "${userSchema}"."${actualTableName}" CASCADE`);
      console.log("Table deleted successfully:", actualTableName);
      return NextResponse.json({ message: "Table deleted successfully" });
    } catch (error) {
      console.error("Error dropping table:", error);
      return new NextResponse(
        `Failed to drop table: ${error instanceof Error ? error.message : "Unknown error"}`,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in delete table endpoint:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Server Error", 
      { status: 500 }
    );
  }
}
