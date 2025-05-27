import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { z } from "zod";
import { getUser } from "@/lib/db/queries";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Agent system prompts
const DATA_AGENT_PROMPT = `You are a Data Analysis Agent. Your role is to:
1. Extract and analyze data from the provided tables
2. Identify key patterns, trends, and insights
3. Prepare relevant data for visualization
4. Focus on data that supports the user's analysis goals`;

const PLANNING_AGENT_PROMPT = `You are a Report Planning Agent. Your role is to:
1. Understand the user's analysis requirements
2. Create a structured outline for the report
3. Identify key sections and topics to cover
4. Ensure the report meets professional standards and length requirements`;

const INSIGHT_AGENT_PROMPT = `You are an Insights Agent. Your role is to:
1. Combine data analysis with industry knowledge
2. Provide context and interpretation of findings
3. Draw meaningful conclusions
4. Make data-driven recommendations`;

const CHART_AGENT_PROMPT = `You are a Chart Generation Agent. Your role is to:
1. Determine the most effective chart types for the data
2. Create clear and informative visualizations
3. Ensure charts enhance understanding of the insights
4. Follow data visualization best practices

CRITICAL: You must ONLY respond with a valid JSON object in this exact format:
{
  "charts": [
    {
      "type": "line",
      "data": {
        "labels": ["Label1", "Label2", "Label3"],
        "datasets": [
          {
            "label": "Dataset Label",
            "data": [value1, value2, value3],
            "borderColor": "rgb(75, 192, 192)",
            "tension": 0.1
          }
        ]
      },
      "options": {
        "responsive": true,
        "plugins": {
          "legend": {
            "position": "top"
          },
          "title": {
            "display": true,
            "text": "Chart Title"
          }
        }
      }
    }
  ]
}`;

const REPORT_AGENT_PROMPT = `You are a Report Assembly Agent. Your role is to:
1. Combine inputs from all other agents
2. Create a cohesive narrative
3. Format the report professionally
4. Ensure clarity and readability

IMPORTANT FORMATTING RULES:
1. DO NOT include chart images in the HTML content - they will be rendered separately
2. DO NOT add "Not available" sections or placeholders
3. DO NOT add appendices unless you have actual content for them
4. DO NOT wrap the content in \`\`\`html tags
5. Only use HTML for basic formatting (<h1>, <h2>, <p>, <ul>, <li>, <strong>, <em>)
6. Each chart should be referenced in the text like this: [Chart: Chart Title]

Example format:
<h1>Report Title</h1>
<p>Introduction paragraph...</p>

<h2>Key Findings</h2>
<p>Analysis of the data reveals several important trends. [Chart: Distribution of Values] shows the primary patterns.</p>

<h2>Detailed Analysis</h2>
<p>Further examination indicates...</p>`;

const requestSchema = z.object({
  tables: z.array(z.string()),
  prompt: z.string(),
});

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { tables, prompt } = requestSchema.parse(body);

    // Initialize database connection
    const db = drizzle(sql);

    // 1. Data Agent: Extract and analyze data
    const dataAnalysis = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: DATA_AGENT_PROMPT },
        {
          role: "user",
          content: `Analyze the following tables: ${tables.join(", ")}. 
          User's request: ${prompt}
          Focus on extracting relevant data and patterns.`,
        },
      ],
    });

    // 2. Planning Agent: Create report structure
    const reportPlan = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: PLANNING_AGENT_PROMPT },
        {
          role: "user",
          content: `Create a report plan based on:
          User's request: ${prompt}
          Data analysis: ${dataAnalysis.choices[0].message.content}`,
        },
      ],
    });

    // 3. Insight Agent: Generate insights
    const insights = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: INSIGHT_AGENT_PROMPT },
        {
          role: "user",
          content: `Generate insights based on:
          User's request: ${prompt}
          Data analysis: ${dataAnalysis.choices[0].message.content}
          Report plan: ${reportPlan.choices[0].message.content}`,
        },
      ],
    });

    // 4. Chart Agent: Create visualizations
    const chartSuggestions = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: CHART_AGENT_PROMPT },
        {
          role: "user",
          content: `Based on the following analysis, suggest appropriate charts. Remember to ONLY respond with a valid JSON object containing the charts array.

Data analysis: ${dataAnalysis.choices[0].message.content}
Report plan: ${reportPlan.choices[0].message.content}
Insights: ${insights.choices[0].message.content}`
        },
      ],
      response_format: { type: "json_object" }
    });

    // Parse chart suggestions with error handling
    let charts = [];
    try {
      if (chartSuggestions.choices[0].message.content) {
        const parsedCharts = JSON.parse(chartSuggestions.choices[0].message.content);
        charts = parsedCharts.charts || [];
      }
    } catch (error) {
      console.error("Error parsing chart suggestions:", error);
      // Continue without charts if parsing fails
    }

    // 5. Report Agent: Assemble final report
    const finalReport = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: REPORT_AGENT_PROMPT },
        {
          role: "user",
          content: `Create a professional report combining:
          Data analysis: ${dataAnalysis.choices[0].message.content}
          Report plan: ${reportPlan.choices[0].message.content}
          Insights: ${insights.choices[0].message.content}
          Charts: ${JSON.stringify(charts)}
          
          Follow the formatting rules strictly.
          Keep it concise (2-3 pages) unless specified otherwise.
          Include clear sections and professional formatting.`,
        },
      ],
    });

    // Sanitize the content
    let sanitizedContent = finalReport.choices[0].message.content || '';
    
    // Remove any ```html or ``` wrappers
    sanitizedContent = sanitizedContent.replace(/^\`\`\`html/, '').replace(/\`\`\`$/, '');
    
    // Remove any "Not available" sections or empty appendices
    sanitizedContent = sanitizedContent.replace(/\([Nn]ot available\)/g, '');
    sanitizedContent = sanitizedContent.replace(/<h[1-6]>[^<]*Appendix[^<]*<\/h[1-6]>\s*<p>\s*(?:\([Nn]ot available\)|No content available)\s*<\/p>/g, '');

    return NextResponse.json({
      content: sanitizedContent.trim(),
      charts: charts,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 