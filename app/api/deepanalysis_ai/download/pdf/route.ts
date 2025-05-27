import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { z } from "zod";
import { getUser } from "@/lib/db/queries";

const requestSchema = z.object({
  report: z.object({
    content: z.string(),
    charts: z.array(z.any()).optional(),
  }),
});

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { report } = requestSchema.parse(body);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
    });
    const page = await browser.newPage();

    // Create HTML content with proper styling and Chart.js
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            body {
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              margin: 40px;
              color: #1a1a1a;
            }
            
            h1 {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 24px;
              color: #111827;
            }
            
            h2 {
              font-size: 24px;
              font-weight: 600;
              margin-top: 32px;
              margin-bottom: 16px;
              color: #1f2937;
            }
            
            p {
              margin-bottom: 16px;
              font-size: 16px;
              line-height: 1.7;
            }
            
            ul, ol {
              margin-bottom: 16px;
              padding-left: 24px;
            }
            
            li {
              margin-bottom: 8px;
            }
            
            .chart-container {
              margin: 32px 0;
              page-break-inside: avoid;
              height: 400px;
              position: relative;
              background: white;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 24px 0;
            }
            
            th, td {
              border: 1px solid #e5e7eb;
              padding: 12px;
              text-align: left;
            }
            
            th {
              background-color: #f9fafb;
              font-weight: 600;
            }
            
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
          </style>
        </head>
        <body>
          ${report.content}
          ${report.charts?.map((chart, index) => `
            <div class="chart-container">
              <canvas id="chart-${index}"></canvas>
            </div>
            <script>
              new Chart(document.getElementById('chart-${index}'), {
                type: '${chart.type}',
                data: ${JSON.stringify(chart.data)},
                options: ${JSON.stringify({
                  ...chart.options,
                  maintainAspectRatio: false,
                  animation: false,
                  plugins: {
                    ...chart.options.plugins,
                    legend: {
                      ...chart.options.plugins.legend,
                      labels: {
                        font: {
                          family: 'Inter',
                          size: 12
                        }
                      }
                    },
                    title: {
                      ...chart.options.plugins.title,
                      font: {
                        family: 'Inter',
                        size: 16,
                        weight: 'bold'
                      }
                    }
                  }
                })}
              });
            </script>
          `).join("") || ""}
        </body>
      </html>
    `;

    // Set content and wait for charts to render
    await page.setContent(htmlContent);
    await page.waitForFunction(() => {
      const canvases = document.querySelectorAll('canvas');
      return Array.from(canvases).every(canvas => canvas.width > 0 && canvas.height > 0);
    }, { timeout: 5000 });

    // Add a small delay to ensure charts are fully rendered
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      margin: {
        top: "40px",
        right: "40px",
        bottom: "40px",
        left: "40px",
      },
      printBackground: true,
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=analysis-report.pdf",
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 