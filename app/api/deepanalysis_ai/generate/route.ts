import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { z } from "zod";
import { getUser } from "@/lib/db/queries";
import { Pool } from "pg";

// Initialize OpenAI


// Add connection pool configuration
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait for a connection
});

// Add pool error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Update sql query wrapper to use pool
async function executeQuery(query: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(query, params);
  } finally {
    client.release();
  }
}

// Update fetchTopRows function to use pool
const fetchTopRows = async (table: string, schema: string) => {
  try {
    console.log(`Fetching top rows for table: ${table} in schema: ${schema}`);
    const result = await retryOperation(async () => {
      return await executeQuery(
        `SELECT * FROM "${schema}"."${table}" LIMIT 5`
      );
    });
    return {
      columns: result.fields.map(f => f.name),
      rows: result.rows
    };
  } catch (error) {
    console.error(`Error fetching top rows for ${table}:`, error);
    return {
      columns: [],
      rows: []
    };
  }
};

// Update fetchLibraryContext function to use pool
const fetchLibraryContext = async (table: string, schema: string) => {
  try {
    console.log(`Fetching library context for table: ${table}`);
    const result = await retryOperation(async () => {
      return await executeQuery(
        `SELECT context FROM "${schema}".library WHERE table_name = $1`,
        [table]
      );
    });
    return result.rows.length > 0 ? result.rows[0].context : null;
  } catch (error) {
    console.error(`Error fetching library context for ${table}:`, error);
    return null;
  }
};

// Agent system prompts
const DATA_AGENT_PROMPT = `You are a Data Analysis Agent with deep technical expertise in manufacturing, operations, industrial processes, data analysis, report generation, quality, maintenance, and finance. Your role is to:
1. Analyze SQL query results using advanced statistical methods and industry-standard metrics
2. Identify patterns, trends, and correlations in the data
3. Calculate key performance indicators and technical metrics
4. Apply industry best practices and benchmarks
5. Utilize concepts like Six Sigma methodologies where appropriate
6. Provide technically sound insights based on the data

For each query result, you will receive:
- The purpose of the query
- The actual data returned
- The column names and their meanings

Your analysis should:
1. Address each query result's purpose
2. Apply appropriate statistical methods
3. Compare results against industry standards
4. Identify significant patterns or anomalies
5. Draw technically sound conclusions
6. Suggest potential areas for deeper analysis

Available Data:
Tables: {tables}
Table Structure: {tableContext}`;

const PLANNING_AGENT_PROMPT = `You are a Report Planning Agent with extensive experience in industrial and manufacturing analytics. Your role is to:
1. Create technically rigorous and industry-compliant report structures
2. Ensure alignment with industry standards and best practices
3. Incorporate relevant technical specifications and compliance requirements
4. Design comprehensive analysis frameworks that meet industry expertise standards

You are specifically generating a {reportStyle} report. Each report style demands specific technical focus and industry expertise:

- General Report: Comprehensive technical analysis with industry context
- SOP Report: standard operating procedures, process plans, ISO 9001:2015 standards, technical specifications, and compliance requirements
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

You will receive:
1. The user's original request
2. The refined prompt (if applicable)
3. SQL query results with their purposes
4. Data analysis findings

Your task is to:
1. Review the query results and their purposes
2. Understand what data is available from each query
3. Plan how to present the findings effectively
4. Ensure all relevant metrics and KPIs are covered
5. Structure the report to tell a coherent technical story
6. Include sections for all available data points
7. Plan appropriate visualizations for the data

Ensure your outline:
1. Follows industry best practices
2. Incorporates all available data points
3. Presents findings in a logical flow
4. Includes technical context and benchmarks
5. Suggests appropriate visualizations for each section`;

const INSIGHT_AGENT_PROMPT = `You are an Insights Agent with deep industrial domain expertise. Your role is to:
1. Apply advanced technical knowledge to interpret data patterns
2. Provide industry-specific context and benchmarking
3. Draw conclusions based on engineering principles and industry standards
4. Make technically sound, data-driven recommendations
5. Reference relevant industry standards and technical specifications
6. Consider regulatory compliance and industry best practices

You will receive:
1. SQL query results with their purposes
2. Data analysis findings
3. Report structure and plan

For each insight:
1. Consider the purpose of the original query
2. Review the data analysis findings
3. Apply industry expertise and standards
4. Identify actionable recommendations
5. Support conclusions with data
6. Reference relevant benchmarks
7. Consider compliance implications

Your insights should:
1. Be technically precise and actionable
2. Reference specific data points
3. Include industry context
4. Consider multiple perspectives
5. Suggest next steps
6. Highlight critical findings
7. Address potential risks or opportunities`;

