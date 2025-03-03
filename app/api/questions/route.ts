import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getUser } from "@/lib/db/queries"; // Import getUser function

// Initialize the PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.NEXT_PUBLIC_POSTGRES_URL,
});

// Default list of static queries
const defaultQuestions = [
  {
    website_question: "Compare count of unicorns in SF and NY over time",
    mobile_question: "SF vs NY",
  },
  {
    website_question: "Compare unicorn valuations in the US vs China over time",
    mobile_question: "US vs China",
  },
  {
    website_question: "Countries with highest unicorn density",
    mobile_question: "Top countries",
  },
  {
    website_question: "Show the number of unicorns founded each year over the past two decades",
    mobile_question: "Yearly count",
  },
  {
    website_question: "Display the cumulative total valuation of unicorns over time",
    mobile_question: "Total value",
  },
  {
    website_question: "Compare the yearly funding amounts for fintech vs healthtech unicorns",
    mobile_question: "Fintech vs health",
  },
  {
    website_question: "Which cities have the most SaaS unicorns",
    mobile_question: "SaaS cities",
  },
  {
    website_question: "Show the countries with the highest unicorn density",
    mobile_question: "Dense nations",
  },
  {
    website_question: "Show the number of unicorns (grouped by year) over the past decade",
    mobile_question: "Decade trend",
  },
  {
    website_question: "Compare the average valuation of AI companies vs. biotech companies",
    mobile_question: "AI vs biotech",
  },
  {
    website_question: "Investors with the most unicorns",
    mobile_question: "Top investors",
  },
];

export async function GET(request: NextRequest) {
  try {
    // Retrieve the schemaName query parameter from the URL
    const url = new URL(request.url);
    // Retrieve the authenticated user
    const user = await getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
 
    // Define the user's schema name dynamically
    const schemaName = `user_${user.id}`;

    const tableName = "library"; // Adjust based on your table name

    if (!schemaName) {
      return NextResponse.json({ error: "schemaName is required" }, { status: 400 });
    }

    // Query to fetch the latest 10 entries for website and mobile questions
    const query = `
      SELECT 
        sample_question_1 AS website_question1,
        sample_question_2 AS website_question2,
        sample_question_3 AS website_question3,
        sample_question_6 AS mobile_question1,
        sample_question_7 AS mobile_question2,
        sample_question_8 AS mobile_question3
      FROM ${schemaName}.${tableName}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Execute the query
    const { rows } = await pool.query(query);

    // Log the raw rows fetched from the database
    console.log("Raw Database Response:", rows);

    // Initialize empty arrays for website and mobile questions
    let websiteQuestions: string[] = [];
    let mobileQuestions: string[] = [];

    // Extract and replace null values with default questions
    rows.forEach((entry, index) => {
      websiteQuestions.push(entry.website_question1 || defaultQuestions[index]?.website_question);
      websiteQuestions.push(entry.website_question2 || defaultQuestions[index + 1]?.website_question);
      websiteQuestions.push(entry.website_question3 || defaultQuestions[index + 2]?.website_question);

      mobileQuestions.push(entry.mobile_question1 || defaultQuestions[index]?.mobile_question);
      mobileQuestions.push(entry.mobile_question2 || defaultQuestions[index + 1]?.mobile_question);
      mobileQuestions.push(entry.mobile_question3 || defaultQuestions[index + 2]?.mobile_question);
    });

    // Ensure we return exactly 10 questions each, filling with default questions if needed
    while (websiteQuestions.length < 10) {
      websiteQuestions.push(defaultQuestions[websiteQuestions.length % defaultQuestions.length]?.website_question);
    }

    while (mobileQuestions.length < 10) {
      mobileQuestions.push(defaultQuestions[mobileQuestions.length % defaultQuestions.length]?.mobile_question);
    }

    // Log the final response before sending it
    console.log("Final API Response:", {
      websiteQuestions,
      mobileQuestions,
    });

    // Combine both arrays into a single response
    return NextResponse.json({
      websiteQuestions,
      mobileQuestions,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
