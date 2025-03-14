import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getUser } from "@/lib/db/queries";

// GET endpoint to retrieve historical prompts
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Define the user's schema name dynamically
    const schemaName = `user_${user.id}`;

    // Create the historical table if it doesn't exist
    await ensureHistoricalTableExists(schemaName);

    // Fetch the user's historical prompts, limited to recent 20
    const query = `
      SELECT id, prompt, created_at as "createdAt"
      FROM "${schemaName}"."historical"
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const result = await sql.query(query);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error retrieving historical prompts:", error);
    return NextResponse.json(
      { error: "Failed to retrieve historical prompts" },
      { status: 500 }
    );
  }
}

// POST endpoint to save a new historical prompt
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Define the user's schema name dynamically
    const schemaName = `user_${user.id}`;

    // Get the prompt from request body
    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Create the historical table if it doesn't exist
    await ensureHistoricalTableExists(schemaName);

    // Check if the same prompt exists recently (last hour)
    const checkExistingQuery = `
      SELECT id 
      FROM "${schemaName}"."historical"
      WHERE prompt = $1
      AND created_at > NOW() - INTERVAL '1 hour'
      LIMIT 1
    `;
    
    const existingPrompt = await sql.query(checkExistingQuery, [prompt]);
    
    // If the same prompt exists recently, just update its timestamp
    if (existingPrompt.rows.length > 0) {
      const updateQuery = `
        UPDATE "${schemaName}"."historical"
        SET created_at = NOW()
        WHERE id = $1
        RETURNING id, prompt, created_at as "createdAt"
      `;
      
      const result = await sql.query(updateQuery, [existingPrompt.rows[0].id]);
      return NextResponse.json(result.rows[0]);
    }
    
    // Insert the new prompt
    const insertQuery = `
      INSERT INTO "${schemaName}"."historical" (prompt)
      VALUES ($1)
      RETURNING id, prompt, created_at as "createdAt"
    `;
    
    const result = await sql.query(insertQuery, [prompt]);
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error saving historical prompt:", error);
    return NextResponse.json(
      { error: "Failed to save historical prompt" },
      { status: 500 }
    );
  }
}

// Helper function to ensure the historical table exists
async function ensureHistoricalTableExists(schemaName: string) {
  try {
    // Check if the table exists
    const checkTableQuery = `
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = $1
      AND table_name = 'historical'
    `;
    
    const tableExists = await sql.query(checkTableQuery, [schemaName]);
    
    // If table doesn't exist, create it
    if (tableExists.rows.length === 0) {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${schemaName}"."historical" (
          id SERIAL PRIMARY KEY,
          prompt TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
        
        CREATE INDEX IF NOT EXISTS idx_historical_created_at 
        ON "${schemaName}"."historical"(created_at DESC);
      `;
      
      await sql.query(createTableQuery);
    }
  } catch (error) {
    console.error("Error ensuring historical table exists:", error);
    throw error;
  }
}