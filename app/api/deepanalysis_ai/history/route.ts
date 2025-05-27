import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { getUser } from "@/lib/db/queries";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Initialize database connection
    const db = drizzle(sql);

    // Fetch last 10 reports for the user
    const history = await sql`
      SELECT id, prompt, report_content, created_at
      FROM report_history
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return NextResponse.json({
      history: history.rows,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 