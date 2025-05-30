import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getUser } from "@/lib/db/queries";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const result = await sql`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log("All tables in database:", result.rows);

    return NextResponse.json({
      tables: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 }
    );
  }
} 