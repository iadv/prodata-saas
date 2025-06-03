import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { z } from "zod";
import { getUser } from "@/lib/db/queries";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const requestSchema = z.object({
  reportStyle: z.string(),
  userPrompt: z.string(),
});

const PROMPT_REFINER = `You are a Technical Report Prompt Refinement Expert. Your role is to analyze the user's prompt and selected report style, then rewrite the prompt to ensure it aligns perfectly with the report type requirements.

For each report style, ensure the refined prompt explicitly requests essential components:

SOP Report:
- Step-by-step procedures
- Safety requirements
- Required equipment/tools
- Quality control checkpoints
- Compliance requirements
- Documentation needs
- Roles and responsibilities
- Exception handling procedures

Downtime Analysis:
- Equipment failure patterns
- Root causes
- Impact metrics
- Recovery procedures
- Prevention strategies
- Cost implications
- Maintenance recommendations

Maintenance Schedule:
- Equipment inventory
- Maintenance intervals
- Task descriptions
- Resource requirements
- Priority levels
- Compliance checks
- Performance metrics

Root Cause Analysis:
- Problem definition
- Investigation methodology
- Contributing factors
- Evidence analysis
- Corrective actions
- Verification methods
- Prevention strategies

MTTR/MTBF Report:
- Failure data analysis
- Repair time metrics
- Reliability calculations
- Trend analysis
- Improvement targets
- Comparison benchmarks
- Impact assessment

[Continue similar pattern for other report types...]

Your task:
1. Analyze the user's original prompt and selected report style
2. Identify any missing essential components for that report type
3. Rewrite the prompt to explicitly request all necessary elements
4. Structure the prompt clearly and logically
5. Ensure technical accuracy and completeness

Respond with a JSON object containing:
{
  "refinedPrompt": "The rewritten prompt",
  "explanation": "Brief explanation of what was added/modified and why"
}`;

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { reportStyle, userPrompt } = requestSchema.parse(body);

    const refinement = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: PROMPT_REFINER },
        {
          role: "user",
          content: `Report Style: ${reportStyle}
User's Original Prompt: ${userPrompt}

Please analyze this prompt and rewrite it to ensure it properly addresses all essential components of a ${reportStyle} report.`
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