const CHART_AGENT_PROMPT = `You are a Chart Generation Agent with expertise in technical data visualization. Your role is to:
1. Create technically precise and industry-standard visualizations
2. Apply advanced statistical visualization techniques
3. Follow engineering and scientific plotting standards
4. Ensure technical accuracy and proper unit representation
5. Include confidence intervals and statistical significance where appropriate
6. Use industry-standard notation and terminology
7. Ensure axis, labels, formatting, and units are appropriate for the data and the user's request and the report style and legible

CRITICALLY IMPORTANT:
1. You MUST use the actual data from the query results to create charts
2. Each chart's dataset MUST contain real values from the query results
3. Labels and data points must match the actual data
4. Do not use placeholder or example data
5. If a query result has no data, do not create a chart for it
6. Verify that the data types match the chart type (e.g., numeric data for line charts)

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
1. Create technically precise, one that makes sense to users request, expert approvable, and industry-compliant documentation
2. Ensure adherence to technical writing standards and industry terminology
3. The report should appear as if it was written by an expert in the field and the user's request
4. Maintain technical accuracy while ensuring clarity for different stakeholder levels

You are specifically generating a {reportStyle} report. Each report style requires specific technical depth and industry context.
Ensure your report demonstrates deep technical understanding and industry expertise through:
- Making the content relevant and appropriate to users request
Proper use of technical and domain and process terminology and industry-standard metrics
- Reference to relevant industry insights, information, and standards
- Clear technical explanations with supporting data
- Industry-specific context
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

const SQL_QUERY_AGENT_PROMPT = `You are a SQL Query Generation Agent with deep expertise in PostgreSQL and data analysis. Your role is to:
1. Generate SQL queries based on the user's request and report requirements
2. Ensure queries follow PostgreSQL best practices and security guidelines
3. Handle complex data relationships and aggregations
4. Generate multiple queries if needed for comprehensive analysis

CRITICALLY IMPORTANT RULES:
1. ALWAYS qualify table names with ONLY the schema name ONCE. For example, use "schema_name.tablename" NOT "schema_name.schema_name.tablename"
2. Only write retrieval (SELECT) queries - no data modification
3. For string fields, use ILIKE and LOWER() for case-insensitive matching
4. Ensure queries return quantitative data suitable for analysis
5. When calculating rates, return them as decimals
6. When aggregating over time, use appropriate time units
7. VERIFY all table and column names exist before using them
8. Include proper joins when combining data from multiple tables
9. Add appropriate GROUP BY clauses for aggregations

You have access to the following table information:
Tables: {tables}
Schema Name: {schemaName}
Table Structure and Sample Data: {tableContext}`;

// Update the request schema with better validation
const requestSchema = z.object({
  tables: z.array(z.string()).min(1, "At least one table must be selected"),
  prompt: z.string().min(1, "Prompt cannot be empty"),
  reportStyle: z.string().min(1, "Report style must be specified"),
  tableContext: z.string(),
  sampleData: z.string()
});

async function refinePrompt(reportStyle: string, userPrompt: string, tableContext: string) {
  try {
    // Import the prompt-refiner function directly instead of using fetch
    const { POST: promptRefinerHandler } = await import('../prompt-refiner/route');

    // Create a mock request object
    const mockRequest = new Request('http://localhost/api/deepanalysis_ai/prompt-refiner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reportStyle,
        userPrompt,
        tableContext,
      })
    });

    // Call the handler directly
    const response = await promptRefinerHandler(mockRequest);
    if (!response.ok) {
      console.error('Prompt refinement failed:', await response.text());
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in prompt refinement:', error);
    return null;
  }
}

// Add retry utility function at the top
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
}

// Function to fetch table context (structure and sample data)
async function fetchTableContext(tables: string[], schemaName: string) {
  try {
    let contextInfo = [];
    let structuredInfo = [];
    let libraryContexts = [];

    for (const table of tables) {
      const topRows = await fetchTopRows(table, schemaName);
      const libraryContext = await fetchLibraryContext(table, schemaName);

      // Add structured table info
      structuredInfo.push(`
