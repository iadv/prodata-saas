import { NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType } from "docx";
import { z } from "zod";
import { getUser } from "@/lib/db/queries";
import puppeteer from "puppeteer";

const requestSchema = z.object({
  report: z.object({
    content: z.string(),
    charts: z.array(z.any()).optional(),
  }),
});

async function generateChartImage(chart: any): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Create HTML for the chart
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          .chart-container {
            width: 800px;
            height: 400px;
            position: relative;
            background: white;
          }
        </style>
      </head>
      <body>
        <div class="chart-container">
          <canvas id="chart"></canvas>
        </div>
        <script>
          new Chart(document.getElementById('chart'), {
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
                      family: 'Arial',
                      size: 12
                    }
                  }
                },
                title: {
                  ...chart.options.plugins.title,
                  font: {
                    family: 'Arial',
                    size: 16,
                    weight: 'bold'
                  }
                }
              }
            })}
          });
        </script>
      </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return canvas && canvas.width > 0 && canvas.height > 0;
  }, { timeout: 5000 });

  await new Promise(resolve => setTimeout(resolve, 1000));

  const element = await page.$('.chart-container');
  const screenshot = await element?.screenshot({ type: 'png' });
  await browser.close();

  return screenshot as Buffer;
}

function parseHtmlContent(html: string): any[] {
  const elements: any[] = [];
  let currentText = '';
  let tagStack: { tag: string; content: string }[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let inTable = false;
  let tableRows: string[][] = [];
  let currentRow: string[] = [];

  function addParagraph(text: string, heading?: "Heading1" | "Heading2") {
    if (!text.trim()) return;

    if (heading) {
      elements.push(new Paragraph({
        children: [new TextRun({ text: text.trim(), size: heading === "Heading1" ? 32 : 28, bold: true })],
        heading,
        spacing: { before: 240, after: 120 },
      }));
    } else {
      elements.push(new Paragraph({
        children: [new TextRun({ text: text.trim(), size: 24 })],
        spacing: { before: 120, after: 120 },
      }));
    }
  }

  function finishList() {
    if (listItems.length > 0) {
      listItems.forEach((item, index) => {
        elements.push(new Paragraph({
          children: [
            new TextRun({ text: `${listType === 'ol' ? `${index + 1}.` : '•'} `, size: 24 }),
            new TextRun({ text: item.trim(), size: 24 }),
          ],
          spacing: { before: 60, after: 60 },
          indent: { left: 720 },
        }));
      });
      listItems = [];
      listType = null;
    }
    inList = false;
  }

  function finishTable() {
    if (tableRows.length > 0) {
      const rows = tableRows.map(cells => {
        return new TableRow({
          children: cells.map(cell => {
            return new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: cell.trim(), size: 24 })]
              })],
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
                left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
                right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
              },
            });
          }),
        });
      });

      elements.push(new Table({
        rows,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
      }));
      tableRows = [];
    }
    inTable = false;
  }

  // Process HTML content character by character
  let i = 0;
  while (i < html.length) {
    if (html[i] === '<') {
      let tagEnd = html.indexOf('>', i);
      if (tagEnd === -1) break;
      
      let tag = html.slice(i + 1, tagEnd).toLowerCase();
      let isClosingTag = tag.startsWith('/');
      
      if (isClosingTag) {
        tag = tag.slice(1);
        
        if (tag === 'h1' || tag === 'h2') {
          const heading = tag === 'h1' ? "Heading1" : "Heading2";
          addParagraph(currentText, heading);
          currentText = '';
        } else if (tag === 'p') {
          addParagraph(currentText);
          currentText = '';
        } else if (tag === 'ul' || tag === 'ol') {
          finishList();
        } else if (tag === 'li' && currentText.trim()) {
          listItems.push(currentText.trim());
          currentText = '';
        } else if (tag === 'table') {
          finishTable();
        } else if (tag === 'tr' && currentRow.length > 0) {
          tableRows.push([...currentRow]);
          currentRow = [];
        } else if ((tag === 'td' || tag === 'th') && currentText.trim()) {
          currentRow.push(currentText.trim());
          currentText = '';
        }
      } else {
        if (tag === 'ul' || tag === 'ol') {
          inList = true;
          listType = tag as 'ul' | 'ol';
        } else if (tag === 'table') {
          inTable = true;
        } else if (currentText.trim() && !inList && !inTable) {
          addParagraph(currentText);
          currentText = '';
        }
      }
      
      i = tagEnd + 1;
    } else {
      currentText += html[i];
      i++;
    }
  }

  // Handle any remaining content
  if (currentText.trim()) {
    addParagraph(currentText);
  }

  return elements;
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { report } = requestSchema.parse(body);

    // Parse HTML content into DOCX elements
    const contentElements = parseHtmlContent(report.content);

    // Generate chart images and create paragraphs
    const chartParagraphs = await Promise.all((report.charts || []).map(async (chart) => {
      try {
        const imageBuffer = await generateChartImage(chart);
        return new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: 500,
                height: 300,
              },
              type: "png",
            }),
          ],
          spacing: { before: 240, after: 240 },
        });
      } catch (error) {
        console.error("Error generating chart image:", error);
        return new Paragraph({
          children: [new TextRun({ text: "[Chart generation failed]", size: 24 })],
          spacing: { before: 120, after: 120 },
        });
      }
    }));

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [...contentElements, ...chartParagraphs],
      }],
    });

    // Generate Word document buffer
    const buffer = await Packer.toBuffer(doc);

    // Return Word document as response
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=analysis-report.docx",
      },
    });
  } catch (error) {
    console.error("Error generating Word document:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 