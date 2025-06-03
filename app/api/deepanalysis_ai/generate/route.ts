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
const DATA_AGENT_PROMPT = `You are a Data Analysis Agent with deep technical expertise in manufacturing, operations, and industrial processes. Your role is to:
1. Extract and analyze data using advanced statistical methods and industry-standard metrics
2. Apply technical domain knowledge to identify complex patterns and correlations
3. Utilize industrial engineering principles to evaluate performance indicators
4. Focus on data that supports sophisticated technical analysis and industry benchmarking
5. Consider industry standards (ISO, DIN, ANSI, etc.) in your analysis
6. Apply Six Sigma methodologies where appropriate`;

const PLANNING_AGENT_PROMPT = `You are a Report Planning Agent with extensive experience in industrial and manufacturing analytics. Your role is to:
1. Create technically rigorous and industry-compliant report structures
2. Ensure alignment with international standards and best practices
3. Incorporate relevant technical specifications and compliance requirements
4. Design comprehensive analysis frameworks that meet industry expertise standards

You are specifically generating a {reportStyle} report. Each report style demands specific technical focus and industry expertise:

- General Report: Comprehensive technical analysis with industry context
- SOP Report: ISO 9001:2015 compliant procedures, technical specifications, and compliance requirements
- Downtime Analysis: MTBF/MTTR calculations, reliability engineering metrics, and root cause methodologies
- Maintenance Schedule: RCM (Reliability Centered Maintenance) principles, TPM frameworks, and OEM specifications
- Root Cause Analysis: 8D problem-solving methodology, Ishikawa diagrams, and FMEA analysis
- MTTR/MTBF Report: Weibull analysis, reliability statistics, and maintenance engineering metrics
- Maintenance Cost: Activity-based costing, lifecycle cost analysis, and maintenance budgeting standards
- Production Line: Takt time analysis, line balancing calculations, and throughput optimization
- Shift Operations: Labor utilization metrics, productivity indices, and workflow optimization
- OEE Report: World-class OEE benchmarking, six big losses analysis, and TPM metrics
- Bottleneck Analysis: Theory of Constraints application, capacity utilization calculations, and throughput accounting
- Forecast vs Actual: Statistical process control, demand planning metrics, and production variance analysis
- Defect Rate: PPM calculations, process capability indices (Cp, Cpk), and quality control charts
- Quality Issues: 8D/5Why analysis, statistical quality control, and compliance metrics
- FPY Report: Yield analysis, process capability studies, and quality cost analysis
- Energy Consumption: ISO 50001 standards, energy efficiency metrics, and carbon footprint analysis
- Waste Analysis: Lean waste categorization, material efficiency metrics, and environmental compliance
- Material Usage: BOM efficiency analysis, inventory optimization metrics, and material yield calculations
- Cost per Unit: Activity-based costing, value stream mapping, and cost driver analysis
- Plant Manager Summary: Balanced scorecard metrics, strategic KPIs, and industry benchmarking
- Operations Brief: Real-time performance metrics, critical path analysis, and operational risk assessment
- Workforce Productivity: Labor efficiency metrics, skill matrix analysis, and capacity planning
- Capacity Planning: Equipment effectiveness, resource utilization, and demand forecasting models

Ensure your outline incorporates relevant technical standards, methodologies, and industry best practices.`;

const INSIGHT_AGENT_PROMPT = `You are an Insights Agent with deep industrial domain expertise. Your role is to:
1. Apply advanced technical knowledge to interpret data patterns
2. Provide industry-specific context and benchmarking
3. Draw conclusions based on engineering principles and industry standards
4. Make technically sound, data-driven recommendations
5. Reference relevant industry standards and technical specifications
6. Consider regulatory compliance and industry best practices`;

const CHART_AGENT_PROMPT = `You are a Chart Generation Agent with expertise in technical data visualization. Your role is to:
1. Create technically precise and industry-standard visualizations
2. Apply advanced statistical visualization techniques
3. Follow engineering and scientific plotting standards
4. Ensure technical accuracy and proper unit representation
5. Include confidence intervals and statistical significance where appropriate
6. Use industry-standard notation and terminology

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
        },
        "scales": {
          "y": {
            "beginAtZero": true,
            "title": {
              "display": true,
              "text": "Metric (unit)"
            }
          },
          "x": {
            "title": {
              "display": true,
              "text": "Time Period"
            }
          }
        }
      }
    }
  ]
}`;