Table: ${table}
Columns: ${topRows.columns.join(', ')}
Sample Data:
${JSON.stringify(topRows.rows.slice(0, 2), null, 2)}
      `);

      // Add library context if available
      if (libraryContext) {
        libraryContexts.push(`Context for "${table}": ${libraryContext}`);
      }
    }

    // Combine both types of context
    contextInfo.push("=== Table Structure and Sample Data ===\n");
    contextInfo.push(structuredInfo.join('\n\n'));

    if (libraryContexts.length > 0) {
      contextInfo.push("\n=== Additional Table Context ===\n");
      contextInfo.push(libraryContexts.join('\n\n'));
    }

    return contextInfo.join('\n');
  } catch (error) {
    console.error('Error fetching table context:', error);
    return '';
  }
}

// Function to generate SQL queries
async function generateSQLQueries(prompt: string, tables: string[], schemaName: string, tableContext: string, sampleData: string) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Parse the table context and sample data
    const parsedContext = JSON.parse(tableContext);
    const parsedSampleData = JSON.parse(sampleData);

    // Create detailed table structure
    let tableStructure = "Available tables and columns:\n";
    for (const tableName in parsedContext) {
      const columns = parsedContext[tableName];
      tableStructure += `Table: ${tableName}\n`;
      tableStructure += `Columns:\n`;
      columns.forEach((col: { name: string; type: string; nullable: boolean }) => {
        tableStructure += `  - ${col.name} (${col.type}${col.nullable ? ', nullable' : ''})\n`;
      });

      // Add sample data
      if (parsedSampleData[tableName] && parsedSampleData[tableName].length > 0) {
        tableStructure += "Sample values:\n";
        const sampleRow = parsedSampleData[tableName][0];
        Object.entries(sampleRow).forEach(([key, value]) => {
          tableStructure += `  ${key}: ${value}\n`;
        });
      }
      tableStructure += "\n";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: SQL_QUERY_AGENT_PROMPT
            .replace("{tables}", tables.join(", "))
            .replace("{schemaName}", schemaName)
            .replace("{tableContext}", tableStructure) + "\n\nIMPORTANT: You must respond with a valid JSON object containing a 'queries' array."
        },
        {
          role: "user",
          content: `Generate SQL queries to analyze: ${prompt}

          DATABASE STRUCTURE:
          ${tableStructure}
          
          IMPORTANT REQUIREMENTS:
          1. Make sure to qualify all table names with the schema name "${schemaName}"
          2. Only use columns that actually exist in the tables
          3. The query must return data suitable for analysis
          4. If aggregating by time, use appropriate time intervals
          5. For calculations, return values as decimals (not percentages)
          
          Respond with a JSON object containing a 'queries' array where each query object has 'purpose' and 'query' fields.`
        }
      ],
      response_format: { type: "json_object" }
    });

    if (!response.choices[0].message.content) {
      throw new Error("Failed to generate SQL queries");
    }

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating SQL queries:", error);
    throw error;
  }
}

// Function to validate and fix SQL query
function validateAndFixQuery(query: string, schemaName: string): { isValid: boolean; query: string; error?: string } {
  try {
    // Clean and normalize the query
    let normalizedQuery = query.trim().replace(/\\s+/g, ' ');

    // Basic validation
    if (!normalizedQuery.toLowerCase().startsWith('select')) {
      return { isValid: false, query, error: 'Query must start with SELECT' };
    }

    // Check for dangerous keywords
    const dangerousKeywords = /\b(insert|update|delete|drop|alter|create|grant|revoke)\b/i;
    if (dangerousKeywords.test(normalizedQuery)) {
      return { isValid: false, query, error: 'Query contains disallowed keywords' };
    }

    // Fix common SQL function issues
    const functionFixes: { [key: string]: string } = {
      'date_trunc': 'to_char',
      'datetime_trunc': 'to_char',
      'time_trunc': 'to_char'
    };

    // Replace problematic functions
    Object.entries(functionFixes).forEach(([problematic, replacement]) => {
      const regex = new RegExp(`\\b${problematic}\\b`, 'gi');
      normalizedQuery = normalizedQuery.replace(regex, replacement);
    });

    // Fix CASE/WHEN boolean issues
    normalizedQuery = normalizedQuery.replace(
      /CASE\s+WHEN\s+(\d+)\s+THEN/gi,
      'CASE WHEN $1 = 1 THEN'
    );

    // Remove any existing schema qualifications to prevent double qualification
    const removeSchemaPattern = new RegExp(`${schemaName}\\.`, 'g');
    normalizedQuery = normalizedQuery.replace(removeSchemaPattern, '');

    // Add schema qualification to table names
    const tablePattern = /\bFROM\s+([^.\s,()]+)(?!\.)|\bJOIN\s+([^.\s,()]+)(?!\.)/gi;
    normalizedQuery = normalizedQuery.replace(tablePattern, (match, table1, table2) => {
      const table = table1 || table2;
      return match.replace(table, `${schemaName}.${table}`);
    });

    return { isValid: true, query: normalizedQuery };
  } catch (error) {
    return { isValid: false, query, error: 'Query validation failed' };
  }
}

// Function to execute SQL queries
async function executeSQLQueries(queries: { purpose: string; query: string }[], schemaName: string) {
  const results = [];

  for (const { purpose, query } of queries) {
    try {
      const { isValid, query: fixedQuery, error } = validateAndFixQuery(query, schemaName);

      if (!isValid) {
        console.error(`Invalid query: ${error}`);
        results.push({
          purpose,
          error: error || 'Invalid query',
          data: [],
          columns: []
        });
        continue;
      }

      console.log(`Executing query for purpose: ${purpose}`);
      console.log('Query:', fixedQuery);

      const result = await retryOperation(async () => {
        return await executeQuery(fixedQuery);
      });

      console.log(`Query executed successfully. Rows returned: ${result.rows.length}`);

      results.push({
        purpose,
        data: result.rows,
        columns: result.fields.map(f => f.name)
      });
    } catch (error) {
      console.error(`Error executing query for purpose: ${purpose}`, error);
      results.push({
        purpose,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: [],
        columns: []
      });
    }
  }

  return results;
}

export async function POST(req: Request) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Validate user authentication
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return new NextResponse("Invalid JSON in request body", { status: 400 });
    }

    // Validate request schema
    try {
      const { tables, prompt, reportStyle, tableContext, sampleData } = requestSchema.parse(body);

      // Get schema name from the authenticated user
      const schemaName = `user_${user.id}`;

      // Fetch table context if not provided
      let tableContextInfo;
      try {
        tableContextInfo = await fetchTableContext(tables, schemaName);
      } catch (error) {
        console.error("Error fetching table context:", error);
        return new NextResponse("Failed to fetch table context", { status: 500 });
      }

      // Refine prompt if not a general report
      let refinedPrompt = prompt;
      let promptExplanation = '';

      if (reportStyle !== 'general') {
        try {
          const refinement = await refinePrompt(reportStyle, prompt, tableContextInfo);
          if (refinement) {
            refinedPrompt = refinement.refinedPrompt;
            promptExplanation = refinement.explanation;
          }
        } catch (error) {
          console.error("Error refining prompt:", error);
          // Continue with original prompt if refinement fails
        }
      }

      // Generate SQL queries
      let sqlQueries;
      try {
        console.log('\n=== SQL Query Generation ===');
        console.log('Prompt:', prompt);
        console.log('Refined Prompt:', refinedPrompt);
        sqlQueries = await generateSQLQueries(refinedPrompt, tables, schemaName, tableContext, sampleData);
        console.log('Generated SQL Queries:', JSON.stringify(sqlQueries, null, 2));
        if (!sqlQueries?.queries?.length) {
          return new NextResponse("No valid SQL queries could be generated", { status: 400 });
        }
      } catch (error) {
        console.error("Error generating SQL queries:", error);
        return new NextResponse("Failed to generate SQL queries", { status: 500 });
      }

      // Execute queries
      let queryResults;
      try {
        queryResults = await executeSQLQueries(sqlQueries.queries, schemaName);

        // Check if we have any successful results
        const hasValidResults = queryResults.some(result => result.data && result.data.length > 0);
        if (!hasValidResults) {
          return new NextResponse("No data could be retrieved from the database", { status: 400 });
        }
      } catch (error) {
        console.error("Error executing SQL queries:", error);
        return new NextResponse("Failed to execute SQL queries", { status: 500 });
      }

      // Replace placeholders in prompts
      const planningPrompt = PLANNING_AGENT_PROMPT.replace("{reportStyle}", reportStyle);
      const reportPrompt = REPORT_AGENT_PROMPT.replace("{reportStyle}", reportStyle);
      const dataPrompt = DATA_AGENT_PROMPT
        .replace("{tables}", tables.join(", "))
        .replace("{tableContext}", tableContextInfo);

      // Run the analysis pipeline
      try {
        console.log('\n=== Data Analysis ===');
        // Data Analysis
        const dataAnalysis = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          messages: [
            { role: "system", content: dataPrompt },
            {
              role: "user",
              content: `Analyze the following query results:
              ${JSON.stringify(queryResults, null, 2)}
              
              User's request: ${refinedPrompt}
              Report style: ${reportStyle}
              ${promptExplanation ? `Note: ${promptExplanation}` : ''}`
            },
          ],
        });
        console.log('Data Analysis Response:', dataAnalysis.choices[0].message.content);

        console.log('\n=== Report Planning ===');
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
        console.log('Report Plan Response:', reportPlan.choices[0].message.content);

        console.log('\n=== Insights Generation ===');
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
        console.log('Insights Response:', insights.choices[0].message.content);

        console.log('\n=== Chart Generation ===');
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
Insights: ${insights.choices[0].message.content}

Available query results for charting:
${JSON.stringify(queryResults, null, 2)}

IMPORTANT: Use the actual data from query results to create the charts. Each chart must use data from the query results.`
            },
          ],
          response_format: { type: "json_object" }
        });
        console.log('Chart Suggestions Response:', chartSuggestions.choices[0].message.content);

        // Parse chart suggestions with error handling
        let charts = [];
        try {
          if (chartSuggestions.choices[0].message.content) {
            const parsedCharts = JSON.parse(chartSuggestions.choices[0].message.content);
            charts = parsedCharts.charts || [];
            console.log('Parsed Charts:', JSON.stringify(charts, null, 2));
          }
        } catch (error) {
          console.error("Error parsing chart suggestions:", error);
          // Continue without charts if parsing fails
        }

        console.log('\n=== Final Report Generation ===');
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
              
              Consider the intent from users original request. Dont include table and column names in the report unless useful for this report.
              The report is not about how a data analysis is done or a particular table or column unless the user mentioned that explicitly. 
              Report should be about the user's request. If a report style is selected think about the intent of the report style and why would someone use such a report in a company
              Table name and column names etc. are used by other agents to give you the insights. You dont mention table name and column names and how agents did analysis unless required for this report.
              Connect the insights in the report as needed.
              Connect the charts in the report as needed.
              Connect the data and insights in the report as needed.
              Follow the formatting rules strictly.
              Keep it concise (2-3 pages) unless specified otherwise.
              Include clear sections and professional formatting.
              Ensure the report structure matches the ${reportStyle} style.
              
              For each chart in the response, make sure to reference it in the text using [Chart: Chart Title].`,
            },
          ],
        });
        console.log('Final Report Response:', finalReport.choices[0].message.content);

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

        // Return the final response
        return NextResponse.json({
          content: sanitizedContent.trim(),
          charts: charts,
          promptRefinement: reportStyle !== 'general' ? {
            original: prompt,
            refined: refinedPrompt,
            explanation: promptExplanation
          } : null,
          debug: {
            queryResults,
            dataAnalysis: dataAnalysis.choices[0].message.content
          }
        });

      } catch (error) {
        console.error("Error in analysis pipeline:", error);
        return new NextResponse("Error generating analysis", { status: 500 });
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        return new NextResponse(JSON.stringify({
          error: "Validation failed",
          details: error.errors
        }), { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}