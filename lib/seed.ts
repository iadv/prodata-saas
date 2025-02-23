import { sql } from '@vercel/postgres';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import "dotenv/config";

function parseDate(dateString?: string): string {
  if (!dateString) {
    console.warn(`Date string is missing or undefined. Using default date 1970-01-01.`);
    return '1970-01-01';
  }

  const parts = dateString.split('/');
  if (parts.length !== 3) {
    console.warn(`Could not parse date: ${dateString}. Using default date 1970-01-01.`);
    return '1970-01-01';
  }

  let [month, day, year] = parts;

  // Zero-pad month/day
  month = month.padStart(2, '0');
  day = day.padStart(2, '0');

  // Convert 2-digit year to 4-digit year (assume 20xx)
  if (year.length === 2) {
    year = `20${year}`;
  }

  const isoDate = `${year}-${month}-${day}`;

  return isoDate;
}

export async function seed() {
  const createTable = await sql`
    CREATE TABLE IF NOT EXISTS unicorns (
      id SERIAL PRIMARY KEY,
      company VARCHAR(255) NOT NULL UNIQUE,
      valuation DECIMAL(10, 2) NOT NULL,
      date_joined DATE,
      country VARCHAR(255) NOT NULL,
      city VARCHAR(255) NOT NULL,
      industry VARCHAR(255) NOT NULL,
      select_investors TEXT NOT NULL
    );
  `;

  console.log(`Created "unicorns" table`);

  const results: any[] = [];
  const csvFilePath = path.join(process.cwd(), 'unicorns.csv');

  // Adjust skipLines if your CSV has a title row
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(
        csv({
          skipLines: 0, // if you have 2 lines of title/blank before headers, adjust as needed
        })
      )
      .on('data', (data) => results.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  for (const row of results) {
    // Debug logging
    console.log("Row data:", row);

    // Validate required fields
    if (!row.Company || !row['Valuation ($B)']) {
      console.log("Skipping invalid row:", row);
      continue;
    }

    let valuation = 0;
    try {
      valuation = parseFloat(row['Valuation ($B)'].replace('$', '').replace(',', ''));
    } catch (error) {
      console.warn("Error parsing valuation for row, skipping:", row);
      continue;
    }

    const formattedDate = parseDate(row['Date Joined'] || '');

    await sql`
      INSERT INTO unicorns (
        company,
        valuation,
        date_joined,
        country,
        city,
        industry,
        select_investors
      )
      VALUES (
        ${row.Company},
        ${valuation},
        ${formattedDate},
        ${row.Country || ''},
        ${row.City || ''},
        ${row.Industry || ''},
        ${row['Select Investors'] || ''}
      )
      ON CONFLICT (company) DO NOTHING;
    `;
  }

  console.log(`Seeded ${results.length} rows (header/title rows skipped)`);

  return {
    createTable,
    unicorns: results,
  };
}

seed().catch(console.error);
