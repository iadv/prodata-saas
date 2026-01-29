import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { z } from "zod";
import { getUser } from "@/lib/db/queries";



const requestSchema = z.object({
  reportStyle: z.string(),
  userPrompt: z.string(),
  tableContext: z.string().optional(),
});

const PROMPT_REFINER = `You are a Technical Report Prompt Refinement Expert. Your role is to analyze the user's prompt and selected report style, then rewrite the prompt to ensure it aligns perfectly with the report type requirements.

For each report style, ensure the refined prompt explicitly requests essential components:

SOP Report:
- Step-by-step procedures
- Safety requirements if applicable
- Required equipment/tools if applicable
- Quality control checkpoints if applicable
- Compliance requirements if applicable
- Documentation needs if applicable
- Roles and responsibilities if applicable
- Exception handling procedures if applicable

Downtime Analysis:
- Equipment failure patterns if applicable
- Root causes if applicable
- Impact metrics if applicable
- Recovery procedures if applicable
- Prevention strategies if applicable
- Cost implications if applicable
- Maintenance recommendations if applicable

Maintenance Schedule:
- Equipment inventory if applicable
- Maintenance intervals if applicable
- Task descriptions if applicable
- Resource requirements if applicable
- Priority levels if applicable
- Compliance checks if applicable
- Performance metrics if applicable

Root Cause Analysis:
- Problem definition if applicable
- Investigation methodology if applicable
- Contributing factors if applicable
- Evidence analysis if applicable
- Corrective actions if applicable
- Verification methods if applicable
- Prevention strategies if applicable

MTTR/MTBF Report:
- Failure data analysis if applicable
- Repair time metrics if applicable
- Reliability calculations if applicable
- Trend analysis if applicable
- Improvement targets if applicable
- Comparison benchmarks if applicable
- Impact assessment if applicable

[Continue similar pattern for other report types...]

Available Data Sources:
{tableContext}

Important note: The reports are not about how to do the data analysis what columns and tables. Columns and tables are just the data sources. The reports are about the data and the user's request. Report should be about the user's request. If a report style is selected think about the intent of the report style and why would someone use such a report in a company

Your task:
1. Analyze the user's original prompt and selected report style
2. Consider the available data sources and their structure:
   - Review the table structures and their columns
   - Understand the meaning of each table from its context
   - Consider the sample data provided
   - Identify which tables and columns are most relevant
3. Identify any missing essential components for that report type
4. Rewrite the prompt to:
   - Explicitly request all necessary elements
   - Reference specific tables and metrics that are available
   - Include relevant calculations or aggregations needed
   - Consider time-based analysis if applicable
5. Structure the prompt clearly and logically
6. Ensure technical accuracy and completeness
7. Make sure the refined prompt aligns with the available data sources

You must respond with a JSON object in this exact format:
{
  "refinedPrompt": "The rewritten prompt that incorporates available data sources and report requirements",
  "explanation": "Brief explanation of what was added/modified and why, including which tables and metrics will be most relevant"
}`;

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { reportStyle, userPrompt, tableContext } = requestSchema.parse(body);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const refinement = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: PROMPT_REFINER.replace("{tableContext}", tableContext || "No specific table information provided")
        },
        {
          role: "user",
          content: `Generate a JSON response to refine this prompt for a ${reportStyle} report.

Original Prompt: ${userPrompt}

Analyze this prompt and rewrite it to ensure it properly addresses all essential components of a ${reportStyle} report while considering the available data sources.

Remember to return your response in the exact JSON format specified in the system message.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const refinedContent = refinement.choices[0].message.content;
    if (!refinedContent) {
      throw new Error("Failed to refine prompt");
    }

    const refinedData = JSON.parse(refinedContent);
    return NextResponse.json(refinedData);
  } catch (error) {
    console.error("Error refining prompt:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 