const REPORT_AGENT_PROMPT = `You are a Report Assembly Agent with comprehensive technical and industry expertise. Your role is to:
1. Create technically precise and industry-compliant documentation
2. Ensure adherence to technical writing standards and industry terminology
3. Incorporate relevant standards, specifications, and compliance requirements
4. Maintain technical accuracy while ensuring clarity for different stakeholder levels

You are specifically generating a {reportStyle} report. Each report style requires specific technical depth and industry context.
Ensure your report demonstrates deep technical understanding and industry expertise through:
- Proper use of technical terminology and industry-standard metrics
- Reference to relevant standards and specifications
- Clear technical explanations with supporting data
- Industry-specific context and benchmarking
- Actionable technical recommendations

IMPORTANT FORMATTING RULES:
1. DO NOT include chart images in the HTML content - they will be rendered separately
2. DO NOT add "Not available" sections or placeholders
3. DO NOT add appendices unless you have actual content for them
4. DO NOT wrap the content in \`\`\`html tags
5. Use proper HTML formatting with these tags:
   - <h1> for main title
   - <h2> for section headers
   - <p> for paragraphs
   - <ul> and <li> for lists
   - <strong> for emphasis
   - <table>, <tr>, <th>, <td> for data tables
   - <em> for technical terms
6. Each chart should be referenced in the text like this: [Chart: Chart Title]
7. Include proper technical units and precision in measurements
8. Reference relevant industry standards where applicable

Example format:
<h1>Technical Analysis Report: [Report Type]</h1>

<h2>Executive Summary</h2>
<p>This analysis provides insights into [topic] following [relevant standards/methodologies]...</p>

<h2>Key Findings</h2>
<ul>
  <li><strong>Finding 1:</strong> Technical description with <em>specific metrics</em>...</li>
  <li><strong>Finding 2:</strong> Analysis shows... [Chart: Trend Analysis]</li>
</ul>

<h2>Detailed Analysis</h2>
<p>The investigation revealed...</p>

<h2>Technical Specifications</h2>
<table>
  <tr>
    <th>Metric</th>
    <th>Value</th>
    <th>Industry Standard</th>
  </tr>
  <tr>
    <td>Parameter 1</td>
    <td>Value</td>
    <td>Benchmark</td>
  </tr>
</table>

<h2>Recommendations</h2>
<ul>
  <li><strong>Action Item 1:</strong> Technical recommendation with justification...</li>
</ul>`;

const requestSchema = z.object({
  tables: z.array(z.string()),
  prompt: z.string(),
  reportStyle: z.string(),
});

async function refinePrompt(reportStyle: string, userPrompt: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/deepanalysis_ai/prompt-refiner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportStyle,
        userPrompt,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refine prompt');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in prompt refinement:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { tables, prompt, reportStyle } = requestSchema.parse(body);

    // Refine prompt if not a general report
    let refinedPrompt = prompt;
    let promptExplanation = '';
    
    if (reportStyle !== 'general') {
      const refinement = await refinePrompt(reportStyle, prompt);
      if (refinement) {
        refinedPrompt = refinement.refinedPrompt;
        promptExplanation = refinement.explanation;
      }
    }

    // Replace placeholders in prompts
    const planningPrompt = PLANNING_AGENT_PROMPT.replace("{reportStyle}", reportStyle);
    const reportPrompt = REPORT_AGENT_PROMPT.replace("{reportStyle}", reportStyle);

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
          User's request: ${refinedPrompt}
          Report style: ${reportStyle}
          ${promptExplanation ? `Note: ${promptExplanation}` : ''}
          Focus on extracting relevant data and patterns for this type of report.`,
        },
      ],
    });

    // 2. Planning Agent: Create report structure
    const reportPlan = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: planningPrompt },
        {
          role: "user",
          content: `Create a report plan based on:
          User's request: ${refinedPrompt}
          Report style: ${reportStyle}
          ${promptExplanation ? `Refinement context: ${promptExplanation}` : ''}
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
          User's request: ${refinedPrompt}
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
        { role: "system", content: reportPrompt },
        {
          role: "user",
          content: `Create a professional ${reportStyle} report combining:
          Original request: ${prompt}
          Refined request: ${refinedPrompt}
          ${promptExplanation ? `Refinement explanation: ${promptExplanation}` : ''}
          Data analysis: ${dataAnalysis.choices[0].message.content}
          Report plan: ${reportPlan.choices[0].message.content}
          Insights: ${insights.choices[0].message.content}
          Charts: ${JSON.stringify(charts)}
          
          Follow the formatting rules strictly.
          Keep it concise (2-3 pages) unless specified otherwise.
          Include clear sections and professional formatting.
          Ensure the report structure matches the ${reportStyle} style.`,
        },
      ],
    });

    // Sanitize the content
    let sanitizedContent = finalReport.choices[0].message.content || '';
    
    // Remove any ```html or ``` wrappers if present
    sanitizedContent = sanitizedContent.replace(/^\`\`\`html\n?/, '').replace(/\n?\`\`\`$/, '');
    
    // Remove any "Not available" sections or empty appendices
    sanitizedContent = sanitizedContent.replace(/\([Nn]ot available\)/g, '');
    sanitizedContent = sanitizedContent.replace(/<h[1-6]>[^<]*Appendix[^<]*<\/h[1-6]>\s*<p>\s*(?:\([Nn]ot available\)|No content available)\s*<\/p>/g, '');

    // Ensure proper HTML structure
    if (!sanitizedContent.includes('<h1>')) {
      sanitizedContent = `<h1>${reportStyle.charAt(0).toUpperCase() + reportStyle.slice(1)} Report</h1>\n${sanitizedContent}`;
    }

    return NextResponse.json({
      content: sanitizedContent.trim(),
      charts: charts,
      promptRefinement: reportStyle !== 'general' ? {
        original: prompt,
        refined: refinedPrompt,
        explanation: promptExplanation
      } : null
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 